import type {
  DocumentArtifact,
  ScriptArtifact,
  StoryboardArtifact,
} from "../../core/contracts.js";
import {
  createVertexClient,
  getVertexEnvironment,
} from "../../providers/google/gemini-client.js";
import { canonicalizeSourceId } from "../module1_document_intelligence/gemini-document-analyzer.js";
import { buildStoryboard } from "./storyboard-builder.js";
import {
  chapterStoryboardDecisionSchema,
  type ChapterStoryboardDecision,
} from "./storyboard-types.js";
import { validateStoryboard } from "./storyboard-validator.js";

type ScriptChapter = ScriptArtifact["chapters"][number];

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["routes"],
  properties: {
    routes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "narration_id",
          "visual_type",
          "source_ids",
          "heading",
          "key_points",
          "reason",
        ],
        properties: {
          narration_id: { type: "string" },
          visual_type: {
            type: "string",
            enum: [
              "TITLE",
              "ORIGINAL_PAGE",
              "CROP_AND_HIGHLIGHT",
              "BULLET",
              "DIAGRAM",
              "SUMMARY",
            ],
          },
          source_ids: {
            type: "array",
            items: { type: "string" },
          },
          heading: { type: "string" },
          key_points: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: { type: "string" },
          },
          diagram: {
            type: "object",
            additionalProperties: false,
            required: ["nodes", "edges"],
            properties: {
              nodes: {
                type: "array",
                minItems: 2,
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "label"],
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                  },
                },
              },
              edges: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["from", "to", "label"],
                  properties: {
                    from: { type: "string" },
                    to: { type: "string" },
                    label: { type: "string" },
                  },
                },
              },
            },
          },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

function sourceContext(
  document: DocumentArtifact,
  chapter: ScriptChapter,
): DocumentArtifact["sources"] {
  const sourceIds = new Set(
    chapter.narrations.flatMap((narration) => narration.source_ids),
  );
  return document.sources.filter((source) => sourceIds.has(source.source_id));
}

function prompt(
  document: DocumentArtifact,
  script: ScriptArtifact,
  chapter: ScriptChapter,
  correction?: string,
): string {
  const chapterIndex = script.chapters.findIndex(
    (candidate) => candidate.chapter_id === chapter.chapter_id,
  );
  const base = `You are the Storyboard Router for a PDF-to-lecture-video system.

Choose exactly one visual route for every narration in the supplied chapter.
You choose only routing data. A deterministic registry will create template
names, props, asset paths, crop instructions, and fallbacks. Never output code,
CSS, SVG, animation expressions, file paths, or arbitrary template props.

Available visual types:
- TITLE: first lecture opening or a short chapter divider.
- ORIGINAL_PAGE: show a source page when the original image, code, table,
  formula, or detailed slide is the best evidence.
- CROP_AND_HIGHLIGHT: only when the selected source includes bbox.
- BULLET: concise generated layout for text explanation, analogy, example,
  transition, or learning check.
- DIAGRAM: only when a DIAGRAM source explicitly supports the relationship and
  diagram nodes/edges are directly grounded in that source.
- SUMMARY: the grounded recap immediately before a chapter learning check.

Hard rules:
- Return one route for every narration_id, in the original order.
- Do not omit, duplicate, rewrite, merge, or split narrations.
- Use only source_ids already cited by that narration.
- Every GROUNDED_CLAIM route must keep at least one cited source_id.
- ORIGINAL_PAGE, CROP_AND_HIGHLIGHT, and DIAGRAM require source_ids.
- Prefer the original page for IMAGE, CODE, TABLE, FORMULA, and complex DIAGRAM.
- Use CROP_AND_HIGHLIGHT only if bbox exists. Never invent coordinates.
- Use DIAGRAM only for an explicit relationship; nodes/edges may not introduce
  information absent from the source excerpt.
- Use SUMMARY for text beginning as a recap such as "Tóm lại".
- Use TITLE for the first narration only when it opens the lecture/chapter.
- heading and key_points must be concise visual text, not a copy of the full
  narration. Maximum five key points.
- ${
    chapterIndex === 0
      ? "The first route may be TITLE for the lecture opening."
      : "This is a continuation chapter; TITLE is allowed only as a compact chapter divider, not a new welcome screen."
  }
- Output JSON only.

Chapter:
${JSON.stringify(chapter)}

Element-level sources:
${JSON.stringify(sourceContext(document, chapter))}`;
  return correction
    ? `${base}\n\nPrevious routing failed validation:\n${correction.slice(0, 6_000)}\nReturn a complete corrected routing decision.`
    : base;
}

