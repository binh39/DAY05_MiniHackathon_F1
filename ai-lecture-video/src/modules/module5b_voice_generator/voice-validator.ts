import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  StoryboardArtifact,
  VoiceManifest,
} from "../../core/contracts.js";
import { parseWav } from "./wav.js";

export function validateVoiceCoverage(
  storyboard: StoryboardArtifact,
  manifest: VoiceManifest,
): void {
  const expected = new Map(
    storyboard.scenes.map((scene) => [scene.scene_id, scene.narration_id]),
  );
  const seen = new Set<string>();
  for (const scene of manifest.scenes) {
    if (seen.has(scene.scene_id)) {
      throw new Error(`Voice manifest trùng scene_id ${scene.scene_id}.`);
    }
    seen.add(scene.scene_id);
    const narrationId = expected.get(scene.scene_id);
    if (!narrationId) {
      throw new Error(`Voice manifest có scene ngoài storyboard: ${scene.scene_id}.`);
    }
    if (scene.narration_id !== narrationId) {
      throw new Error(
        `Scene ${scene.scene_id} dùng narration ${scene.narration_id}, expected ${narrationId}.`,
      );
    }
  }
  const missing = [...expected.keys()].filter((sceneId) => !seen.has(sceneId));
  if (missing.length > 0) {
    throw new Error(`Voice manifest thiếu scene: ${missing.join(", ")}.`);
  }
  if (
    manifest.total_scenes !== storyboard.scenes.length ||
    manifest.scenes.length !== storyboard.scenes.length
  ) {
    throw new Error("Voice manifest total_scenes không khớp storyboard.");
  }
  const total = manifest.scenes.reduce(
    (sum, scene) => sum + scene.duration_seconds,
    0,
  );
  if (Math.abs(total - manifest.total_duration_seconds) > 0.02) {
    throw new Error("Voice manifest total_duration_seconds không khớp scene.");
  }
}

export async function validateVoiceFiles(
  projectDirectory: string,
  manifest: VoiceManifest,
): Promise<void> {
  for (const scene of manifest.scenes) {
    const audio = await readFile(path.resolve(projectDirectory, scene.audio_path));
    const wav = parseWav(audio);
    const sha256 = createHash("sha256").update(audio).digest("hex");
    if (sha256 !== scene.audio_sha256) {
      throw new Error(`Checksum audio sai ở scene ${scene.scene_id}.`);
    }
    if (wav.sampleRateHertz !== scene.sample_rate_hertz) {
      throw new Error(`Sample rate audio sai ở scene ${scene.scene_id}.`);
    }
    if (Math.abs(wav.durationSeconds - scene.duration_seconds) > 0.01) {
      throw new Error(`Duration audio sai ở scene ${scene.scene_id}.`);
    }
  }
}
