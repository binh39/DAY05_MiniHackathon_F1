import type {
  LecturePlanArtifact,
  StoryboardArtifact,
} from "../../core/contracts.js";
import type { LectureTimeline } from "./timeline.js";

export function buildCoverageReport(
  lecturePlan: LecturePlanArtifact,
  storyboard: StoryboardArtifact,
  timeline: LectureTimeline,
) {
  const timelineByScene = new Map(
    timeline.scenes.map((scene) => [scene.sceneId, scene]),
  );
  return {
    schema_version: "1.0",
    coverage_mode: lecturePlan.coverage_mode,
    summary: lecturePlan.coverage,
    chapters: lecturePlan.chapters.map((chapter) => {
      const scenes = storyboard.scenes.filter(
        (scene) => scene.chapter_id === chapter.chapter_id,
      );
      return {
        chapter_id: chapter.chapter_id,
        title: chapter.title,
        page_numbers: chapter.page_numbers,
        source_ids: chapter.source_ids,
        scenes: scenes.map((scene) => {
          const timelineScene = timelineByScene.get(scene.scene_id);
          return {
            scene_id: scene.scene_id,
            narration_id: scene.narration_id,
            source_ids: scene.visual.source_ids,
            start_seconds: timelineScene?.startSeconds,
            duration_seconds: timelineScene?.durationSeconds,
          };
        }),
      };
    }),
    warnings: lecturePlan.warnings,
  };
}