function normalize(
  decision: ChapterStoryboardDecision,
): ChapterStoryboardDecision {
  return {
    routes: decision.routes.map((route) => ({
      ...route,
      source_ids: [...new Set(route.source_ids.map(canonicalizeSourceId))],
    })),
  };
}

function validateDecision(
  decision: ChapterStoryboardDecision,
  chapter: ScriptChapter,
  document: DocumentArtifact,
): void {
  const errors: string[] = [];
  const narrationById = new Map(
    chapter.narrations.map((narration) => [
      narration.narration_id,
      narration,
    ]),
  );
  const routeCounts = new Map<string, number>();
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );

  for (const route of decision.routes) {
    routeCounts.set(
      route.narration_id,
      (routeCounts.get(route.narration_id) ?? 0) + 1,
    );
    const narration = narrationById.get(route.narration_id);
    if (!narration) {
      errors.push(`Route dùng narration không tồn tại ${route.narration_id}.`);
      continue;
    }
    for (const sourceId of route.source_ids) {
      if (!narration.source_ids.includes(sourceId)) {
        errors.push(
          `${route.narration_id} dùng source ngoài narration: ${sourceId}.`,
        );
      }
    }
    if (
      narration.kind === "GROUNDED_CLAIM" &&
      route.source_ids.length === 0
    ) {
      errors.push(`${route.narration_id} grounded route thiếu source.`);
    }
    if (
      ["ORIGINAL_PAGE", "CROP_AND_HIGHLIGHT", "DIAGRAM"].includes(
        route.visual_type,
      ) &&
      route.source_ids.length === 0
    ) {
      errors.push(`${route.narration_id} visual quan trọng thiếu source.`);
    }
    if (route.visual_type === "CROP_AND_HIGHLIGHT") {
      const hasBbox = route.source_ids.some(
        (sourceId) => sourceById.get(sourceId)?.bbox !== undefined,
      );
      if (!hasBbox) {
        errors.push(`${route.narration_id} chọn crop nhưng source không có bbox.`);
      }
    }
    if (route.visual_type === "DIAGRAM") {
      const hasDiagramSource = route.source_ids.some(
        (sourceId) => sourceById.get(sourceId)?.element_type === "DIAGRAM",
      );
      if (!hasDiagramSource || !route.diagram) {
        errors.push(
          `${route.narration_id} chọn DIAGRAM nhưng thiếu diagram source/structure.`,
        );
      }
    }
  }

  for (const narration of chapter.narrations) {
    const count = routeCounts.get(narration.narration_id) ?? 0;
    if (count !== 1) {
      errors.push(
        `${narration.narration_id} phải có đúng 1 route, actual=${count}.`,
      );
    }
  }
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function routeChapter(
  document: DocumentArtifact,
  script: ScriptArtifact,
  chapter: ScriptChapter,
): Promise<ChapterStoryboardDecision> {
  const environment = getVertexEnvironment();
  const client = createVertexClient(environment);
  let correction: string | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      process.stdout.write(
        `  Storyboard ${chapter.chapter_id} attempt=${attempt}/3\n`,
      );
      const response = await client.models.generateContent({
        model: environment.storyboardModel,
        contents: prompt(document, script, chapter, correction),
        config: {
          temperature: 0,
          maxOutputTokens: 10_240,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
      if (!response.text) {
        throw new Error(
          `Gemini không trả storyboard cho ${chapter.chapter_id}.`,
        );
      }
      const decision = normalize(
        chapterStoryboardDecisionSchema.parse(JSON.parse(response.text)),
      );
      validateDecision(decision, chapter, document);
      return decision;
    } catch (error) {
      lastError = error;
      correction = error instanceof Error ? error.message : String(error);
      if (attempt < 3) {
        process.stdout.write(
          `  Retry ${chapter.chapter_id}: ${correction.slice(0, 500)}\n`,
        );
        await delay(600 * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? `Storyboard ${chapter.chapter_id} failed.`));
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

export async function generateStoryboardWithGemini(
  document: DocumentArtifact,
  script: ScriptArtifact,
): Promise<StoryboardArtifact> {
  const environment = getVertexEnvironment();
  const startedAt = performance.now();
  process.stdout.write(
    `  Vertex model=${environment.storyboardModel}, chapters=${script.chapters.length}\n`,
  );
  const generated = await mapWithConcurrency(
    script.chapters,
    2,
    (chapter) => routeChapter(document, script, chapter),
  );
  const decisions = new Map(
    script.chapters.map((chapter, index) => [
      chapter.chapter_id,
      generated[index]!,
    ]),
  );
  const storyboard = buildStoryboard(document, script, decisions);
  validateStoryboard(storyboard, document, script);
  process.stdout.write(
    `  Storyboard latency_ms=${Math.round(performance.now() - startedAt)}\n`,
  );
  return storyboard;
}
