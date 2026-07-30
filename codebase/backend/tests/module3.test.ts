import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PipelineConfig } from "../src/core/config.js";
import type {
  DocumentArtifact,
  LecturePlanArtifact,
} from "../src/core/contracts.js";
import { validateScript } from "../src/modules/module3_script_generator/grounding-validator.js";
import {
  createScriptCacheKey,
  readScriptCache,
  writeScriptCache,
} from "../src/modules/module3_script_generator/module3-cache.js";
import { buildScriptArtifact } from "../src/modules/module3_script_generator/script-builder.js";
import type { ChapterScriptDecision } from "../src/modules/module3_script_generator/script-types.js";

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
  title: "Process",
  source_file: "inputs/test.pdf",
  source_sha256: "b".repeat(64),
  source_size_bytes: 1_024,
  language: "en",
  total_pages: 2,
  sources: [
    {
      source_id: "p1_e01",
      page: 1,
      element_type: "TEXT",
      excerpt: "A process is a program in execution.",
      confidence: 0.99,
    },
    {
      source_id: "p2_e01",
      page: 2,
      element_type: "CODE",
      excerpt: "pid_t pid = fork();",
      confidence: 0.99,
    },
  ],
  pages: [
    {
      page: 1,
      summary: "Process definition",
      concepts: ["process"],
      source_ids: ["p1_e01"],
      warnings: [],
      assets: {
        page_image_path: "page-1.png",
        thumbnail_path: "page-1-thumb.png",
        width: 100,
        height: 100,
        thumbnail_width: 50,
        thumbnail_height: 50,
      },
    },
    {
      page: 2,
      summary: "Fork code",
      concepts: ["fork"],
      source_ids: ["p2_e01"],
      warnings: [],
      assets: {
        page_image_path: "page-2.png",
        thumbnail_path: "page-2-thumb.png",
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
      title: "Process",
      concepts: ["process", "fork"],
      source_ids: ["p1_e01", "p2_e01"],
    },
  ],
  warnings: [],
};

const lecturePlan: LecturePlanArtifact = {
  schema_version: "1.0",
  title: "Process",
  coverage_mode: "FULL",
  audience: "beginner",
  language: "vi",
  estimated_duration_seconds: 100,
  learning_objectives: ["Understand processes."],
  chapters: [
    {
      chapter_id: "ch_01",
      title: "Process and fork",
      learning_objectives: [
        "Define a process.",
        "Recognize fork code.",
      ],
      duration_seconds: 100,
      source_ids: ["p1_e01", "p2_e01"],
      page_numbers: [1, 2],
      items: [
        {
          item_id: "item_01",
          title: "Process",
          treatment: "EXPLAIN",
          reason: "Core concept",
          source_ids: ["p1_e01"],
          page_numbers: [1],
          estimated_narration_words: 90,
          duration_seconds: 44,
        },
        {
          item_id: "item_02",
          title: "Fork",
          treatment: "EXPLAIN",
          reason: "Code example",
          source_ids: ["p2_e01"],
          page_numbers: [2],
          estimated_narration_words: 155,
          duration_seconds: 75,
        },
      ],
    },
  ],
  coverage: {
    total_pages: 2,
    total_sources: 2,
    accounted_pages: [1, 2],
    accounted_source_ids: ["p1_e01", "p2_e01"],
    covered_pages: [1, 2],
    reference_pages: [],
    unreadable_pages: [],
    duplicate_pages: [],
    coverage_rate: 1,
  },
  warnings: [],
};

const validDecision: ChapterScriptDecision = {
  narrations: [
    {
      narration_id: "ch_01_n01",
      item_id: "item_01",
      kind: "GROUNDED_CLAIM",
      text: "Tiến trình là một chương trình đang được thực thi.",
      source_ids: ["p1_e01"],
      objective_indices: [0],
    },
    {
      narration_id: "ch_01_n02",
      item_id: "item_02",
      kind: "GROUNDED_CLAIM",
      text: "Đoạn mã gọi hàm fork để tạo tiến trình.",
      source_ids: ["p2_e01"],
      objective_indices: [1],
    },
    {
      narration_id: "ch_01_n03",
      kind: "TEACHING_ANALOGY",
      text: "Hãy hình dung fork giống như tạo một bản sao để cùng làm việc.",
      source_ids: [],
      objective_indices: [1],
    },
    {
      narration_id: "ch_01_n04",
      kind: "EXAMPLE",
      text: "Ví dụ, chương trình cha có thể đợi tiến trình con hoàn thành.",
      source_ids: [],
      objective_indices: [1],
    },
    {
      narration_id: "ch_01_n05",
      kind: "TRANSITION",
      text: "Bây giờ, chúng ta kiểm tra lại hai ý chính.",
      source_ids: [],
      objective_indices: [],
    },
    {
      narration_id: "ch_01_n06",
      kind: "LEARNING_CHECK",
      text: "Tiến trình khác chương trình ở điểm nào, và fork dùng để làm gì?",
      source_ids: [],
      objective_indices: [0, 1],
    },
  ],
  pronunciation_glossary: [
    {
      term: "fork",
      pronunciation: "phoóc",
      meaning: "Hàm tạo tiến trình mới",
      source_ids: ["p2_e01"],
    },
  ],
};

