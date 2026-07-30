import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  DocumentArtifact,
  ScriptArtifact,
} from "../src/core/contracts.js";
import {
  createStoryboardCacheKey,
  readStoryboardCache,
  rebaseStoryboardAssets,
  writeStoryboardCache,
} from "../src/modules/module4_storyboard_generator/module4-cache.js";
import { buildStoryboard } from "../src/modules/module4_storyboard_generator/storyboard-builder.js";
import type { ChapterStoryboardDecision } from "../src/modules/module4_storyboard_generator/storyboard-types.js";
import { validateStoryboard } from "../src/modules/module4_storyboard_generator/storyboard-validator.js";
import { registeredTemplates } from "../src/modules/module4_storyboard_generator/template-registry.js";

function assets(page: number) {
  return {
    page_image_path: `page-${page}.png`,
    thumbnail_path: `page-${page}-thumb.png`,
    width: 1_000,
    height: 750,
    thumbnail_width: 320,
    thumbnail_height: 240,
  };
}

const document: DocumentArtifact = {
  schema_version: "1.0",
  title: "Processes",
  source_file: "inputs/test.pdf",
  source_sha256: "c".repeat(64),
  source_size_bytes: 2_048,
  language: "en",
  total_pages: 3,
  sources: [
    {
      source_id: "p1_e01",
      page: 1,
      element_type: "TEXT",
      excerpt: "A process is a program in execution.",
      bbox: [0.1, 0.1, 0.8, 0.3],
      confidence: 0.99,
    },
    {
      source_id: "p2_e01",
      page: 2,
      element_type: "IMAGE",
      excerpt: "Process monitor screenshot.",
      confidence: 0.95,
    },
    {
      source_id: "p3_e01",
      page: 3,
      element_type: "DIAGRAM",
      excerpt: "New transitions to Ready, then Running.",
      confidence: 0.98,
    },
  ],
  pages: [1, 2, 3].map((page) => ({
    page,
    summary: `Page ${page}`,
    concepts: ["process"],
    source_ids: [`p${page}_e01`],
    warnings: [],
    assets: assets(page),
  })),
  sections: [
    {
      section_id: "sec_01",
      title: "Processes",
      concepts: ["process"],
      source_ids: ["p1_e01", "p2_e01", "p3_e01"],
    },
  ],
  warnings: [],
};

const script: ScriptArtifact = {
  schema_version: "1.0",
  title: "Processes",
  language: "vi",
  estimated_duration_seconds: 60,
  chapters: [
    {
      chapter_id: "ch_01",
      title: "Processes",
      estimated_duration_seconds: 60,
      learning_objectives: ["Understand a process."],
      objective_coverage: [
        {
          objective_index: 0,
          objective: "Understand a process.",
          narration_ids: ["n02", "n03", "n04", "n05"],
        },
      ],
      narrations: [
        {
          narration_id: "n01",
          kind: "TRANSITION",
          text: "Chào mừng đến với bài học.",
          source_ids: [],
          objective_indices: [],
          estimated_duration_seconds: 8,
        },
        {
          narration_id: "n02",
          kind: "GROUNDED_CLAIM",
          text: "Đây là hình ảnh giám sát tiến trình.",
          source_ids: ["p2_e01"],
          objective_indices: [0],
          estimated_duration_seconds: 10,
        },
        {
          narration_id: "n03",
          kind: "GROUNDED_CLAIM",
          text: "Tiến trình là chương trình đang thực thi.",
          source_ids: ["p1_e01"],
          objective_indices: [0],
          estimated_duration_seconds: 10,
        },
        {
          narration_id: "n04",
          kind: "GROUNDED_CLAIM",
          text: "Tiến trình chuyển từ New sang Ready rồi Running.",
          source_ids: ["p3_e01"],
          objective_indices: [0],
          estimated_duration_seconds: 12,
        },
        {
          narration_id: "n05",
          kind: "GROUNDED_CLAIM",
          text: "Tóm lại, tiến trình có định nghĩa và vòng đời rõ ràng.",
          source_ids: ["p1_e01"],
          objective_indices: [0],
          estimated_duration_seconds: 10,
        },
        {
          narration_id: "n06",
          kind: "LEARNING_CHECK",
          text: "Tiến trình là gì?",
          source_ids: [],
          objective_indices: [0],
          estimated_duration_seconds: 10,
        },
      ],
    },
  ],
  pronunciation_glossary: [],
  validation: {
    grounded_claims: 4,
    ungrounded_claims: [],
    missing_objectives: [],
    semantic_reviewed: true,
    semantic_issues: [],
  },
};

