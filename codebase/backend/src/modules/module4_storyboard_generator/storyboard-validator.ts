import type {
  DocumentArtifact,
  ScriptArtifact,
  StoryboardArtifact,
} from "../../core/contracts.js";
import {
  templateName,
  validateTemplateProps,
} from "./template-registry.js";

function duplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

export function validateStoryboard(
  storyboard: StoryboardArtifact,
  document: DocumentArtifact,
  script: ScriptArtifact,
): void {
  const errors: string[] = [];
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );
  const narrations = script.chapters.flatMap((chapter) =>
    chapter.narrations.map((narration) => ({
      ...narration,
      chapter_id: chapter.chapter_id,
    })),
  );
  const narrationById = new Map(
    narrations.map((narration) => [
      narration.narration_id,
      narration,
    ]),
  );
  const sceneNarrationIds = storyboard.scenes.map(
    (scene) => scene.narration_id,
  );
  const missing = narrations
    .map((narration) => narration.narration_id)
    .filter((narrationId) => !sceneNarrationIds.includes(narrationId));
  const duplicated = duplicates(sceneNarrationIds);
  const extra = sceneNarrationIds.filter(
    (narrationId) => !narrationById.has(narrationId),
  );

  if (missing.length > 0) {
    errors.push(`Narration thiếu scene: ${missing.join(", ")}.`);
  }
  if (duplicated.length > 0) {
    errors.push(`Narration có nhiều scene: ${duplicated.join(", ")}.`);
  }
  if (extra.length > 0) {
    errors.push(`Scene tham chiếu narration không tồn tại: ${extra.join(", ")}.`);
  }

  for (const scene of storyboard.scenes) {
    const narration = narrationById.get(scene.narration_id);
    if (!narration) continue;
    if (scene.chapter_id !== narration.chapter_id) {
      errors.push(`${scene.scene_id} sai chapter_id.`);
    }
    if (scene.narration !== narration.text) {
      errors.push(`${scene.scene_id} thay đổi narration text.`);
    }
    if (
      scene.estimated_duration_seconds !==
      narration.estimated_duration_seconds
    ) {
      errors.push(`${scene.scene_id} sai narration duration.`);
    }
    if (scene.visual.template !== templateName(scene.visual.type)) {
      errors.push(`${scene.scene_id} dùng template không đúng registry.`);
    }
    try {
      validateTemplateProps(scene.visual.type, scene.visual.props);
    } catch (error) {
      errors.push(
        `${scene.scene_id} có props không hợp lệ: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    for (const sourceId of scene.visual.source_ids) {
      if (!sourceById.has(sourceId)) {
        errors.push(`${scene.scene_id} dùng source không tồn tại ${sourceId}.`);
      }
      if (!narration.source_ids.includes(sourceId)) {
        errors.push(
          `${scene.scene_id} dùng source ${sourceId} không thuộc narration.`,
        );
      }
    }
    if (
      narration.kind === "GROUNDED_CLAIM" &&
      scene.visual.source_ids.length === 0
    ) {
      errors.push(`${scene.scene_id} là grounded visual nhưng thiếu source.`);
    }
    if (
      ["ORIGINAL_PAGE", "CROP_AND_HIGHLIGHT", "DIAGRAM"].includes(
        scene.visual.type,
      ) &&
      scene.visual.source_ids.length === 0
    ) {
      errors.push(`${scene.scene_id} là visual quan trọng nhưng thiếu source.`);
    }
    if (
      scene.visual.type === "CROP_AND_HIGHLIGHT" &&
      scene.asset_plan.mode !== "SOURCE_CROP"
    ) {
      errors.push(`${scene.scene_id} crop scene thiếu SOURCE_CROP asset plan.`);
    }
  }

  const sceneIds = storyboard.scenes.map((scene) => scene.scene_id);
  const duplicateSceneIds = duplicates(sceneIds);
  if (duplicateSceneIds.length > 0) {
    errors.push(`Scene ID bị trùng: ${duplicateSceneIds.join(", ")}.`);
  }
  const duration = storyboard.scenes.reduce(
    (total, scene) => total + scene.estimated_duration_seconds,
    0,
  );
  if (duration !== script.estimated_duration_seconds) {
    errors.push(
      `Storyboard duration ${duration}s không khớp script ${script.estimated_duration_seconds}s.`,
    );
  }
  if (
    storyboard.validation.missing_narration_ids.length > 0 ||
    storyboard.validation.duplicate_narration_ids.length > 0 ||
    storyboard.validation.invalid_source_ids.length > 0 ||
    storyboard.validation.duration_delta_seconds !== 0
  ) {
    errors.push("Storyboard validation manifest còn lỗi.");
  }

  if (errors.length > 0) {
    throw new Error(`Storyboard validation failed:\n- ${errors.join("\n- ")}`);
  }
}