function build(decision = validDecision) {
  return buildScriptArtifact(
    "Process",
    "vi",
    lecturePlan,
    new Map([["ch_01", decision]]),
    { issues: [] },
  );
}

test("builds a grounded script with objective coverage and glossary", () => {
  const script = build();
  assert.doesNotThrow(() =>
    validateScript(script, document, lecturePlan),
  );
  assert.equal(script.validation.grounded_claims, 2);
  assert.equal(script.validation.semantic_reviewed, true);
  assert.equal(script.validation.missing_objectives.length, 0);
  assert.equal(script.pronunciation_glossary[0]?.term, "fork");
  assert.ok(script.estimated_duration_seconds > 0);
});

test("rejects a grounded claim without a source", () => {
  const invalid: ChapterScriptDecision = {
    ...validDecision,
    narrations: validDecision.narrations.map((narration) =>
      narration.narration_id === "ch_01_n01"
        ? { ...narration, source_ids: [] }
        : narration,
    ),
  };
  assert.throws(
    () => validateScript(build(invalid), document, lecturePlan),
    /GROUNDED_CLAIM nhưng thiếu source/,
  );
});

test("detects a valid document source cited from the wrong chapter element", () => {
  const externalDocument: DocumentArtifact = {
    ...document,
    total_pages: 3,
    sources: [
      ...document.sources,
      {
        source_id: "p3_e01",
        page: 3,
        element_type: "TEXT",
        excerpt: "Scheduling",
        confidence: 0.99,
      },
    ],
  };
  const invalid: ChapterScriptDecision = {
    ...validDecision,
    narrations: validDecision.narrations.map((narration) =>
      narration.narration_id === "ch_01_n01"
        ? { ...narration, source_ids: ["p3_e01"] }
        : narration,
    ),
  };
  assert.throws(
    () =>
      validateScript(build(invalid), externalDocument, lecturePlan),
    /sai element\/chapter/,
  );
});

test("rejects missing learning objective coverage", () => {
  const invalid: ChapterScriptDecision = {
    ...validDecision,
    narrations: validDecision.narrations.map((narration) => ({
      ...narration,
      objective_indices: narration.objective_indices.filter(
        (index) => index !== 1,
      ),
    })),
  };
  assert.throws(
    () => validateScript(build(invalid), document, lecturePlan),
    /Learning objectives chưa được phủ/,
  );
});

test("rejects semantic contradiction issues", () => {
  const script = buildScriptArtifact(
    "Process",
    "vi",
    lecturePlan,
    new Map([["ch_01", validDecision]]),
    {
      issues: [
        {
          narration_id: "ch_01_n01",
          issue_type: "CONTRADICTION",
          explanation: "Claim reverses the definition.",
        },
      ],
    },
  );
  assert.throws(
    () => validateScript(script, document, lecturePlan),
    /CONTRADICTION/,
  );
});

test("rejects narration longer than the planned chapter duration", () => {
  const longText = Array.from(
    { length: 50 },
    () => "nội dung",
  ).join(" ");
  const invalid: ChapterScriptDecision = {
    ...validDecision,
    narrations: validDecision.narrations.map((narration) => ({
      ...narration,
      text: longText,
    })),
  };
  assert.throws(
    () => validateScript(build(invalid), document, lecturePlan),
    /vượt duration plan/,
  );
});

test("writes and reads a validated script cache", async (t) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-module3-"),
  );
  t.after(async () => {
    const resolved = path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const script = build();
  const key = createScriptCacheKey(
    document,
    lecturePlan,
    config,
    "gemini-test",
  );
  assert.equal(
    await readScriptCache(directory, key, document, lecturePlan),
    null,
  );
  await writeScriptCache(directory, key, script);
  assert.deepEqual(
    await readScriptCache(directory, key, document, lecturePlan),
    script,
  );
});
