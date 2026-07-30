import type { PipelineConfig } from "../../core/config.js";
import type {
  DocumentArtifact,
  LecturePlanArtifact,
} from "../../core/contracts.js";
import { canonicalizeSourceId } from "../module1_document_intelligence/gemini-document-analyzer.js";
import {
  createVertexClient,
  getVertexEnvironment,
} from "../../providers/google/gemini-client.js";
import { validateLecturePlan } from "./coverage-validator.js";
import { buildLecturePlan } from "./duration-estimator.js";
import {
  plannerDecisionSchema,
  type PlannerDecision,
} from "./planner-types.js";

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "learning_objectives", "chapters"],
  properties: {
    title: { type: "string" },
    learning_objectives: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
    chapters: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "chapter_id",
          "title",
          "learning_objectives",
          "items",
        ],
        properties: {
          chapter_id: { type: "string" },
          title: { type: "string" },
          learning_objectives: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "item_id",
                "title",
                "treatment",
                "reason",
                "source_ids",
              ],
              properties: {
                item_id: { type: "string" },
                title: { type: "string" },
                treatment: {
                  type: "string",
                  enum: [
                    "EXPLAIN",
                    "MENTION",
                    "SHOW",
                    "REFERENCE",
                    "OUT_OF_SCOPE",
                    "UNREADABLE",
                    "DUPLICATE",
                  ],
                },
                reason: { type: "string" },
                source_ids: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function compactDocument(document: DocumentArtifact): unknown {
  return {
    title: document.title,
    language: document.language,
    total_pages: document.total_pages,
    sections: document.sections,
    pages: document.pages.map((page) => ({
      page: page.page,
      summary: page.summary,
      concepts: page.concepts,
      source_ids: page.source_ids,
      warnings: page.warnings,
    })),
    sources: document.sources.map((source) => ({
      source_id: source.source_id,
      page: source.page,
      element_type: source.element_type,
      excerpt: source.excerpt,
      confidence: source.confidence,
    })),
    warnings: document.warnings,
  };
}

function buildPrompt(
  document: DocumentArtifact,
  config: PipelineConfig,
  correction?: string,
): string {
  const prompt = `You are the Lecture Planner of a PDF-to-lecture-video system.

Create an instructional lecture plan from the supplied Document Intelligence JSON.

Product configuration:
- Coverage mode: ${config.coverage_mode}
- Audience: ${config.audience}
- Output language: ${config.language}
- Detail level: ${config.detail_level}
- Maximum chapter duration: ${config.max_chapter_minutes} minutes
- Required total video range: ${config.duration.min_seconds}-${config.duration.max_seconds} seconds
- Planning target: ${config.duration.target_seconds} seconds

Your decisions:
1. Split the material into ordered, coherent chapters.
2. Define measurable learning objectives.
3. Group adjacent, related sources into teaching items.
4. Assign exactly one treatment to each item:
   - EXPLAIN: teach the source carefully.
   - MENTION: briefly establish context.
   - SHOW: visually inspect an image, diagram, table, formula, or code.
   - REFERENCE: identify cover, agenda, bibliography, or non-teaching reference.
   - OUT_OF_SCOPE: account for a valid source that cannot be taught within the selected total duration.
   - UNREADABLE: the source cannot be taught safely.
   - DUPLICATE: the source repeats content already represented elsewhere.

Hard constraints:
- Assign every source_id exactly once. Never omit or repeat a source.
- The complete lecture must be designed for ${config.duration.target_seconds} seconds and must never exceed ${config.duration.max_seconds} seconds.
- Use at most ${Math.max(1, Math.floor(config.duration.target_seconds / 40))} chapters. Merge adjacent sections when necessary.
- In SUMMARY/CONCISE mode, prioritize the most instructionally valuable sources. Mark lower-priority valid content OUT_OF_SCOPE instead of expanding the lecture.
- Keep at most ${Math.max(3, Math.floor(config.duration.target_seconds / 8))} sources across EXPLAIN, MENTION, and SHOW treatments; one concise item may group several adjacent sources.
- Use only source IDs present in the input.
- Keep source order aligned with page order. Do not jump backward between chapters.
- In FULL mode, all CODE sources must be EXPLAIN or SHOW.
- Do not mark content DUPLICATE unless it genuinely repeats another source.
- Do not invent facts, pages, sources, or prerequisites.
- Every chapter and the full lecture need at least one learning objective.
- Keep each chapter below ${config.max_chapter_minutes} minutes. As a planning heuristic, use about 5–7 normal sources per chapter, fewer when a chapter contains CODE, FORMULA, or several DIAGRAM sources.
- Split long source ranges into multiple chapters even if Document Intelligence grouped them into one section.
- Items may group only adjacent, conceptually related sources that share one treatment.
- Treat page warnings and low confidence conservatively and explain the decision in reason.
- Return decision fields only. Duration, page lists, and coverage are computed deterministically later.
- Output JSON only.

Document Intelligence JSON:
${JSON.stringify(compactDocument(document))}`;

  return correction
    ? `${prompt}\n\nThe previous plan failed deterministic validation:\n${correction.slice(0, 5_000)}\nReturn a complete corrected plan.`
    : prompt;
}

function normalizeDecision(decision: PlannerDecision): PlannerDecision {
  return {
    ...decision,
    chapters: decision.chapters.map((chapter) => ({
      ...chapter,
      items: chapter.items.map((item) => ({
        ...item,
        source_ids: item.source_ids.map(canonicalizeSourceId),
      })),
    })),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function generateLecturePlanWithGemini(
  document: DocumentArtifact,
  config: PipelineConfig,
): Promise<LecturePlanArtifact> {
  const environment = getVertexEnvironment();
  const client = createVertexClient(environment);
  const startedAt = performance.now();
  const maxAttempts = 3;
  let correction: string | undefined;
  let lastError: unknown;

  process.stdout.write(
    `  Vertex model=${environment.plannerModel}, sources=${document.sources.length}, pages=${document.total_pages}\n`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      process.stdout.write(`  Planner attempt=${attempt}/${maxAttempts}\n`);
      const response = await client.models.generateContent({
        model: environment.plannerModel,
        contents: buildPrompt(document, config, correction),
        config: {
          temperature: 0,
          maxOutputTokens: 16_384,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
      if (!response.text) {
        throw new Error("Gemini không trả về lecture planning decision.");
      }

      const parsed = plannerDecisionSchema.parse(JSON.parse(response.text));
      const decision = normalizeDecision(parsed);
      const plan = buildLecturePlan(decision, document, config);
      validateLecturePlan(plan, document, config);
      process.stdout.write(
        `  Planner latency_ms=${Math.round(performance.now() - startedAt)}\n`,
      );
      return plan;
    } catch (error) {
      lastError = error;
      correction = error instanceof Error ? error.message : String(error);
      if (attempt < maxAttempts) {
        process.stdout.write(`  Retry reason: ${correction}\n`);
        await delay(750 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Gemini lecture planning failed."));
}
