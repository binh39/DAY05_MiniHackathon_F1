import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PipelineConfig } from "../../core/config.js";
import type {
  ScriptArtifact,
  StoryboardArtifact,
  VoiceManifest,
} from "../../core/contracts.js";
import {
  GoogleCloudTtsAdapter,
  type SpeechSynthesisRequest,
  type TtsAdapter,
} from "./google-tts-adapter.js";
import { buildSceneSsml } from "./ssml-builder.js";
import {
  createVoiceCacheKey,
  readVoiceCache,
  writeVoiceCache,
} from "./voice-cache.js";
import {
  validateVoiceCoverage,
  validateVoiceFiles,
} from "./voice-validator.js";
import { parseWav, writeSilentWav } from "./wav.js";

const SAMPLE_RATE_HERTZ = 24_000;
const MAX_CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;
const CHAPTER_GAP_SECONDS = 0.6;
const MIN_SAFE_COMPOSER_TEMPO = 0.8;
const MAX_SAFE_COMPOSER_TEMPO = 1.25;

function languageCode(language: string): string {
  const normalized = language.toLowerCase();
  if (normalized === "vi" || normalized.startsWith("vi-")) return "vi-VN";
  if (normalized === "en" || normalized.startsWith("en-")) return "en-US";
  return language;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function checksum(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function synthesizeWithRetry(
  adapter: TtsAdapter,
  request: SpeechSynthesisRequest,
): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await adapter.synthesize(request);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await delay(300 * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}

function durationWarnings(
  actual: number,
  estimated: number,
): string[] {
  const warnings: string[] = [];
  const deltaRate = Math.abs(actual - estimated) / estimated;
  if (deltaRate > 0.5) {
    warnings.push(
      `Thời lượng TTS ${actual.toFixed(2)}s lệch ${(deltaRate * 100).toFixed(0)}% so với ước tính ${estimated.toFixed(2)}s.`,
    );
  }
  return warnings;
}

export async function generateVoiceManifest(
  config: PipelineConfig,
  script: ScriptArtifact,
  storyboard: StoryboardArtifact,
  projectDirectory: string,
  runDirectory: string,
  adapter: TtsAdapter = new GoogleCloudTtsAdapter(),
  calibrationAttempt = 0,
): Promise<VoiceManifest> {
  if (config.voice.provider !== "google") {
    throw new Error(
      `Module 5B hiện hỗ trợ provider "google"; nhận "${config.voice.provider}".`,
    );
  }
  const targetLanguage = languageCode(config.language);
  await adapter.assertVoiceAvailable(targetLanguage, config.voice.voice_id);

  const narrationKinds = new Map(
    script.chapters.flatMap((chapter) =>
      chapter.narrations.map(
        (narration) => [narration.narration_id, narration.kind] as const,
      ),
    ),
  );
  const outputDirectory = path.join(runDirectory, "assets", "audio");
  await mkdir(outputDirectory, { recursive: true });
  const results = new Array<VoiceManifest["scenes"][number]>(
    storyboard.scenes.length,
  );
  let completed = 0;
  let cacheHits = 0;

  async function processScene(index: number): Promise<void> {
    const scene = storyboard.scenes[index]!;
    const kind = narrationKinds.get(scene.narration_id);
    if (!kind) {
      throw new Error(
        `Không tìm thấy narration ${scene.narration_id} trong script.`,
      );
    }
    const { ssml } = buildSceneSsml(
      scene.narration,
      kind,
      script.pronunciation_glossary,
      targetLanguage,
    );
    const request: SpeechSynthesisRequest = {
      ssml,
      languageCode: targetLanguage,
      voiceId: config.voice.voice_id,
      speakingRate: config.voice.speaking_rate,
      sampleRateHertz: SAMPLE_RATE_HERTZ,
    };
    const outputPath = path.join(outputDirectory, `${scene.scene_id}.wav`);
    const cacheKey = createVoiceCacheKey(adapter.provider, request);
    let metadata = await readVoiceCache(
      projectDirectory,
      cacheKey,
      outputPath,
    );
    let failure: unknown;
    if (metadata) {
      cacheHits += 1;
    } else {
      try {
        const audio = await synthesizeWithRetry(adapter, request);
        await writeFile(outputPath, audio);
        const wav = parseWav(audio);
        if (wav.sampleRateHertz !== SAMPLE_RATE_HERTZ) {
          throw new Error(
            `TTS trả sample rate ${wav.sampleRateHertz}, expected ${SAMPLE_RATE_HERTZ}.`,
          );
        }
        metadata = {
          audio_sha256: await checksum(outputPath),
          duration_seconds: wav.durationSeconds,
          sample_rate_hertz: wav.sampleRateHertz,
        };
        await writeVoiceCache(
          projectDirectory,
          cacheKey,
          outputPath,
          metadata,
        );
      } catch (error) {
        failure = error;
        await writeSilentWav(
          outputPath,
          scene.estimated_duration_seconds,
          SAMPLE_RATE_HERTZ,
        );
        const wav = parseWav(await readFile(outputPath));
        metadata = {
          audio_sha256: await checksum(outputPath),
          duration_seconds: wav.durationSeconds,
          sample_rate_hertz: wav.sampleRateHertz,
        };
      }
    }
    const warnings = durationWarnings(
      metadata.duration_seconds,
      scene.estimated_duration_seconds,
    );
    if (failure) {
      warnings.unshift(
        `TTS thất bại sau ${MAX_ATTEMPTS} lần; đã tạo silent fallback: ${
          failure instanceof Error ? failure.message : String(failure)
        }`,
      );
    }
    results[index] = {
      scene_id: scene.scene_id,
      narration_id: scene.narration_id,
      audio_path: path.relative(projectDirectory, outputPath),
      audio_sha256: metadata.audio_sha256,
      duration_seconds: metadata.duration_seconds,
      sample_rate_hertz: metadata.sample_rate_hertz,
      status: failure
        ? "FAILED"
        : warnings.length > 0
          ? "WARNING"
          : "READY",
      warnings,
    };
    completed += 1;
    if (completed % 10 === 0 || completed === storyboard.scenes.length) {
      process.stdout.write(
        `  Voice scenes ${completed}/${storyboard.scenes.length}\n`,
      );
    }
  }

  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < storyboard.scenes.length) {
      const index = nextIndex;
      nextIndex += 1;
      await processScene(index);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENCY, storyboard.scenes.length) },
      () => worker(),
    ),
  );
  if (cacheHits === storyboard.scenes.length) {
    process.stdout.write("  Voice scene cache hit for all scenes.\n");
  } else if (cacheHits > 0) {
    process.stdout.write(
      `  Voice scene cache hit ${cacheHits}/${storyboard.scenes.length}.\n`,
    );
  }

  const manifest: VoiceManifest = {
    schema_version: "1.0",
    provider: adapter.provider,
    voice_id: config.voice.voice_id,
    audio_encoding: "LINEAR16",
    sample_rate_hertz: SAMPLE_RATE_HERTZ,
    total_scenes: storyboard.scenes.length,
    total_duration_seconds: results.reduce(
      (sum, scene) => sum + scene.duration_seconds,
      0,
    ),
    scenes: results,
  };
  validateVoiceCoverage(storyboard, manifest);
  await validateVoiceFiles(projectDirectory, manifest);

  const chapterGapCount = storyboard.scenes.reduce(
    (count, scene, index) =>
      index > 0 &&
      storyboard.scenes[index - 1]?.chapter_id !== scene.chapter_id
        ? count + 1
        : count,
    0,
  );
  const fixedGapSeconds = chapterGapCount * CHAPTER_GAP_SECONDS;
  const rawDurationSeconds =
    manifest.total_duration_seconds + fixedGapSeconds;
  const outsideRequiredRange =
    rawDurationSeconds < config.duration.min_seconds ||
    rawDurationSeconds > config.duration.max_seconds;
  const desiredVoiceSeconds = Math.max(
    1,
    config.duration.target_seconds - fixedGapSeconds,
  );
  const requiredTempo =
    manifest.total_duration_seconds / desiredVoiceSeconds;
  const containsFallback = manifest.scenes.some(
    (scene) => scene.status === "FAILED",
  );

  if (
    calibrationAttempt === 0 &&
    outsideRequiredRange &&
    !containsFallback &&
    (requiredTempo < MIN_SAFE_COMPOSER_TEMPO ||
      requiredTempo > MAX_SAFE_COMPOSER_TEMPO)
  ) {
    const calibratedSpeakingRate = Math.max(
      0.5,
      Math.min(
        2,
        config.voice.speaking_rate * requiredTempo,
      ),
    );
    if (
      Math.abs(calibratedSpeakingRate - config.voice.speaking_rate) >=
      0.01
    ) {
      process.stdout.write(
        `  Voice duration calibration: ${rawDurationSeconds.toFixed(2)}s -> target ${config.duration.target_seconds}s, speaking_rate=${calibratedSpeakingRate.toFixed(3)}\n`,
      );
      return generateVoiceManifest(
        {
          ...config,
          voice: {
            ...config.voice,
            speaking_rate: calibratedSpeakingRate,
          },
        },
        script,
        storyboard,
        projectDirectory,
        runDirectory,
        adapter,
        calibrationAttempt + 1,
      );
    }
  }
  return manifest;
}
