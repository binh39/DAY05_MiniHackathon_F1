import type { PipelineConfig } from "../../core/config.js";
import {
  narrationWordBudget,
  spokenWordsPerMinute,
} from "../../core/speech-duration.js";
import type {
  DocumentArtifact,
  LecturePlanArtifact,
} from "../../core/contracts.js";
import type {
  PlannerDecision,
  Treatment,
} from "./planner-types.js";

type Source = DocumentArtifact["sources"][number];

const PLANNED_SPEECH_WORDS_PER_MINUTE = 175;
export const CHAPTER_TRANSITION_SECONDS = 2;

const explainWords: Record<Source["element_type"], number> = {
  TEXT: 90,
  IMAGE: 70,
  DIAGRAM: 120,
  TABLE: 110,
  FORMULA: 140,
  CODE: 155,
};

const showWords: Record<Source["element_type"], number> = {
  TEXT: 25,
  IMAGE: 30,
  DIAGRAM: 45,
  TABLE: 45,
  FORMULA: 55,
  CODE: 65,
};

const visualSeconds: Record<Source["element_type"], number> = {
  TEXT: 0,
  IMAGE: 8,
  DIAGRAM: 18,
  TABLE: 18,
  FORMULA: 24,
  CODE: 28,
};

function detailMultiplier(config: PipelineConfig): number {
  if (config.detail_level === "brief") return 0.75;
  if (config.detail_level === "detailed") return 1.25;
  return 1;
}

function estimateSourceWords(
  source: Source,
  treatment: Treatment,
  multiplier: number,
): number {
  if (treatment === "EXPLAIN") {
    return Math.round(explainWords[source.element_type] * multiplier);
  }
  if (treatment === "SHOW") {
    return Math.round(showWords[source.element_type] * multiplier);
  }
  if (treatment === "MENTION") return Math.round(24 * multiplier);
  if (treatment === "UNREADABLE") return 12;
  return 0;
}

function estimateItem(
  sources: Source[],
  treatment: Treatment,
  config: PipelineConfig,
): { words: number; seconds: number } {
  const multiplier = detailMultiplier(config);
  const words = sources.reduce(
    (total, source) =>
      total + estimateSourceWords(source, treatment, multiplier),
    0,
  );
  const narrationSeconds =
    (words /
      spokenWordsPerMinute(
        config.language,
        config.voice.speaking_rate,
      )) *
    60;

  let additionalVisualSeconds = 0;
  if (treatment === "EXPLAIN" || treatment === "SHOW") {
    additionalVisualSeconds = sources.reduce(
      (total, source) => total + visualSeconds[source.element_type],
      0,
    );
  } else if (treatment === "REFERENCE") {
    additionalVisualSeconds = 4;
  } else if (treatment === "UNREADABLE") {
    additionalVisualSeconds = 7;
  } else if (treatment === "DUPLICATE") {
    additionalVisualSeconds = 3;
  }

  return {
    words,
    seconds: Math.max(3, Math.ceil(narrationSeconds + additionalVisualSeconds)),
  };
}

function uniqueSortedNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

function allocateIntegerBudget(
  total: number,
  weights: number[],
  minimums: number[],
): number[] {
  const minimumTotal = minimums.reduce((sum, value) => sum + value, 0);
  if (minimumTotal > total) {
    throw new Error(
      `Plan có quá nhiều chapter/item để nằm trong ${total}s (minimum ${minimumTotal}s). Hãy gộp chapter và item.`,
    );
  }
  const remaining = total - minimumTotal;
  const weightTotal = weights.reduce((sum, value) => sum + Math.max(1, value), 0);
  const raw = weights.map(
    (weight, index) =>
      minimums[index]! + (remaining * Math.max(1, weight)) / weightTotal,
  );
  const allocated = raw.map(Math.floor);
  let leftover = total - allocated.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);
  for (let cursor = 0; leftover > 0; cursor += 1, leftover -= 1) {
    allocated[order[cursor % order.length]!.index]! += 1;
  }
  return allocated;
}

