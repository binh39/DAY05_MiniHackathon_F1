import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { SpeechSynthesisRequest } from "./google-tts-adapter.js";
import { parseWav } from "./wav.js";

const CACHE_VERSION = "module5b-v1-google-tts-rest";

const cacheMetadataSchema = z.object({
  audio_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  duration_seconds: z.number().positive(),
  sample_rate_hertz: z.number().int().positive(),
});

export type VoiceCacheMetadata = z.infer<typeof cacheMetadataSchema>;

export function createVoiceCacheKey(
  provider: string,
  request: SpeechSynthesisRequest,
): string {
  return createHash("sha256")
    .update(JSON.stringify({ cache_version: CACHE_VERSION, provider, ...request }))
    .digest("hex");
}

function cachePaths(projectDirectory: string, cacheKey: string) {
  const directory = path.join(projectDirectory, ".cache", "module5b-voice");
  return {
    directory,
    audio: path.join(directory, `${cacheKey}.wav`),
    metadata: path.join(directory, `${cacheKey}.json`),
  };
}

async function checksum(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

export async function readVoiceCache(
  projectDirectory: string,
  cacheKey: string,
  outputPath: string,
): Promise<VoiceCacheMetadata | null> {
  const cache = cachePaths(projectDirectory, cacheKey);
  try {
    const metadata = cacheMetadataSchema.parse(
      JSON.parse(await readFile(cache.metadata, "utf8")),
    );
    const wav = parseWav(await readFile(cache.audio));
    if (
      wav.sampleRateHertz !== metadata.sample_rate_hertz ||
      Math.abs(wav.durationSeconds - metadata.duration_seconds) > 0.01 ||
      (await checksum(cache.audio)) !== metadata.audio_sha256
    ) {
      return null;
    }
    await mkdir(path.dirname(outputPath), { recursive: true });
    await copyFile(cache.audio, outputPath);
    return metadata;
  } catch {
    return null;
  }
}

export async function writeVoiceCache(
  projectDirectory: string,
  cacheKey: string,
  audioPath: string,
  metadata: VoiceCacheMetadata,
): Promise<void> {
  const cache = cachePaths(projectDirectory, cacheKey);
  await mkdir(cache.directory, { recursive: true });
  await copyFile(audioPath, cache.audio);
  await writeFile(
    cache.metadata,
    `${JSON.stringify(cacheMetadataSchema.parse(metadata), null, 2)}\n`,
    "utf8",
  );
}
