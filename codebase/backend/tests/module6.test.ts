import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import type { PipelineConfig } from "../src/core/config.js";
import type {
  LecturePlanArtifact,
  StoryboardArtifact,
  VisualManifest,
  VoiceManifest,
} from "../src/core/contracts.js";
import {
  buildSubtitleCues,
  renderSrt,
  validateSubtitleCues,
} from "../src/modules/module6_video_composer/subtitle.js";
import {
  buildTimeline,
  CHAPTER_GAP_SECONDS,
} from "../src/modules/module6_video_composer/timeline.js";
import { fitNarrationDuration } from "../src/modules/module6_video_composer/duration-fit.js";
import { composeVideo } from "../src/modules/module6_video_composer/video-composer.js";
import { probeMedia } from "../src/modules/module6_video_composer/video-validator.js";
import { createSilentWav } from "../src/modules/module5b_voice_generator/wav.js";

const config: PipelineConfig = {
  input_pdf: "inputs/test.pdf",
  output_directory: "outputs",
  coverage_mode: "FULL",
  audience: "beginner",
  language: "vi",
  detail_level: "standard",
  visual_style: "modern_minimal",
  duration: {
    option: "8-10",
    min_seconds: 0,
    max_seconds: 1800,
    target_seconds: 540,
  },
  max_chapter_minutes: 8,
  limits: { max_pdf_megabytes: 50, max_pdf_pages: 80 },
  voice: {
    provider: "google",
    voice_id: "vi-VN-Neural2-A",
    speaking_rate: 1,
  },
  render: { width: 320, height: 180, fps: 30 },
};

const storyboard: StoryboardArtifact = {
  schema_version: "1.0",
  title: "Test",
  language: "vi",
  estimated_duration_seconds: 2,
  scenes: [
    {
      scene_id: "scene_0001",
      chapter_id: "ch_01",
      narration_id: "n01",
      narration: "Đây là phụ đề kiểm thử ngắn và dễ đọc.",
      visual: {
        type: "BULLET",
        source_ids: ["p1_e01"],
        template: "bullet-v1",
        props: {},
      },
      asset_plan: { mode: "GENERATED_LAYOUT", instructions: ["Render"] },
      fallback: { visual_type: "BULLET", reason: "Fallback" },
      warnings: [],
      estimated_duration_seconds: 2,
    },
  ],
  validation: {
    total_narrations: 1,
    total_scenes: 1,
    missing_narration_ids: [],
    duplicate_narration_ids: [],
    invalid_source_ids: [],
    duration_delta_seconds: 0,
  },
};

const lecturePlan: LecturePlanArtifact = {
  schema_version: "1.0",
  title: "Test",
  coverage_mode: "FULL",
  audience: "beginner",
  language: "vi",
  estimated_duration_seconds: 2,
  learning_objectives: ["Test"],
  chapters: [
    {
      chapter_id: "ch_01",
      title: "Test",
      learning_objectives: ["Test"],
      duration_seconds: 2,
      source_ids: ["p1_e01"],
      page_numbers: [1],
      items: [
        {
          item_id: "item_01",
          title: "Test",
          treatment: "EXPLAIN",
          reason: "Test",
          source_ids: ["p1_e01"],
          page_numbers: [1],
          estimated_narration_words: 10,
          duration_seconds: 2,
        },
      ],
    },
  ],
  coverage: {
    total_pages: 1,
    total_sources: 1,
    accounted_pages: [1],
    accounted_source_ids: ["p1_e01"],
    covered_pages: [1],
    reference_pages: [],
    unreadable_pages: [],
    duplicate_pages: [],
    coverage_rate: 1,
  },
  warnings: [],
};