const decision: ChapterStoryboardDecision = {
  routes: [
    {
      narration_id: "n01",
      visual_type: "TITLE",
      source_ids: [],
      heading: "Tiến trình",
      key_points: ["Khái niệm và vòng đời"],
      reason: "Lecture opening",
    },
    {
      narration_id: "n02",
      visual_type: "ORIGINAL_PAGE",
      source_ids: ["p2_e01"],
      heading: "Giám sát tiến trình",
      key_points: ["Quan sát tài nguyên"],
      reason: "Original screenshot is important",
    },
    {
      narration_id: "n03",
      visual_type: "CROP_AND_HIGHLIGHT",
      source_ids: ["p1_e01"],
      heading: "Định nghĩa",
      key_points: ["Chương trình đang thực thi"],
      reason: "Exact element has bbox",
    },
    {
      narration_id: "n04",
      visual_type: "DIAGRAM",
      source_ids: ["p3_e01"],
      heading: "Vòng đời tiến trình",
      key_points: ["New", "Ready", "Running"],
      diagram: {
        nodes: [
          { id: "new", label: "New" },
          { id: "ready", label: "Ready" },
          { id: "running", label: "Running" },
        ],
        edges: [
          { from: "new", to: "ready", label: "" },
          { from: "ready", to: "running", label: "" },
        ],
      },
      reason: "Source contains an explicit state relationship",
    },
    {
      narration_id: "n05",
      visual_type: "SUMMARY",
      source_ids: ["p1_e01"],
      heading: "Tóm tắt",
      key_points: ["Định nghĩa", "Vòng đời"],
      reason: "Grounded recap",
    },
    {
      narration_id: "n06",
      visual_type: "BULLET",
      source_ids: [],
      heading: "Kiểm tra nhanh",
      key_points: ["Tiến trình là gì?"],
      reason: "Learning check",
    },
  ],
};

function build(customDecision = decision) {
  return buildStoryboard(
    document,
    script,
    new Map([["ch_01", customDecision]]),
  );
}

test("registry exposes all six fixed visual templates", () => {
  assert.deepEqual(
    registeredTemplates().map((entry) => entry.type),
    [
      "TITLE",
      "ORIGINAL_PAGE",
      "CROP_AND_HIGHLIGHT",
      "BULLET",
      "DIAGRAM",
      "SUMMARY",
    ],
  );
});

test("builds and validates one scene per narration with asset plans", () => {
  const storyboard = build();
  assert.doesNotThrow(() =>
    validateStoryboard(storyboard, document, script),
  );
  assert.equal(storyboard.scenes.length, 6);
  assert.equal(storyboard.validation.duration_delta_seconds, 0);
  assert.equal(storyboard.scenes[1]?.asset_plan.mode, "PAGE_IMAGE");
  assert.equal(storyboard.scenes[2]?.asset_plan.mode, "SOURCE_CROP");
  assert.equal(storyboard.scenes[3]?.visual.type, "DIAGRAM");
});

test("falls back from crop to original page when bbox is unavailable", () => {
  const fallbackDecision: ChapterStoryboardDecision = {
    routes: decision.routes.map((route) =>
      route.narration_id === "n02"
        ? { ...route, visual_type: "CROP_AND_HIGHLIGHT" as const }
        : route,
    ),
  };
  const storyboard = build(fallbackDecision);
  const scene = storyboard.scenes.find(
    (candidate) => candidate.narration_id === "n02",
  );
  assert.equal(scene?.visual.type, "ORIGINAL_PAGE");
  assert.match(scene?.warnings[0] ?? "", /bounding box/);
  assert.doesNotThrow(() =>
    validateStoryboard(storyboard, document, script),
  );
});

test("rejects unsupported template props", () => {
  const storyboard = build();
  const scene = storyboard.scenes[0]!;
  scene.visual.props = { ...scene.visual.props, animationCode: "evil()" };
  assert.throws(
    () => validateStoryboard(storyboard, document, script),
    /props không hợp lệ/,
  );
});

test("rejects a missing narration scene", () => {
  const storyboard = build();
  storyboard.scenes = storyboard.scenes.slice(1);
  assert.throws(
    () => validateStoryboard(storyboard, document, script),
    /Narration thiếu scene/,
  );
});

test("rejects visual source outside the narration", () => {
  const storyboard = build();
  const scene = storyboard.scenes.find(
    (candidate) => candidate.narration_id === "n03",
  )!;
  scene.visual.source_ids = ["p2_e01"];
  assert.throws(
    () => validateStoryboard(storyboard, document, script),
    /không thuộc narration/,
  );
});

test("writes and reads a validated storyboard cache", async (t) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-module4-"),
  );
  t.after(async () => {
    const resolved = path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const storyboard = build();
  const key = createStoryboardCacheKey(document, script, "gemini-test");
  assert.equal(
    await readStoryboardCache(directory, key, document, script),
    null,
  );
  await writeStoryboardCache(directory, key, storyboard);
  assert.deepEqual(
    await readStoryboardCache(directory, key, document, script),
    storyboard,
  );
});

test("rebases cached page assets to the current run directory", () => {
  const storyboard = build();
  const currentDocument: DocumentArtifact = {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      assets: {
        ...page.assets,
        page_image_path: `runs/current/page-${page.page}.png`,
        thumbnail_path: `runs/current/page-${page.page}-thumb.png`,
      },
    })),
  };
  const rebased = rebaseStoryboardAssets(storyboard, currentDocument);
  const originalPageScene = rebased.scenes.find(
    (scene) => scene.visual.type === "ORIGINAL_PAGE",
  )!;
  assert.match(
    String(originalPageScene.visual.props.image_path),
    /^runs\/current\//,
  );
  assert.match(
    originalPageScene.asset_plan.source_path ?? "",
    /^runs\/current\//,
  );
  assert.doesNotThrow(() =>
    validateStoryboard(rebased, currentDocument, script),
  );
});
