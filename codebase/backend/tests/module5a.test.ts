import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PipelineConfig } from "../src/core/config.js";
import type {
  DocumentArtifact,
  StoryboardArtifact,
} from "../src/core/contracts.js";
import {
  contrastRatio,
  inspectSceneLayout,
  SAFE_AREA_PIXELS,
} from "../src/modules/module5a_visual_generator/layout-qa.js";
import {
  createVisualCacheKey,
  writeVisualCache,
} from "../src/modules/module5a_visual_generator/visual-cache.js";
import { generateVisualManifest } from "../src/modules/module5a_visual_generator/visual-generator.js";

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

const document: DocumentArtifact = {
  schema_version: "1.0",
  title: "Test",
  source_file: "test.pdf",
  source_sha256: "d".repeat(64),
  source_size_bytes: 100,
  language: "vi",
  total_pages: 1,
  sources: [
    {
      source_id: "p1_e01",
      page: 1,
      element_type: "TEXT",
      excerpt: "Test",
      confidence: 1,
    },
  ],
  pages: [
    {
      page: 1,
      summary: "Test",
      concepts: ["test"],
      source_ids: ["p1_e01"],
      warnings: [],
      assets: {
        page_image_path: "runs/old/page-1.png",
        thumbnail_path: "runs/old/page-1-thumb.png",
        width: 100,
        height: 100,
        thumbnail_width: 50,
        thumbnail_height: 50,
      },
    },
  ],
  sections: [
    {
      section_id: "sec_01",
      title: "Test",
      concepts: ["test"],
      source_ids: ["p1_e01"],
    },
  ],
  warnings: [],
};

const storyboard: StoryboardArtifact = {
  schema_version: "1.0",
  title: "Test",
  language: "vi",
  estimated_duration_seconds: 5,
  scenes: [
    {
      scene_id: "scene_0001",
      chapter_id: "ch_01",
      narration_id: "n01",
      narration: "Chào mừng đến với bài học.",
      visual: {
        type: "TITLE",
        source_ids: [],
        template: "title-card-v1",
        props: {
          title: "Bài học thử nghiệm",
          subtitle: "Hiển thị tiếng Việt",
          chapter_label: "Chương 1",
        },
      },
      asset_plan: {
        mode: "GENERATED_LAYOUT",
        instructions: ["Render title"],
      },
      fallback: {
        visual_type: "BULLET",
        reason: "Fallback",
      },
      warnings: [],
      estimated_duration_seconds: 5,
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

async function temporaryDirectory(t: test.TestContext): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-module5a-"),
  );
  t.after(async () => {
    const resolved = path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  return directory;
}

test("theme contrast and safe area meet the visual quality bar", () => {
  assert.ok(contrastRatio("#f7fbff", "#071226") >= 4.5);
  assert.ok(SAFE_AREA_PIXELS >= 64);
});

test("layout QA warns about oversized text blocks", () => {
  const scene = structuredClone(storyboard.scenes[0]!);
  scene.visual.props.subtitle = "x".repeat(181);
  assert.match(inspectSceneLayout(scene).join(" "), /180 ký tự/);
});

test("visual cache key ignores run-specific image paths", () => {
  const scene = structuredClone(storyboard.scenes[0]!);
  scene.visual.type = "ORIGINAL_PAGE";
  scene.visual.template = "original-page-v1";
  scene.visual.source_ids = ["p1_e01"];
  scene.visual.props = {
    page: 1,
    image_path: "runs/one/page-1.png",
    caption: "Test",
    fit: "contain",
  };
  const moved = structuredClone(scene);
  moved.visual.props.image_path = "runs/two/page-1.png";
  assert.equal(
    createVisualCacheKey(scene, document, 1920, 1080),
    createVisualCacheKey(moved, document, 1920, 1080),
  );
  assert.notEqual(
    createVisualCacheKey(scene, document, 1920, 1080, "modern_minimal"),
    createVisualCacheKey(scene, document, 1920, 1080, "academic"),
  );
});

test("builds a visual manifest entirely from validated scene cache", async (t) => {
  const projectDirectory = await temporaryDirectory(t);
  const runDirectory = path.join(projectDirectory, "runs", "test-run");
  const sourcePng = path.join(projectDirectory, "source.png");
  const png = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
  ]);
  await writeFile(sourcePng, png);
  const key = createVisualCacheKey(
    storyboard.scenes[0]!,
    document,
    1920,
    1080,
  );
  const sha = createHash("sha256").update(png).digest("hex");
  await writeVisualCache(projectDirectory, key, sourcePng, {
    status: "READY",
    warnings: [],
    asset_sha256: sha,
  });

  const manifest = await generateVisualManifest(
    config,
    document,
    storyboard,
    projectDirectory,
    runDirectory,
  );
  assert.equal(manifest.total_scenes, 1);
  assert.equal(manifest.scenes[0]?.status, "READY");
  assert.equal(manifest.scenes[0]?.asset_sha256, sha);
  assert.match(manifest.scenes[0]?.asset_path ?? "", /scene_0001\.png$/);
});