async function temporaryDirectory(t: test.TestContext): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-module6-"),
  );
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test("timeline uses real voice duration, frame alignment and chapter gap", () => {
  const twoScenes = structuredClone(storyboard);
  const second = structuredClone(twoScenes.scenes[0]!);
  second.scene_id = "scene_0002";
  second.chapter_id = "ch_02";
  second.narration_id = "n02";
  twoScenes.scenes.push(second);
  twoScenes.validation.total_narrations = 2;
  twoScenes.validation.total_scenes = 2;
  const voices: VoiceManifest = {
    schema_version: "1.0",
    provider: "test",
    voice_id: "test",
    audio_encoding: "LINEAR16",
    sample_rate_hertz: 24_000,
    total_scenes: 2,
    total_duration_seconds: 2.02,
    scenes: [
      {
        scene_id: "scene_0001",
        narration_id: "n01",
        audio_path: "one.wav",
        audio_sha256: "a".repeat(64),
        duration_seconds: 1.01,
        sample_rate_hertz: 24_000,
        status: "READY",
        warnings: [],
      },
      {
        scene_id: "scene_0002",
        narration_id: "n02",
        audio_path: "two.wav",
        audio_sha256: "b".repeat(64),
        duration_seconds: 1.01,
        sample_rate_hertz: 24_000,
        status: "READY",
        warnings: [],
      },
    ],
  };
  const timeline = buildTimeline(twoScenes, voices, 30);
  assert.equal(timeline.scenes[0]?.gapSeconds, CHAPTER_GAP_SECONDS);
  assert.equal(timeline.scenes[0]?.durationSeconds, 1.6333333333333333);
  assert.equal(
    timeline.chapterTimestamps[1]?.start_seconds,
    timeline.scenes[0]?.durationSeconds,
  );
});

test("subtitle is readable, monotonic and does not expose source IDs", () => {
  const voices: VoiceManifest = {
    schema_version: "1.0",
    provider: "test",
    voice_id: "test",
    audio_encoding: "LINEAR16",
    sample_rate_hertz: 24_000,
    total_scenes: 1,
    total_duration_seconds: 2,
    scenes: [
      {
        scene_id: "scene_0001",
        narration_id: "n01",
        audio_path: "one.wav",
        audio_sha256: "a".repeat(64),
        duration_seconds: 2,
        sample_rate_hertz: 24_000,
        status: "READY",
        warnings: [],
      },
    ],
  };
  const input = structuredClone(storyboard);
  input.scenes[0]!.narration += " p1_e01";
  const timeline = buildTimeline(input, voices, 30);
  const cues = buildSubtitleCues(timeline);
  validateSubtitleCues(cues, timeline.durationSeconds);
  const srt = renderSrt(cues);
  assert.match(srt, /-->/);
  assert.doesNotMatch(srt, /p1_e01/);
  assert.ok(cues.every((cue) => cue.lines.length <= 2));
});

test("fits measured narration toward target without a long silent tail", () => {
  const natural = fitNarrationDuration({
    rawDurationSeconds: 377.4,
    fixedGapSeconds: 2.4,
    minSeconds: 300,
    maxSeconds: 480,
    targetSeconds: 410,
  });
  assert.equal(natural.mode, "NATURAL");
  assert.ok(Math.abs(natural.audioTempo - 375 / 407.6) < 0.000_001);
  assert.equal(natural.desiredDurationSeconds, 410);

  const oldCachedAudio = fitNarrationDuration({
    rawDurationSeconds: 223.4,
    fixedGapSeconds: 2.4,
    minSeconds: 300,
    maxSeconds: 480,
    targetSeconds: 410,
  });
  assert.equal(oldCachedAudio.mode, "RECOVERY");
  assert.ok(Math.abs(oldCachedAudio.audioTempo - 0.7) < 0.000_001);
  assert.ok(oldCachedAudio.desiredDurationSeconds >= 300);
  assert.ok(oldCachedAudio.desiredDurationSeconds <= 480);

  assert.throws(
    () =>
      fitNarrationDuration({
        rawDurationSeconds: 10,
        fixedGapSeconds: 0,
        minSeconds: 300,
        maxSeconds: 480,
        targetSeconds: 410,
      }),
    /DURATION_OUT_OF_RANGE/,
  );
});

