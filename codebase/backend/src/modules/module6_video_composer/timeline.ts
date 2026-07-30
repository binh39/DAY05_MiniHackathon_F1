import type {
  StoryboardArtifact,
  VoiceManifest,
} from "../../core/contracts.js";

export const CHAPTER_GAP_SECONDS = 0.6;

export interface TimelineScene {
  sceneId: string;
  narrationId: string;
  chapterId: string;
  narration: string;
  startSeconds: number;
  voiceDurationSeconds: number;
  gapSeconds: number;
  durationSeconds: number;
}

export interface LectureTimeline {
  scenes: TimelineScene[];
  durationSeconds: number;
  chapterTimestamps: Array<{
    chapter_id: string;
    start_seconds: number;
  }>;
}

export function buildTimeline(
  storyboard: StoryboardArtifact,
  voices: VoiceManifest,
  fps = 30,
): LectureTimeline {
  const voiceByScene = new Map(
    voices.scenes.map((scene) => [scene.scene_id, scene]),
  );
  const scenes: TimelineScene[] = [];
  const chapterTimestamps: LectureTimeline["chapterTimestamps"] = [];
  let cursor = 0;

  for (let index = 0; index < storyboard.scenes.length; index += 1) {
    const scene = storyboard.scenes[index]!;
    const voice = voiceByScene.get(scene.scene_id);
    if (!voice) {
      throw new Error(`Thiếu voice cho scene ${scene.scene_id}.`);
    }
    if (voice.narration_id !== scene.narration_id) {
      throw new Error(`Voice narration không khớp scene ${scene.scene_id}.`);
    }
    if (
      index === 0 ||
      storyboard.scenes[index - 1]?.chapter_id !== scene.chapter_id
    ) {
      chapterTimestamps.push({
        chapter_id: scene.chapter_id,
        start_seconds: cursor,
      });
    }
    const next = storyboard.scenes[index + 1];
    const gapSeconds =
      next && next.chapter_id !== scene.chapter_id
        ? CHAPTER_GAP_SECONDS
        : 0;
    const durationSeconds =
      Math.ceil((voice.duration_seconds + gapSeconds) * fps) / fps;
    scenes.push({
      sceneId: scene.scene_id,
      narrationId: scene.narration_id,
      chapterId: scene.chapter_id,
      narration: scene.narration,
      startSeconds: cursor,
      voiceDurationSeconds: voice.duration_seconds,
      gapSeconds,
      durationSeconds,
    });
    cursor += durationSeconds;
  }
  return {
    scenes,
    durationSeconds: cursor,
    chapterTimestamps,
  };
}
