import type { PipelineConfig } from "../../core/config.js";
import type {
  DocumentArtifact,
  LecturePlanArtifact,
} from "../../core/contracts.js";
import type { Treatment } from "./planner-types.js";
import { CHAPTER_TRANSITION_SECONDS } from "./duration-estimator.js";

function sameArray<T>(left: T[], right: T[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sortedUnique<T extends string | number>(values: T[]): T[] {
  return [...new Set(values)].sort((left, right) => {
    if (typeof left === "number" && typeof right === "number") {
      return left - right;
    }
    return String(left).localeCompare(String(right));
  }) as T[];
}

export function validateLecturePlan(
  plan: LecturePlanArtifact,
  document: DocumentArtifact,
  config: PipelineConfig,
): void {
  const errors: string[] = [];
  const knownSourceIds = new Set(
    document.sources.map((source) => source.source_id),
  );
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );
  const assignments = new Map<
    string,
    Array<{ treatment: Treatment; chapterId: string; itemId: string }>
  >();

  const chapterIds = plan.chapters.map((chapter) => chapter.chapter_id);
  if (new Set(chapterIds).size !== chapterIds.length) {
    errors.push("chapter_id bị trùng.");
  }
  const itemIds = plan.chapters.flatMap((chapter) =>
    chapter.items.map((item) => item.item_id),
  );
  if (new Set(itemIds).size !== itemIds.length) {
    errors.push("item_id bị trùng.");
  }

  let previousMinimumPage = 0;
  for (const chapter of plan.chapters) {
    const maximumSeconds = config.max_chapter_minutes * 60;
    if (chapter.duration_seconds > maximumSeconds) {
      errors.push(
        `${chapter.chapter_id} dài ${chapter.duration_seconds}s, vượt giới hạn ${maximumSeconds}s.`,
      );
    }
    const expectedChapterDuration =
      CHAPTER_TRANSITION_SECONDS +
      chapter.items.reduce(
        (total, item) => total + item.duration_seconds,
        0,
      );
    if (chapter.duration_seconds !== expectedChapterDuration) {
      errors.push(`${chapter.chapter_id} có duration không nhất quán.`);
    }

    for (const item of chapter.items) {
      for (const sourceId of item.source_ids) {
        if (!knownSourceIds.has(sourceId)) {
          errors.push(`${item.item_id} dùng source không tồn tại: ${sourceId}.`);
          continue;
        }
        const existing = assignments.get(sourceId) ?? [];
        existing.push({
          treatment: item.treatment,
          chapterId: chapter.chapter_id,
          itemId: item.item_id,
        });
        assignments.set(sourceId, existing);
      }
      const expectedPages = sortedUnique(
        item.source_ids
          .map((sourceId) => sourceById.get(sourceId)?.page)
          .filter((page): page is number => page !== undefined),
      );
      if (!sameArray(item.page_numbers, expectedPages)) {
        errors.push(`${item.item_id} có page_numbers không khớp source.`);
      }
    }

    const expectedSourceIds = [
      ...new Set(chapter.items.flatMap((item) => item.source_ids)),
    ];
    if (!sameArray(chapter.source_ids, expectedSourceIds)) {
      errors.push(`${chapter.chapter_id} có source_ids không khớp items.`);
    }
    const expectedPages = sortedUnique(
      expectedSourceIds
        .map((sourceId) => sourceById.get(sourceId)?.page)
        .filter((page): page is number => page !== undefined),
    );
    if (!sameArray(chapter.page_numbers, expectedPages)) {
      errors.push(`${chapter.chapter_id} có page_numbers không khớp source.`);
    }
    const minimumPage = expectedPages[0] ?? previousMinimumPage;
    if (minimumPage < previousMinimumPage) {
      errors.push(`${chapter.chapter_id} làm đảo thứ tự trang.`);
    }
    previousMinimumPage = minimumPage;
  }

  const missingSources = document.sources
    .map((source) => source.source_id)
    .filter((sourceId) => !assignments.has(sourceId));
  const duplicatedSources = [...assignments.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([sourceId]) => sourceId);
  if (missingSources.length > 0) {
    errors.push(`Thiếu source: ${missingSources.join(", ")}.`);
  }
  if (duplicatedSources.length > 0) {
    errors.push(`Source được gán nhiều lần: ${duplicatedSources.join(", ")}.`);
  }

  if (config.coverage_mode === "FULL") {
    const expectedPages = Array.from(
      { length: document.total_pages },
      (_, index) => index + 1,
    );
    if (!sameArray(plan.coverage.accounted_pages, expectedPages)) {
      errors.push("FULL mode chưa account đủ mọi trang.");
    }
    if (plan.coverage.coverage_rate !== 1) {
      errors.push("FULL mode phải có coverage_rate = 1.");
    }
    for (const source of document.sources) {
      if (source.element_type !== "CODE") continue;
      const assignment = assignments.get(source.source_id)?.[0];
      if (
        assignment &&
        assignment.treatment !== "EXPLAIN" &&
        assignment.treatment !== "SHOW"
      ) {
        errors.push(
          `CODE source ${source.source_id} phải EXPLAIN hoặc SHOW trong FULL mode.`,
        );
      }
    }
  }

  if (plan.coverage.total_pages !== document.total_pages) {
    errors.push("coverage.total_pages không khớp document.");
  }
  if (plan.coverage.total_sources !== document.sources.length) {
    errors.push("coverage.total_sources không khớp document.");
  }
  const expectedAccountedSources = document.sources
    .map((source) => source.source_id)
    .filter((sourceId) => assignments.has(sourceId));
  if (
    !sameArray(
      plan.coverage.accounted_source_ids,
      expectedAccountedSources,
    )
  ) {
    errors.push("coverage.accounted_source_ids không khớp assignments.");
  }
  const expectedTotalDuration = plan.chapters.reduce(
    (total, chapter) => total + chapter.duration_seconds,
    0,
  );
  if (plan.estimated_duration_seconds !== expectedTotalDuration) {
    errors.push("estimated_duration_seconds không khớp tổng chapter.");
  }
  if (
    plan.estimated_duration_seconds < config.duration.min_seconds ||
    plan.estimated_duration_seconds > config.duration.max_seconds
  ) {
    errors.push(
      `Lecture plan ${plan.estimated_duration_seconds}s nằm ngoài khoảng ${config.duration.min_seconds}-${config.duration.max_seconds}s.`,
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}
