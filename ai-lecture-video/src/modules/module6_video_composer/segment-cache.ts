import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  VisualManifest,
  VoiceManifest,
} from "../../core/contracts.js";
import type { TimelineScene } from "./timeline.js";
import { probeMedia } from "./video-validator.js";

const CACHE_VERSION = "module6-v1-remotion-ffmpeg-7.1";
const metadataSchema = z.object({
  duration_seconds: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
});

export function createSegmentCacheKey(
  timeline: TimelineScene,
  visual: VisualManifest["scenes"][number],
  voice: VoiceManifest["scenes"][number],
  width: number,
  height: number,
  fps: number,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        cache_version: CACHE_VERSION,
        timeline,
        visual_sha256: visual.asset_sha256,
        audio_sha256: voice.audio_sha256,
        width,
        height,
        fps,
        codec: "h264+aac",
        crf: 20,
      }),
    )
    .digest("hex");
}

function paths(projectDirectory: string, key: string) {
  const directory = path.join(projectDirectory, ".cache", "module6-segments");
  return {
    directory,
    video: path.join(directory, `${key}.mp4`),
    metadata: path.join(directory, `${key}.json`),
  };
}

export async function readSegmentCache(
  projectDirectory: string,
  key: string,
  outputPath: string,
): Promise<boolean> {
  const cache = paths(projectDirectory, key);
  try {
    const metadata = metadataSchema.parse(
      JSON.parse(await readFile(cache.metadata, "utf8")),
    );
    const probe = await probeMedia(cache.video);
    if (
      !probe.hasVideo ||
      !probe.hasAudio ||
      probe.width !== metadata.width ||
      probe.height !== metadata.height ||
      Math.abs(probe.durationSeconds - metadata.duration_seconds) > 0.15
    ) {
      return false;
    }
    await mkdir(path.dirname(outputPath), { recursive: true });
    await copyFile(cache.video, outputPath);
    return true;
  } catch {
    return false;
  }
}

export async function writeSegmentCache(
  projectDirectory: string,
  key: string,
  segmentPath: string,
  metadata: z.infer<typeof metadataSchema>,
): Promise<void> {
  const cache = paths(projectDirectory, key);
  await mkdir(cache.directory, { recursive: true });
  await copyFile(segmentPath, cache.video);
  await writeFile(
    cache.metadata,
    `${JSON.stringify(metadataSchema.parse(metadata), null, 2)}\n`,
    "utf8",
  );
}
