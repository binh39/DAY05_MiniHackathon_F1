import { z } from "zod";
import type { PipelineConfig } from "../core/config.js";
import type {
  DocumentArtifact,
  LecturePlanArtifact,
} from "../core/contracts.js";
import type { OutlineDraft } from "./types.js";

export const outlineDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  chapters: z
    .array(
      z.object({
        chapter_id: z.string().min(1),
        title: z.string().trim().min(1).max(160),
        learning_objectives: z
          .array(z.string().trim().min(1).max(300))
          .min(1)
          .max(12),
        detail_level: z.enum(["brief", "standard", "deep"]),
      }),
    )
    .min(1)
    .max(100),
});

const DETAIL_SCALE = {
  brief: 0.75,
  standard: 1,
  deep: 1.25,
} as const;

export function defaultOutlineDraft(
  plan: LecturePlanArtifact,
): OutlineDraft {
  return {
    title: plan.title,
    chapters: plan.chapters.map((chapter) => ({
      chapter_id: chapter.chapter_id,
      title: chapter.title,
      learning_objectives: chapter.learning_objectives,
      detail_level: "standard",
    })),
  };
}

export function applyOutlineDraft(
  plan: LecturePlanArtifact,
  rawDraft: unknown,
  config: PipelineConfig,
): LecturePlanArtifact {
  const draft = outlineDraftSchema.parse(rawDraft);
  const originalById = new Map(
    plan.chapters.map((chapter) => [chapter.chapter_id, chapter]),
  );
  const draftIds = draft.chapters.map((chapter) => chapter.chapter_id);
  const originalIds = plan.chapters.map((chapter) => chapter.chapter_id);
  if (
    new Set(draftIds).size !== originalIds.length ||
    originalIds.some((chapterId) => !draftIds.includes(chapterId))
  ) {
    throw new Error(
      "Outline phải giữ nguyên đầy đủ chapter_id; chỉ được đổi thứ tự và nội dung hiển thị.",
    );
  }

  const warnings = [...plan.warnings];
  const chapters = draft.chapters.map((chapterDraft) => {
    const original = originalById.get(chapterDraft.chapter_id);
    if (!original) throw new Error(`Chapter không tồn tại: ${chapterDraft.chapter_id}.`);
    const requestedScale = DETAIL_SCALE[chapterDraft.detail_level];
    const originalItemsSeconds = original.items.reduce(
      (total, item) => total + item.duration_seconds,
      0,
    );
    const maximumItemsSeconds = config.max_chapter_minutes * 60 - 18;
    const maximumScale =
      originalItemsSeconds > 0
        ? maximumItemsSeconds / originalItemsSeconds
        : requestedScale;
    const scale = Math.max(0.25, Math.min(requestedScale, maximumScale));
    if (scale < requestedScale) {
      warnings.push(
        `${original.chapter_id}: mức chi tiết được giới hạn để không vượt ${config.max_chapter_minutes} phút.`,
      );
    }
    const items = original.items.map((item) => ({
      ...item,
      estimated_narration_words: Math.max(
        item.estimated_narration_words === 0 ? 0 : 1,
        Math.round(item.estimated_narration_words * scale),
      ),
      duration_seconds: Math.max(1, Math.round(item.duration_seconds * scale)),
    }));
    let excessSeconds =
      18 +
      items.reduce((total, item) => total + item.duration_seconds, 0) -
      config.max_chapter_minutes * 60;
    for (let index = items.length - 1; index >= 0 && excessSeconds > 0; index -= 1) {
      const item = items[index];
      if (!item) continue;
      const reduction = Math.min(excessSeconds, item.duration_seconds - 1);
      item.duration_seconds -= reduction;
      excessSeconds -= reduction;
    }
    return {
      ...original,
      title: chapterDraft.title,
      learning_objectives: chapterDraft.learning_objectives,
      duration_seconds:
        18 + items.reduce((total, item) => total + item.duration_seconds, 0),
      items,
    };
  });

  return {
    ...plan,
    title: draft.title,
    learning_objectives: [
      ...new Set(chapters.flatMap((chapter) => chapter.learning_objectives)),
    ],
    chapters,
    estimated_duration_seconds: chapters.reduce(
      (total, chapter) => total + chapter.duration_seconds,
      0,
    ),
    warnings: [...new Set(warnings)],
  };
}

export function outlinePreview(
  jobId: string,
  document: DocumentArtifact,
  plan: LecturePlanArtifact,
  draft = defaultOutlineDraft(plan),
) {
  const sectionPages = new Map<string, Set<number>>();
  for (const section of document.sections) {
    sectionPages.set(section.section_id, new Set<number>());
    const sourceIds = new Set(section.source_ids);
    for (const source of document.sources) {
      if (sourceIds.has(source.source_id)) {
        sectionPages.get(section.section_id)?.add(source.page);
      }
    }
  }
  return {
    document: {
      title: document.title,
      total_pages: document.total_pages,
      total_sources: document.sources.length,
      language: document.language,
      warnings: document.warnings,
      sections: document.sections.map((section) => ({
        section_id: section.section_id,
        title: section.title,
        concepts: section.concepts,
        page_numbers: [...(sectionPages.get(section.section_id) ?? [])].sort(
          (left, right) => left - right,
        ),
      })),
      first_thumbnail_url: `/api/jobs/${jobId}/outline/pages/1/thumbnail`,
    },
    plan: {
      coverage_mode: plan.coverage_mode,
      estimated_duration_seconds: plan.estimated_duration_seconds,
      coverage_rate: plan.coverage.coverage_rate,
      warnings: plan.warnings,
      draft,
      chapters: plan.chapters.map((chapter) => ({
        chapter_id: chapter.chapter_id,
        title: chapter.title,
        duration_seconds: chapter.duration_seconds,
        page_numbers: chapter.page_numbers,
        items: chapter.items.map((item) => ({
          item_id: item.item_id,
          title: item.title,
          treatment: item.treatment,
          reason: item.reason,
          page_numbers: item.page_numbers,
        })),
      })),
    },
  };
}
