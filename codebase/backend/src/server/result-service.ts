import type {
  DocumentArtifact,
  LecturePlanArtifact,
  VideoManifest,
} from "../core/contracts.js";

export function buildResultDetail(
  jobId: string,
  document: DocumentArtifact,
  plan: LecturePlanArtifact,
  manifest: VideoManifest,
) {
  const timestampByChapter = new Map(
    manifest.chapter_timestamps.map((item) => [
      item.chapter_id,
      item.start_seconds,
    ]),
  );
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );
  const orderedChapters = plan.chapters
    .map((chapter) => ({
      chapter,
      start_seconds: timestampByChapter.get(chapter.chapter_id),
    }))
    .filter(
      (
        item,
      ): item is {
        chapter: LecturePlanArtifact["chapters"][number];
        start_seconds: number;
      } => item.start_seconds !== undefined,
    )
    .sort((left, right) => left.start_seconds - right.start_seconds);

  return {
    title: plan.title,
    duration_seconds: manifest.duration_seconds,
    coverage: {
      mode: plan.coverage_mode,
      rate: plan.coverage.coverage_rate,
      total_pages: plan.coverage.total_pages,
      total_sources: plan.coverage.total_sources,
      covered_pages: plan.coverage.covered_pages.length,
      reference_pages: plan.coverage.reference_pages,
      unreadable_pages: plan.coverage.unreadable_pages,
      duplicate_pages: plan.coverage.duplicate_pages,
      warnings: [...new Set([...plan.warnings, ...manifest.warnings])],
    },
    chapters: orderedChapters.map((item, index) => {
      const next = orderedChapters[index + 1];
      return {
        chapter_id: item.chapter.chapter_id,
        title: item.chapter.title,
        start_seconds: item.start_seconds,
        end_seconds: next?.start_seconds ?? manifest.duration_seconds,
        page_numbers: item.chapter.page_numbers,
        learning_objectives: item.chapter.learning_objectives,
        sources: item.chapter.source_ids
          .map((sourceId) => sourceById.get(sourceId))
          .filter(
            (
              source,
            ): source is DocumentArtifact["sources"][number] =>
              source !== undefined,
          )
          .map((source) => ({
            source_id: source.source_id,
            page: source.page,
            element_type: source.element_type,
            excerpt: source.excerpt,
            confidence: source.confidence,
          })),
      };
    }),
    pages: document.pages.map((page) => ({
      page: page.page,
      summary: page.summary,
      concepts: page.concepts,
      warnings: page.warnings,
      image_url: `/api/jobs/${jobId}/result/pages/${page.page}`,
    })),
  };
}