export function buildLecturePlan(
  decision: PlannerDecision,
  document: DocumentArtifact,
  config: PipelineConfig,
): LecturePlanArtifact {
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );

  const rawChapters = decision.chapters.map((chapter) => {
    const items = chapter.items.map((item) => {
      const sources = item.source_ids
        .map((sourceId) => sourceById.get(sourceId))
        .filter((source): source is Source => Boolean(source));
      const estimate = estimateItem(sources, item.treatment, config);
      return {
        ...item,
        page_numbers: uniqueSortedNumbers(
          sources.map((source) => source.page),
        ),
        estimated_narration_words: estimate.words,
        duration_seconds: estimate.seconds,
      };
    });
    const sourceIds = uniqueInOrder(
      items.flatMap((item) => item.source_ids),
    );
    const pages = uniqueSortedNumbers(
      sourceIds
        .map((sourceId) => sourceById.get(sourceId)?.page)
        .filter((page): page is number => page !== undefined),
    );
    return {
      chapter_id: chapter.chapter_id,
      title: chapter.title,
      learning_objectives: chapter.learning_objectives,
      duration_seconds:
        CHAPTER_TRANSITION_SECONDS +
        items.reduce((total, item) => total + item.duration_seconds, 0),
      source_ids: sourceIds,
      page_numbers: pages,
      items,
    };
  });
  const targetSeconds = config.duration.target_seconds;
  const chapterBudgets = allocateIntegerBudget(
    targetSeconds,
    rawChapters.map((chapter) => chapter.duration_seconds),
    rawChapters.map(
      (chapter) => CHAPTER_TRANSITION_SECONDS + chapter.items.length,
    ),
  );
  const chapters = rawChapters.map((chapter, chapterIndex) => {
    const itemBudget =
      chapterBudgets[chapterIndex]! - CHAPTER_TRANSITION_SECONDS;
    const itemDurations = allocateIntegerBudget(
      itemBudget,
      chapter.items.map((item) => item.duration_seconds),
      chapter.items.map(() => 1),
    );
    const items = chapter.items.map((item, itemIndex) => {
      const durationSeconds = itemDurations[itemIndex]!;
      const teaches = ["EXPLAIN", "MENTION", "SHOW"].includes(item.treatment);
      return {
        ...item,
        duration_seconds: durationSeconds,
        estimated_narration_words: teaches
          ? narrationWordBudget(
              durationSeconds,
              config.language,
              config.voice.speaking_rate,
            )
          : 0,
      };
    });
    return {
      ...chapter,
      duration_seconds: chapterBudgets[chapterIndex]!,
      items,
    };
  });

  const treatmentBySource = new Map<string, Treatment>();
  for (const chapter of chapters) {
    for (const item of chapter.items) {
      for (const sourceId of item.source_ids) {
        if (!treatmentBySource.has(sourceId)) {
          treatmentBySource.set(sourceId, item.treatment);
        }
      }
    }
  }

  const pagesForTreatments = (...treatments: Treatment[]): number[] =>
    uniqueSortedNumbers(
      document.sources
        .filter((source) =>
          treatments.includes(
            treatmentBySource.get(source.source_id) ?? "UNREADABLE",
          ),
        )
        .map((source) => source.page),
    );

  const accountedSourceIds = document.sources
    .map((source) => source.source_id)
    .filter((sourceId) => treatmentBySource.has(sourceId));
  const accountedPages = uniqueSortedNumbers(
    document.sources
      .filter((source) => treatmentBySource.has(source.source_id))
      .map((source) => source.page),
  );
  const warnings = [
    ...document.warnings,
    ...document.pages.flatMap((page) =>
      page.warnings.map((warning) => `Trang ${page.page}: ${warning}`),
    ),
  ];

  return {
    schema_version: "1.0",
    title: decision.title,
    coverage_mode: config.coverage_mode,
    audience: config.audience,
    language: config.language,
    estimated_duration_seconds: chapters.reduce(
      (total, chapter) => total + chapter.duration_seconds,
      0,
    ),
    learning_objectives: decision.learning_objectives,
    chapters,
    coverage: {
      total_pages: document.total_pages,
      total_sources: document.sources.length,
      accounted_pages: accountedPages,
      accounted_source_ids: accountedSourceIds,
      covered_pages: pagesForTreatments("EXPLAIN", "MENTION", "SHOW"),
    reference_pages: pagesForTreatments("REFERENCE", "OUT_OF_SCOPE"),
      unreadable_pages: pagesForTreatments("UNREADABLE"),
      duplicate_pages: pagesForTreatments("DUPLICATE"),
      coverage_rate:
        document.sources.length === 0
          ? 0
          : accountedSourceIds.length / document.sources.length,
    },
    warnings,
  };
}
