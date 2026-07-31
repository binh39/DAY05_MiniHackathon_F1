import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PipelineConfig } from "../src/core/config.js";
import type {
  ScriptArtifact,
  StoryboardArtifact,
} from "../src/core/contracts.js";
import type {
  SpeechSynthesisRequest,
  TtsAdapter,
} from "../src/modules/module5b_voice_generator/google-tts-adapter.js";
import { buildSceneSsml } from "../src/modules/module5b_voice_generator/ssml-builder.js";
import { generateVoiceManifest } from "../src/modules/module5b_voice_generator/voice-generator.js";
import {
  createSilentWav,
  parseWav,
} from "../src/modules/module5b_voice_generator/wav.js";

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
  render: { width: 1920, height: 1080, fps: 30 },
};

const script: ScriptArtifact = {
  schema_version: "1.0",
  title: "Test",
  language: "vi",
  estimated_duration_seconds: 2,
  chapters: [
    {
      chapter_id: "ch_01",
      title: "Test",
      estimated_duration_seconds: 2,
      learning_objectives: ["Hiểu API"],
      objective_coverage: [
        { objective_index: 0, objective: "Hiểu API", narration_ids: ["n01"] },
      ],
      narrations: [
        {
          narration_id: "n01",
          item_id: "item_01",
          kind: "LEARNING_CHECK",
          text: "API là gì?",
          source_ids: ["p1_e01"],
          objective_indices: [0],
          estimated_duration_seconds: 2,
        },
      ],
    },
  ],
  pronunciation_glossary: [
    {
      term: "API",
      pronunciation: "ây pi ai",
      meaning: "Giao diện lập trình",
      source_ids: ["p1_e01"],
    },
  ],
  validation: {
    grounded_claims: 1,
    ungrounded_claims: [],
    missing_objectives: [],
    semantic_reviewed: true,
    semantic_issues: [],
  },
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
      narration: "API <tốt> là gì? p1_e01",
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

class FakeAdapter implements TtsAdapter {
  readonly provider = "fake-google";
  synthesizeCalls = 0;
  failuresBeforeSuccess = 0;

  async assertVoiceAvailable(): Promise<void> {}

  async synthesize(_request: SpeechSynthesisRequest): Promise<Buffer> {
    this.synthesizeCalls += 1;
    if (this.synthesizeCalls <= this.failuresBeforeSuccess) {
      throw new Error("temporary error");
    }
    return createSilentWav(1.25, 24_000);
  }
}

class RateAwareFakeAdapter implements TtsAdapter {
  readonly provider = "rate-aware-fake-google";
  synthesizeCalls = 0;
  speakingRates: number[] = [];

  async assertVoiceAvailable(): Promise<void> {}

  async synthesize(request: SpeechSynthesisRequest): Promise<Buffer> {
    this.synthesizeCalls += 1;
    this.speakingRates.push(request.speakingRate);
    return createSilentWav(13 / request.speakingRate, 24_000);
  }
}

async function temporaryDirectory(t: test.TestContext): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-module5b-"),
  );
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test("SSML strips source IDs, escapes XML, marks English glossary terms and pause", () => {
  const result = buildSceneSsml(
    "API <tốt> p1_e01",
    "LEARNING_CHECK",
    script.pronunciation_glossary,
  );
  assert.match(result.ssml, /<lang xml:lang="en-US">API<\/lang>/);
  assert.match(result.ssml, /&lt;tốt&gt;/);
  assert.match(result.ssml, /<break time="700ms"\/>/);
  assert.doesNotMatch(result.ssml, /p1_e01/);
});

test("SSML marks English phrases inside Vietnamese narration", () => {
  const result = buildSceneSsml(
    "Việt Nam dùng mô hình machine learning, prompt và API.",
    "GROUNDED_CLAIM",
    script.pronunciation_glossary,
    "vi-VN",
  );
  assert.match(
    result.ssml,
    /<lang xml:lang="en-US">machine learning<\/lang>/,
  );
  assert.match(result.ssml, /<lang xml:lang="en-US">prompt<\/lang>/);
  assert.match(result.ssml, /<lang xml:lang="en-US">API<\/lang>/);
  assert.doesNotMatch(result.ssml, /xml:lang="en-US">Nam<\/lang>/);
});

