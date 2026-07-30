import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { PipelineConfig } from "../../core/config.js";
import type {
  LecturePlanArtifact,
  StoryboardArtifact,
  VideoManifest,
  VisualManifest,
  VoiceManifest,
} from "../../core/contracts.js";
import { buildCoverageReport } from "./coverage-report.js";
import { runMediaCommand } from "./ffmpeg.js";
import {
  createSegmentCacheKey,
  readSegmentCache,
  writeSegmentCache,
} from "./segment-cache.js";
import {
  buildSubtitleCues,
  renderSrt,
  validateSubtitleCues,
} from "./subtitle.js";
import { buildTimeline } from "./timeline.js";
import {
  probeMedia,
  validateFinalMedia,
  validateTimeline,
} from "./video-validator.js";

async function checksum(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function resolveProjectAsset(
  projectDirectory: string,
  relativePath: string,
): string {
  const root = path.resolve(projectDirectory);
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Asset nằm ngoài project: ${relativePath}.`);
  }
  return absolute;
}

function validateInputs(
  storyboard: StoryboardArtifact,
  visuals: VisualManifest,
  voices: VoiceManifest,
): void {
  const failedVisuals = visuals.scenes.filter(
    (scene) => scene.status === "FAILED",
  );
  const failedVoices = voices.scenes.filter(
    (scene) => scene.status === "FAILED",
  );
  if (failedVisuals.length > 0 || failedVoices.length > 0) {
    throw new Error(
      `Không compose khi còn scene FAILED: visual=${failedVisuals.length}, voice=${failedVoices.length}.`,
    );
  }
  for (const scene of storyboard.scenes) {
    if (!visuals.scenes.some((visual) => visual.scene_id === scene.scene_id)) {
      throw new Error(`Thiếu visual cho scene ${scene.scene_id}.`);
    }
    if (!voices.scenes.some((voice) => voice.scene_id === scene.scene_id)) {
      throw new Error(`Thiếu voice cho scene ${scene.scene_id}.`);
    }
  }
}

async function renderSegment(
  imagePath: string,
  audioPath: string,
  outputPath: string,
  durationSeconds: number,
  audioTempo: number,
  config: PipelineConfig,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await runMediaCommand(
        "ffmpeg",
        [
          "-y",
          "-loop",
          "1",
          "-framerate",
          String(config.render.fps),
          "-i",
          imagePath,
          "-i",
          audioPath,
          "-af",
          `${Math.abs(audioTempo - 1) > 0.001 ? `atempo=${audioTempo.toFixed(6)},` : ""}apad`,
          "-t",
          durationSeconds.toFixed(6),
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-tune",
          "stillimage",
          "-crf",
          "20",
          "-pix_fmt",
          "yuv420p",
          "-r",
          String(config.render.fps),
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-ar",
          "48000",
          "-movflags",
          "+faststart",
          outputPath,
        ],
        { timeoutMs: 300_000 },
      );
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function composeVideo(
  config: PipelineConfig,
  lecturePlan: LecturePlanArtifact,
  storyboard: StoryboardArtifact,
  visuals: VisualManifest,
  voices: VoiceManifest,
  projectDirectory: string,
  runDirectory: string,
): Promise<VideoManifest> {
  validateInputs(storyboard, visuals, voices);
  const rawTimeline = buildTimeline(storyboard, voices, config.render.fps);
  const outsideRange =
    rawTimeline.durationSeconds < config.duration.min_seconds ||
    rawTimeline.durationSeconds > config.duration.max_seconds;
  const desiredDuration = outsideRange
    ? config.duration.target_seconds
    : rawTimeline.durationSeconds;
  const fixedGapSeconds = rawTimeline.scenes.reduce(
    (total, scene) => total + scene.gapSeconds,
    0,
  );
  const desiredVoiceSeconds = desiredDuration - fixedGapSeconds;
  if (desiredVoiceSeconds <= 0) {
    throw new Error(
      "DURATION_OUT_OF_RANGE: khoảng nghỉ chapter đã vượt toàn bộ duration budget.",
    );
  }
  const audioTempo =
    (rawTimeline.durationSeconds - fixedGapSeconds) / desiredVoiceSeconds;
  if (outsideRange && (audioTempo < 0.8 || audioTempo > 1.25)) {
    throw new Error(
      `DURATION_OUT_OF_RANGE: audio thực tế ${rawTimeline.durationSeconds.toFixed(2)}s, yêu cầu ${config.duration.min_seconds}-${config.duration.max_seconds}s. Độ lệch quá lớn để hiệu chỉnh tốc độ đọc an toàn.`,
    );
  }
  const adjustedVoices: VoiceManifest =
    Math.abs(audioTempo - 1) > 0.001
      ? {
          ...voices,
          total_duration_seconds:
            voices.total_duration_seconds / audioTempo,
          scenes: voices.scenes.map((scene) => ({
            ...scene,
            duration_seconds: scene.duration_seconds / audioTempo,
          })),
        }
      : voices;
  const timeline = buildTimeline(
    storyboard,
    adjustedVoices,
    config.render.fps,
  );
  if (
    timeline.durationSeconds < config.duration.min_seconds ||
    timeline.durationSeconds > config.duration.max_seconds
  ) {
    throw new Error(
      `DURATION_OUT_OF_RANGE: audio/video thực tế ${timeline.durationSeconds.toFixed(2)}s, yêu cầu ${config.duration.min_seconds}-${config.duration.max_seconds}s. Cần tạo lại script/TTS ngắn hơn hoặc dài hơn trước khi compose.`,
    );
  }
  const cues = buildSubtitleCues(timeline);
  validateSubtitleCues(cues, timeline.durationSeconds);
  validateTimeline(timeline, cues);

  const segmentsDirectory = path.join(runDirectory, "assets", "segments");
  await mkdir(segmentsDirectory, { recursive: true });
  const subtitlePath = path.join(runDirectory, "lecture.srt");
  const coveragePath = path.join(runDirectory, "coverage-report.json");
  await writeFile(subtitlePath, renderSrt(cues), "utf8");
  await writeFile(
    coveragePath,
    `${JSON.stringify(
      buildCoverageReport(lecturePlan, storyboard, timeline),
      null,
      2,
    )}\n`,
    "utf8",
  );

  const visualByScene = new Map(
    visuals.scenes.map((scene) => [scene.scene_id, scene]),
  );
  const voiceByScene = new Map(
    voices.scenes.map((scene) => [scene.scene_id, scene]),
  );
  const segmentPaths = new Array<string>(timeline.scenes.length);
  let completed = 0;
  let cacheHits = 0;

  async function processSegment(index: number): Promise<void> {
    const scene = timeline.scenes[index]!;
    const visual = visualByScene.get(scene.sceneId)!;
    const voice = voiceByScene.get(scene.sceneId)!;
    const outputPath = path.join(
      segmentsDirectory,
      `${String(index + 1).padStart(4, "0")}_${scene.sceneId}.mp4`,
    );
    const cacheKey = createSegmentCacheKey(
      scene,
      visual,
      voice,
      config.render.width,
      config.render.height,
      config.render.fps,
    );
    const cached = await readSegmentCache(
      projectDirectory,
      cacheKey,
      outputPath,
    );
    if (cached) {
      cacheHits += 1;
    } else {
      await renderSegment(
        resolveProjectAsset(projectDirectory, visual.asset_path),
        resolveProjectAsset(projectDirectory, voice.audio_path),
        outputPath,
        scene.durationSeconds,
        audioTempo,
        config,
      );
      const probe = await probeMedia(outputPath);
      if (!probe.hasVideo || !probe.hasAudio) {
        throw new Error(`Segment ${scene.sceneId} thiếu video/audio stream.`);
      }
      await writeSegmentCache(projectDirectory, cacheKey, outputPath, {
        duration_seconds: probe.durationSeconds,
        width: probe.width,
        height: probe.height,
        fps: config.render.fps,
      });
    }
    segmentPaths[index] = outputPath;
    completed += 1;
    if (completed % 10 === 0 || completed === timeline.scenes.length) {
      process.stdout.write(
        `  Video segments ${completed}/${timeline.scenes.length}\n`,
      );
    }
  }

  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < timeline.scenes.length) {
      const index = nextIndex;
      nextIndex += 1;
      await processSegment(index);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(2, timeline.scenes.length) },
      () => worker(),
    ),
  );
  if (cacheHits === timeline.scenes.length) {
    process.stdout.write("  Video segment cache hit for all scenes.\n");
  } else if (cacheHits > 0) {
    process.stdout.write(
      `  Video segment cache hit ${cacheHits}/${timeline.scenes.length}.\n`,
    );
  }

  const concatPath = path.join(segmentsDirectory, "concat.txt");
  await writeFile(
    concatPath,
    `${segmentPaths
      .map((segment) => `file '${path.basename(segment).replaceAll("'", "'\\''")}'`)
      .join("\n")}\n`,
    "utf8",
  );
  const videoPath = path.join(runDirectory, "lecture.mp4");
  await runMediaCommand(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      path.basename(concatPath),
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      videoPath,
    ],
    { cwd: segmentsDirectory, timeoutMs: 300_000 },
  );

  const probe = await validateFinalMedia(
    videoPath,
    subtitlePath,
    timeline,
    config.render.width,
    config.render.height,
    config.render.fps,
  );
  const warningCount =
    visuals.scenes.filter((scene) => scene.status === "WARNING").length +
    voices.scenes.filter((scene) => scene.status === "WARNING").length;
  return {
    schema_version: "1.0",
    video_path: path.relative(projectDirectory, videoPath),
    video_sha256: await checksum(videoPath),
    file_size_bytes: probe.fileSizeBytes,
    video_codec: "h264",
    audio_codec: "aac",
    width: probe.width,
    height: probe.height,
    fps: probe.fps,
    total_scenes: timeline.scenes.length,
    subtitle_path: path.relative(projectDirectory, subtitlePath),
    subtitle_sha256: await checksum(subtitlePath),
    duration_seconds: probe.durationSeconds,
    chapter_timestamps: timeline.chapterTimestamps,
    coverage_report_path: path.relative(projectDirectory, coveragePath),
    coverage_report_sha256: await checksum(coveragePath),
    warnings: [
      ...(warningCount > 0
        ? [`Có ${warningCount} visual/voice scene ở trạng thái WARNING.`]
        : []),
      ...(Math.abs(audioTempo - 1) > 0.001
        ? [
            `Đã hiệu chỉnh tốc độ audio ${audioTempo.toFixed(3)}x để giữ video trong khoảng ${config.duration.min_seconds}-${config.duration.max_seconds}s.`,
          ]
        : []),
    ],
  };
}
