import type {
  DocumentArtifact,
  LecturePlanArtifact,
  ScriptArtifact,
} from "../../core/contracts.js";
import { preTtsDurationToleranceSeconds } from "../../core/speech-duration.js";

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function validateScript(
  script: ScriptArtifact,
  document: DocumentArtifact,
  lecturePlan: LecturePlanArtifact,
  requireSemanticReview = true,
): void {
  const errors: string[] = [];
  const documentSourceIds = new Set(
    document.sources.map((source) => source.source_id),
  );
  const planChapterById = new Map(
    lecturePlan.chapters.map((chapter) => [chapter.chapter_id, chapter]),
  );
  const expectedChapterIds = lecturePlan.chapters.map(
    (chapter) => chapter.chapter_id,
  );
  const actualChapterIds = script.chapters.map(
    (chapter) => chapter.chapter_id,
  );

  if (JSON.stringify(actualChapterIds) !== JSON.stringify(expectedChapterIds)) {
    errors.push("Script chapter IDs hoặc thứ tự chapter không khớp lecture plan.");
  }
  const narrationIds = script.chapters.flatMap((chapter) =>
    chapter.narrations.map((narration) => narration.narration_id),
  );
  const duplicateNarrationIds = findDuplicates(narrationIds);
  if (duplicateNarrationIds.length > 0) {
    errors.push(
      `Narration ID bị trùng: ${duplicateNarrationIds.join(", ")}.`,
    );
  }

  for (const chapter of script.chapters) {
    const plannedChapter = planChapterById.get(chapter.chapter_id);
    if (!plannedChapter) continue;
    // This is a pre-TTS guard, not the final media duration check. Module 6 uses
    // measured WAV durations and safely fits them to the requested target.
    const durationToleranceSeconds = preTtsDurationToleranceSeconds(
      plannedChapter.duration_seconds,
    );
    if (
      chapter.estimated_duration_seconds >
      plannedChapter.duration_seconds + durationToleranceSeconds
    ) {
      errors.push(
        `${chapter.chapter_id} có ${chapter.estimated_duration_seconds}s narration, vượt duration plan ${plannedChapter.duration_seconds}s.`,
      );
    }
    const allowedSources = new Set(plannedChapter.source_ids);
    const allowedItems = new Set(
      plannedChapter.items.map((item) => item.item_id),
    );
    const citedTeachingSources = new Set<string>();

    for (const narration of chapter.narrations) {
      if (wordCount(narration.text) > 90) {
        errors.push(
          `${narration.narration_id} vượt 90 từ, cần chunk thành scene nhỏ hơn.`,
        );
      }
      if (
        narration.kind === "GROUNDED_CLAIM" &&
        narration.source_ids.length === 0
      ) {
        errors.push(
          `${narration.narration_id} là GROUNDED_CLAIM nhưng thiếu source.`,
        );
      }
      if (
        narration.kind === "TRANSITION" &&
        narration.source_ids.length > 0
      ) {
        errors.push(
          `${narration.narration_id} là TRANSITION nhưng có citation giả.`,
        );
      }
      for (const sourceId of narration.source_ids) {
        if (!documentSourceIds.has(sourceId)) {
          errors.push(
            `${narration.narration_id} dùng source không tồn tại ${sourceId}.`,
          );
        } else if (!allowedSources.has(sourceId)) {
          errors.push(
            `${narration.narration_id} cite đúng document nhưng sai element/chapter: ${sourceId}.`,
          );
        }
        if (narration.kind === "GROUNDED_CLAIM") {
          citedTeachingSources.add(sourceId);
        }
      }
      if (
        narration.item_id !== undefined &&
        !allowedItems.has(narration.item_id)
      ) {
        errors.push(
          `${narration.narration_id} dùng item_id không thuộc chapter: ${narration.item_id}.`,
        );
      }
      for (const objectiveIndex of narration.objective_indices) {
        if (
          objectiveIndex < 0 ||
          objectiveIndex >= plannedChapter.learning_objectives.length
        ) {
          errors.push(
            `${narration.narration_id} dùng objective index không tồn tại: ${objectiveIndex}.`,
          );
        }
      }
    }

    const requiredSourceIds = plannedChapter.items
      .filter((item) =>
        ["EXPLAIN", "MENTION", "SHOW"].includes(item.treatment),
      )
      .flatMap((item) => item.source_ids);
    const missingSources = requiredSourceIds.filter(
      (sourceId) => !citedTeachingSources.has(sourceId),
    );
    if (missingSources.length > 0) {
      errors.push(
        `${chapter.chapter_id} chưa grounded các source cần dạy: ${missingSources.join(", ")}.`,
      );
    }
    const hasLearningCheck = chapter.narrations.some(
      (narration) => narration.kind === "LEARNING_CHECK",
    );
    if (!hasLearningCheck) {
      errors.push(`${chapter.chapter_id} thiếu LEARNING_CHECK.`);
    }
  }

  if (script.validation.ungrounded_claims.length > 0) {
    errors.push(
      `Grounded claims thiếu source: ${script.validation.ungrounded_claims.join(", ")}.`,
    );
  }
  if (script.validation.missing_objectives.length > 0) {
    errors.push(
      `Learning objectives chưa được phủ: ${script.validation.missing_objectives.join(", ")}.`,
    );
  }
  if (requireSemanticReview && script.validation.semantic_issues.length > 0) {
    errors.push(
      `Semantic grounding còn lỗi: ${script.validation.semantic_issues
        .map(
          (issue) =>
            `${issue.narration_id}/${issue.issue_type}: ${issue.explanation}`,
        )
        .join(" | ")}.`,
    );
  }
  if (requireSemanticReview && !script.validation.semantic_reviewed) {
    errors.push("Script chưa vượt qua semantic grounding review.");
  }

  if (errors.length > 0) {
    throw new Error(`Script validation failed:\n- ${errors.join("\n- ")}`);
  }
}