test("SSML marks Vietnamese phrases and names inside English narration", () => {
  const result = buildSceneSsml(
    "This lesson explains mô hình học máy in Việt Nam.",
    "GROUNDED_CLAIM",
    [],
    "en-US",
  );
  assert.match(result.ssml, /<lang xml:lang="vi-VN">mô hình học máy<\/lang>/);
  assert.match(result.ssml, /<lang xml:lang="vi-VN">Việt Nam<\/lang>/);
});

test("WAV parser reports real duration and rejects invalid input", () => {
  const wav = parseWav(createSilentWav(1.5, 24_000));
  assert.equal(wav.sampleRateHertz, 24_000);
  assert.equal(wav.channels, 1);
  assert.equal(wav.bitsPerSample, 16);
  assert.equal(wav.durationSeconds, 1.5);
  assert.throws(() => parseWav(Buffer.from("not wav")), /RIFF\/WAVE/);
});

test("voice generator writes a validated manifest and reuses cache", async (t) => {
  const projectDirectory = await temporaryDirectory(t);
  const adapter = new FakeAdapter();
  const first = await generateVoiceManifest(
    config,
    script,
    storyboard,
    projectDirectory,
    path.join(projectDirectory, "runs", "first"),
    adapter,
  );
  assert.equal(first.total_scenes, 1);
  assert.equal(first.scenes[0]?.sample_rate_hertz, 24_000);
  assert.equal(adapter.synthesizeCalls, 1);
  assert.equal(
    parseWav(
      await readFile(path.resolve(projectDirectory, first.scenes[0]!.audio_path)),
    ).durationSeconds,
    1.25,
  );

  await generateVoiceManifest(
    config,
    script,
    storyboard,
    projectDirectory,
    path.join(projectDirectory, "runs", "second"),
    adapter,
  );
  assert.equal(adapter.synthesizeCalls, 1);
});

test("voice generator retries transient synthesis errors", async (t) => {
  const projectDirectory = await temporaryDirectory(t);
  const adapter = new FakeAdapter();
  adapter.failuresBeforeSuccess = 1;
  const manifest = await generateVoiceManifest(
    config,
    script,
    storyboard,
    projectDirectory,
    path.join(projectDirectory, "runs", "retry"),
    adapter,
  );
  assert.equal(adapter.synthesizeCalls, 2);
  assert.notEqual(manifest.scenes[0]?.status, "FAILED");
});

test("voice generator records a playable silent fallback after final failure", async (t) => {
  const projectDirectory = await temporaryDirectory(t);
  const adapter = new FakeAdapter();
  adapter.failuresBeforeSuccess = 99;
  const manifest = await generateVoiceManifest(
    config,
    script,
    storyboard,
    projectDirectory,
    path.join(projectDirectory, "runs", "failed"),
    adapter,
  );
  assert.equal(adapter.synthesizeCalls, 3);
  assert.equal(manifest.scenes[0]?.status, "FAILED");
  assert.match(manifest.scenes[0]?.warnings[0] ?? "", /silent fallback/);
});

test("voice generator recalibrates TTS rate before module 6 when audio is too short", async (t) => {
  const projectDirectory = await temporaryDirectory(t);
  const adapter = new RateAwareFakeAdapter();
  const durationConfig: PipelineConfig = {
    ...config,
    duration: {
      option: "3-5",
      min_seconds: 18,
      max_seconds: 30,
      target_seconds: 25.5,
    },
  };
  const manifest = await generateVoiceManifest(
    durationConfig,
    script,
    storyboard,
    projectDirectory,
    path.join(projectDirectory, "runs", "duration-calibration"),
    adapter,
  );

  assert.equal(adapter.synthesizeCalls, 2);
  assert.equal(adapter.speakingRates[0], 1);
  assert.ok((adapter.speakingRates[1] ?? 1) < 0.8);
  assert.ok(manifest.total_duration_seconds >= 18);
  assert.ok(manifest.total_duration_seconds <= 30);
});