test("composes and probes a real H.264/AAC MP4, then reuses segment cache", async (t) => {
  const projectDirectory = await temporaryDirectory(t);
  const assetDirectory = path.join(projectDirectory, "fixtures");
  await mkdir(assetDirectory, { recursive: true });
  const imagePath = path.join(assetDirectory, "scene.png");
  const audioPath = path.join(assetDirectory, "scene.wav");
  const canvas = createCanvas(320, 180);
  const context = canvas.getContext("2d");
  context.fillStyle = "#071226";
  context.fillRect(0, 0, 320, 180);
  context.fillStyle = "#ffffff";
  context.font = "24px sans-serif";
  context.fillText("Module 6", 92, 96);
  await writeFile(imagePath, canvas.toBuffer("image/png"));
  await writeFile(audioPath, createSilentWav(1, 24_000));
  const imageSha = createHash("sha256")
    .update(await readFile(imagePath))
    .digest("hex");
  const audioSha = createHash("sha256")
    .update(await readFile(audioPath))
    .digest("hex");
  const visuals: VisualManifest = {
    schema_version: "1.0",
    render_engine: "test",
    width: 320,
    height: 180,
    total_scenes: 1,
    scenes: [
      {
        scene_id: "scene_0001",
        template: "bullet-v1",
        asset_path: path.relative(projectDirectory, imagePath),
        asset_sha256: imageSha,
        width: 320,
        height: 180,
        status: "READY",
        warnings: [],
      },
    ],
  };
  const voices: VoiceManifest = {
    schema_version: "1.0",
    provider: "test",
    voice_id: "test",
    audio_encoding: "LINEAR16",
    sample_rate_hertz: 24_000,
    total_scenes: 1,
    total_duration_seconds: 1,
    scenes: [
      {
        scene_id: "scene_0001",
        narration_id: "n01",
        audio_path: path.relative(projectDirectory, audioPath),
        audio_sha256: audioSha,
        duration_seconds: 1,
        sample_rate_hertz: 24_000,
        status: "READY",
        warnings: [],
      },
    ],
  };
  const first = await composeVideo(
    config,
    lecturePlan,
    storyboard,
    visuals,
    voices,
    projectDirectory,
    path.join(projectDirectory, "runs", "first"),
  );
  assert.equal(first.video_codec, "h264");
  assert.equal(first.audio_codec, "aac");
  assert.equal(first.total_scenes, 1);
  const probe = await probeMedia(
    path.resolve(projectDirectory, first.video_path),
  );
  assert.equal(probe.width, 320);
  assert.equal(probe.height, 180);
  assert.ok(probe.hasAudio);

  const second = await composeVideo(
    config,
    lecturePlan,
    storyboard,
    visuals,
    voices,
    projectDirectory,
    path.join(projectDirectory, "runs", "second"),
  );
  assert.equal(second.video_sha256, first.video_sha256);

  await assert.rejects(
    composeVideo(
      {
        ...config,
        duration: {
          option: "0-1",
          min_seconds: 0,
          max_seconds: 0.5,
          target_seconds: 0.4,
        },
      },
      lecturePlan,
      storyboard,
      visuals,
      voices,
      projectDirectory,
      path.join(projectDirectory, "runs", "duration-blocked"),
    ),
    /DURATION_OUT_OF_RANGE/,
  );

  const failedVoices = structuredClone(voices);
  failedVoices.scenes[0]!.status = "FAILED";
  await assert.rejects(
    composeVideo(
      config,
      lecturePlan,
      storyboard,
      visuals,
      failedVoices,
      projectDirectory,
      path.join(projectDirectory, "runs", "blocked"),
    ),
    /scene FAILED/,
  );
});
