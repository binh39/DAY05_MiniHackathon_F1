import type { PipelineConfig } from "../../core/config.js";
import type {
  DocumentArtifact,
  LecturePlanArtifact,
  ScriptArtifact,
} from "../../core/contracts.js";
import {
  createVertexClient,
  getVertexEnvironment,
} from "../../providers/google/gemini-client.js";
import { canonicalizeSourceId } from "../module1_document_intelligence/gemini-document-analyzer.js";
import { validateScript } from "./grounding-validator.js";
import { buildScriptArtifact } from "./script-builder.js";
import {
  chapterWordBudget,
  countSpokenWords,
  estimateSpokenDurationSeconds,
  SCRIPT_DURATION_TOLERANCE_RATE,
  tolerantChapterWordBudget,
} from "./duration-budget.js";
import {
  chapterScriptDecisionSchema,
  semanticReviewSchema,
  type ChapterScriptDecision,
  type SemanticReview,
} from "./script-types.js";

type Chapter = LecturePlanArtifact["chapters"][number];

const chapterResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["narrations", "pronunciation_glossary"],
  properties: {
    narrations: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "narration_id",
          "kind",
          "text",
          "source_ids",
          "objective_indices",
        ],
        properties: {
          narration_id: { type: "string" },
          item_id: { type: "string" },
          kind: {
            type: "string",
            enum: [
              "GROUNDED_CLAIM",
              "TEACHING_ANALOGY",
              "EXAMPLE",
              "TRANSITION",
              "LEARNING_CHECK",
            ],
          },
          text: { type: "string" },
          source_ids: {
            type: "array",
            items: { type: "string" },
          },
          objective_indices: {
            type: "array",
            items: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    pronunciation_glossary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "pronunciation", "meaning", "source_ids"],
        properties: {
          term: { type: "string" },
          pronunciation: { type: "string" },
          meaning: { type: "string" },
          source_ids: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const reviewResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["issues"],
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["narration_id", "issue_type", "explanation"],
        properties: {
          narration_id: { type: "string" },
          issue_type: {
            type: "string",
            enum: ["UNSUPPORTED", "WRONG_SOURCE", "CONTRADICTION"],
          },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;

function sourcesForChapter(
  document: DocumentArtifact,
  chapter: Chapter,
): DocumentArtifact["sources"] {
  const sourceIds = new Set(chapter.source_ids);
  return document.sources.filter((source) => sourceIds.has(source.source_id));
}

function pagesForChapter(
  document: DocumentArtifact,
  chapter: Chapter,
): unknown[] {
  const pageNumbers = new Set(chapter.page_numbers);
  return document.pages
    .filter((page) => pageNumbers.has(page.page))
    .map(({ assets: _assets, ...page }) => page);
}

function chapterPrompt(
  document: DocumentArtifact,
  lecturePlan: LecturePlanArtifact,
  chapter: Chapter,
  config: PipelineConfig,
  correction?: string,
  previousDecision?: ChapterScriptDecision,
): string {
  const chapterIndex = lecturePlan.chapters.findIndex(
    (candidate) => candidate.chapter_id === chapter.chapter_id,
  );
  const wordBudget = chapterWordBudget(chapter.duration_seconds);
  const targetWords = wordBudget.target;
  const maximumChapterWords = wordBudget.maximum;
  const minimumChapterWords = wordBudget.minimum;
  const maximumNarrations = Math.max(
    2,
    Math.ceil(chapter.duration_seconds / 12),
  );
  const prompt = `You are the Script Writer for a grounded PDF-to-lecture-video system.

Write only chapter "${chapter.title}" in ${config.language} for a ${config.audience} audience.
Target approximately ${targetWords} spoken words. Detail level: ${config.detail_level}.

Narration kinds:
- GROUNDED_CLAIM: a fact directly supported by cited source_ids.
- TEACHING_ANALOGY: an explicitly signposted analogy, not a document fact.
- EXAMPLE: an explicitly signposted illustrative example, not a document fact unless cited.
- TRANSITION: navigation between ideas; source_ids must be empty.
- LEARNING_CHECK: a concise question or recall prompt.

Hard rules:
- Every factual statement must be a GROUNDED_CLAIM with the exact element-level source_id that supports it.
- Do not infer facts beyond the supplied excerpts. Never cite a source merely because it is on the right page.
- Every source with treatment EXPLAIN, MENTION, or SHOW must appear in at least one GROUNDED_CLAIM.
- REFERENCE, UNREADABLE, and DUPLICATE sources must not be turned into unsupported teaching claims.
- OUT_OF_SCOPE sources are intentionally excluded by the duration budget and must not appear in narration.
- Use only source_ids and item_ids in this chapter.
- Map each narration to all learning objectives it helps, using zero-based objective_indices.
- The only valid objective_indices are ${chapter.learning_objectives.map((_, index) => index).join(", ")}.
- Cover every objective. End with at least one LEARNING_CHECK.
- Keep every narration at 90 words or fewer and do not cut a sentence.
- The complete chapter must contain at least ${minimumChapterWords} spoken words. This lower bound is mandatory so the final audio reaches the selected duration range.
- The complete chapter must stay at or below ${maximumChapterWords} spoken words so it fits the planned ${chapter.duration_seconds} seconds. This is a hard upper bound, including transitions and the learning check.
- Return at most ${maximumNarrations} narrations. Cite multiple compatible source_ids in one concise GROUNDED_CLAIM when needed.
- Use short transition chunks suitable for later scene generation.
- Use analogies/examples only when pedagogically useful and clearly introduce them as analogy/example.
- Do not read slide bullets verbatim. Explain naturally.
- ${
    chapterIndex === 0
      ? "This is the first chapter: use one brief welcome and introduce the lecture."
      : "This is a continuation of one video: do not greet or welcome the learner again; open with a natural bridge from the previous chapter."
  }
- Before the final learning check, add a short GROUNDED_CLAIM recap covering the chapter objectives.
- Add only technical English terms, acronyms, and names that need stable TTS pronunciation to pronunciation_glossary.
- For Vietnamese output, pronunciation must be a practical Vietnamese phonetic reading, not IPA.
- Narration IDs must be unique and start with "${chapter.chapter_id}_n".
- Return JSON only.

Chapter learning objectives indexed from zero:
${JSON.stringify(chapter.learning_objectives.map((objective, index) => ({ index, objective })))}

Chapter plan:
${JSON.stringify(chapter)}

Page context:
${JSON.stringify(pagesForChapter(document, chapter))}

Element-level sources:
${JSON.stringify(sourcesForChapter(document, chapter))}`;

  if (!correction) return prompt;
  return `${prompt}

The previous chapter script failed validation:
${correction.slice(0, 6_000)}

Previous decision:
${JSON.stringify(previousDecision)}

Keep valid content where possible, but return a complete corrected chapter decision.`;
}

function normalizeDecision(
  decision: ChapterScriptDecision,
  objectiveCount: number,
): ChapterScriptDecision {
  return {
    ...decision,
    narrations: decision.narrations.map((narration) => ({
      ...narration,
      source_ids: narration.source_ids.map(canonicalizeSourceId),
      objective_indices: [
        ...new Set(
          narration.objective_indices.filter(
            (index) => index >= 0 && index < objectiveCount,
          ),
        ),
      ].sort((left, right) => left - right),
    })),
    pronunciation_glossary: decision.pronunciation_glossary.map((entry) => ({
      ...entry,
      source_ids: entry.source_ids.map(canonicalizeSourceId),
    })),
  };
}

function validateChapterDecision(
  decision: ChapterScriptDecision,
  chapter: Chapter,
  document: DocumentArtifact,
): void {
  const errors: string[] = [];
  const sourceIds = new Set(chapter.source_ids);
  const itemIds = new Set(chapter.items.map((item) => item.item_id));
  const groundedSources = new Set<string>();
  const objectiveIndices = new Set<number>();
  const narrationIds = new Set<string>();
  const totalNarrationWords = decision.narrations.reduce(
    (total, narration) => total + countSpokenWords(narration.text),
    0,
  );
  const wordBudget = tolerantChapterWordBudget(
    chapter.duration_seconds,
  );
  const maximumChapterWords = wordBudget.maximum;
  const minimumChapterWords = wordBudget.minimum;
  if (totalNarrationWords < minimumChapterWords) {
    errors.push(
      `Tổng narration chỉ có ${totalNarrationWords} từ, thấp hơn tối thiểu ${minimumChapterWords} từ của duration budget; hãy giải thích đầy đủ hơn mà không thêm fact ngoài nguồn.`,
    );
  }
  if (totalNarrationWords > maximumChapterWords) {
    errors.push(
      `Tổng narration có ${totalNarrationWords} từ, vượt tối đa ${maximumChapterWords} từ của duration budget; hãy rút gọn mà vẫn giữ đủ source/objective.`,
    );
  }
  const estimatedDurationSeconds = decision.narrations.reduce(
    (total, narration) =>
      total + estimateSpokenDurationSeconds(narration.text),
    0,
  );
  const durationToleranceSeconds = Math.max(
    3,
    Math.ceil(
      chapter.duration_seconds * SCRIPT_DURATION_TOLERANCE_RATE,
    ),
  );
  if (
    estimatedDurationSeconds >
    chapter.duration_seconds + durationToleranceSeconds
  ) {
    errors.push(
      `Tổng narration ${estimatedDurationSeconds}s vượt duration plan ${chapter.duration_seconds}s; hãy rút gọn nhưng vẫn giữ đủ source/objective.`,
    );
  }
  const maximumNarrations = Math.max(
    2,
    Math.ceil(chapter.duration_seconds / 12),
  );
  if (decision.narrations.length > maximumNarrations) {
    errors.push(
      `Chapter có ${decision.narrations.length} narration, vượt giới hạn ${maximumNarrations} của duration budget.`,
    );
  }

  for (const narration of decision.narrations) {
    if (narrationIds.has(narration.narration_id)) {
      errors.push(`Narration ID trùng: ${narration.narration_id}`);
    }
    narrationIds.add(narration.narration_id);
    if (!narration.narration_id.startsWith(`${chapter.chapter_id}_n`)) {
      errors.push(
        `Narration ID sai prefix: ${narration.narration_id}`,
      );
    }
    if (
      narration.kind === "GROUNDED_CLAIM" &&
      narration.source_ids.length === 0
    ) {
      errors.push(`${narration.narration_id} thiếu source.`);
    }
    if (
      narration.kind === "TRANSITION" &&
      narration.source_ids.length > 0
    ) {
      errors.push(`${narration.narration_id} transition có source.`);
    }
    if (
      narration.text.trim().split(/\s+/u).filter(Boolean).length > 90
    ) {
      errors.push(`${narration.narration_id} vượt 90 từ.`);
    }
    for (const sourceId of narration.source_ids) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`${narration.narration_id} dùng sai source ${sourceId}.`);
      }
      if (narration.kind === "GROUNDED_CLAIM") {
        groundedSources.add(sourceId);
      }
    }
    if (narration.item_id && !itemIds.has(narration.item_id)) {
      errors.push(`${narration.narration_id} dùng sai item_id.`);
    }
    for (const objectiveIndex of narration.objective_indices) {
      if (
        objectiveIndex < 0 ||
        objectiveIndex >= chapter.learning_objectives.length
      ) {
        errors.push(
          `${narration.narration_id} dùng objective index ${objectiveIndex} không tồn tại.`,
        );
      }
      objectiveIndices.add(objectiveIndex);
    }
  }

  const requiredSources = chapter.items
    .filter((item) =>
      ["EXPLAIN", "MENTION", "SHOW"].includes(item.treatment),
    )
    .flatMap((item) => item.source_ids);
  for (const sourceId of requiredSources) {
    if (!groundedSources.has(sourceId)) {
      errors.push(`Thiếu grounded narration cho ${sourceId}.`);
    }
  }
  for (
    let objectiveIndex = 0;
    objectiveIndex < chapter.learning_objectives.length;
    objectiveIndex += 1
  ) {
    if (!objectiveIndices.has(objectiveIndex)) {
      errors.push(`Thiếu learning objective ${objectiveIndex}.`);
    }
  }
  if (
    !decision.narrations.some(
      (narration) => narration.kind === "LEARNING_CHECK",
    )
  ) {
    errors.push("Thiếu LEARNING_CHECK.");
  }

  const knownDocumentSources = new Set(
    document.sources.map((source) => source.source_id),
  );
  for (const entry of decision.pronunciation_glossary) {
    for (const sourceId of entry.source_ids) {
      if (!knownDocumentSources.has(sourceId) || !sourceIds.has(sourceId)) {
        errors.push(`Glossary ${entry.term} dùng sai source ${sourceId}.`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generateChapter(
  document: DocumentArtifact,
  lecturePlan: LecturePlanArtifact,
  chapter: Chapter,
  config: PipelineConfig,
  correction?: string,
  previousDecision?: ChapterScriptDecision,
): Promise<ChapterScriptDecision> {
  const environment = getVertexEnvironment();
  const client = createVertexClient(environment);
  let currentCorrection = correction;
  let currentDecision = previousDecision;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      process.stdout.write(
        `  Script ${chapter.chapter_id} attempt=${attempt}/3\n`,
      );
      const response = await client.models.generateContent({
        model: environment.scriptModel,
        contents: chapterPrompt(
          document,
          lecturePlan,
          chapter,
          config,
          currentCorrection,
          currentDecision,
        ),
        config: {
          temperature: 0.15,
          maxOutputTokens: 12_288,
          responseMimeType: "application/json",
          responseJsonSchema: chapterResponseJsonSchema,
        },
      });
      if (!response.text) {
        throw new Error(
          `Gemini không trả script cho ${chapter.chapter_id}.`,
        );
      }
      const parsed = normalizeDecision(
        chapterScriptDecisionSchema.parse(JSON.parse(response.text)),
        chapter.learning_objectives.length,
      );
      validateChapterDecision(parsed, chapter, document);
      return parsed;
    } catch (error) {
      lastError = error;
      currentCorrection =
        error instanceof Error ? error.message : String(error);
      currentDecision = undefined;
      if (attempt < 3) {
        process.stdout.write(
          `  Retry ${chapter.chapter_id}: ${currentCorrection.slice(0, 500)}\n`,
        );
        await delay(600 * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? `Script ${chapter.chapter_id} failed.`));
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(values[index]!);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker(),
    ),
  );
  return output;
}

async function semanticReview(
  document: DocumentArtifact,
  lecturePlan: LecturePlanArtifact,
  script: ScriptArtifact,
): Promise<SemanticReview> {
  const environment = getVertexEnvironment();
  const client = createVertexClient(environment);
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );
  const evidence = lecturePlan.chapters.map((chapter) => ({
    chapter_id: chapter.chapter_id,
    sources: chapter.source_ids.map((sourceId) => sourceById.get(sourceId)),
  }));
  const reviewInput = {
    evidence,
    chapters: script.chapters.map((chapter) => ({
      chapter_id: chapter.chapter_id,
      narrations: chapter.narrations,
    })),
  };
  const response = await client.models.generateContent({
    model: environment.scriptModel,
    contents: `Act as a strict grounding reviewer.

Compare every GROUNDED_CLAIM against the exact cited element-level sources.
Return an issue only when:
- UNSUPPORTED: the cited excerpts do not support the factual claim;
- WRONG_SOURCE: another element may support it, but the cited element does not;
- CONTRADICTION: the claim conflicts with the supplied source.

Do not review TEACHING_ANALOGY, EXAMPLE, TRANSITION, or LEARNING_CHECK as factual
claims. Do not penalize natural paraphrasing. Do not add stylistic feedback.
Use only narration IDs in the input. Return JSON only.

${JSON.stringify(reviewInput)}`,
    config: {
      temperature: 0,
      maxOutputTokens: 4_096,
      responseMimeType: "application/json",
      responseJsonSchema: reviewResponseJsonSchema,
    },
  });
  if (!response.text) {
    throw new Error("Gemini semantic reviewer không trả kết quả.");
  }
  const review = semanticReviewSchema.parse(JSON.parse(response.text));
  const narrationIds = new Set(
    script.chapters.flatMap((chapter) =>
      chapter.narrations.map((narration) => narration.narration_id),
    ),
  );
  const invalidIssue = review.issues.find(
    (issue) => !narrationIds.has(issue.narration_id),
  );
  if (invalidIssue) {
    throw new Error(
      `Semantic reviewer trả narration_id không tồn tại: ${invalidIssue.narration_id}.`,
    );
  }
  return review;
}

export async function generateScriptWithGemini(
  document: DocumentArtifact,
  lecturePlan: LecturePlanArtifact,
  config: PipelineConfig,
): Promise<ScriptArtifact> {
  const environment = getVertexEnvironment();
  const startedAt = performance.now();
  process.stdout.write(
    `  Vertex model=${environment.scriptModel}, chapters=${lecturePlan.chapters.length}\n`,
  );

  const generated = await mapWithConcurrency(
    lecturePlan.chapters,
    2,
    (chapter) =>
      generateChapter(document, lecturePlan, chapter, config),
  );
  const decisions = new Map(
    lecturePlan.chapters.map((chapter, index) => [
      chapter.chapter_id,
      generated[index]!,
    ]),
  );

  for (let reviewAttempt = 1; reviewAttempt <= 2; reviewAttempt += 1) {
    const draft = buildScriptArtifact(
      lecturePlan.title,
      config.language,
      lecturePlan,
      decisions,
    );
    validateScript(draft, document, lecturePlan, false);
    process.stdout.write(`  Semantic review=${reviewAttempt}/2\n`);
    const review = await semanticReview(document, lecturePlan, draft);
    if (review.issues.length === 0) {
      const finalScript = buildScriptArtifact(
        lecturePlan.title,
        config.language,
        lecturePlan,
        decisions,
        review,
      );
      validateScript(finalScript, document, lecturePlan);
      process.stdout.write(
        `  Script latency_ms=${Math.round(performance.now() - startedAt)}\n`,
      );
      return finalScript;
    }
    if (reviewAttempt === 2) {
      const failed = buildScriptArtifact(
        lecturePlan.title,
        config.language,
        lecturePlan,
        decisions,
        review,
      );
      validateScript(failed, document, lecturePlan);
    }

    const chapterByNarrationId = new Map(
      draft.chapters.flatMap((chapter) =>
        chapter.narrations.map((narration) => [
          narration.narration_id,
          chapter.chapter_id,
        ]),
      ),
    );
    const affectedChapterIds = [
      ...new Set(
        review.issues
          .map((issue) => chapterByNarrationId.get(issue.narration_id))
          .filter((chapterId): chapterId is string => Boolean(chapterId)),
      ),
    ];
    process.stdout.write(
      `  Repair grounded narrations in: ${affectedChapterIds.join(", ")}\n`,
    );
    await Promise.all(
      affectedChapterIds.map(async (chapterId) => {
        const chapter = lecturePlan.chapters.find(
          (candidate) => candidate.chapter_id === chapterId,
        )!;
        const issues = review.issues.filter(
          (issue) =>
            chapterByNarrationId.get(issue.narration_id) === chapterId,
        );
        const repaired = await generateChapter(
          document,
          lecturePlan,
          chapter,
          config,
          `Semantic grounding issues:\n${JSON.stringify(issues)}`,
          decisions.get(chapterId),
        );
        decisions.set(chapterId, repaired);
      }),
    );
  }

  throw new Error("Không thể hoàn tất semantic grounding review.");
}
