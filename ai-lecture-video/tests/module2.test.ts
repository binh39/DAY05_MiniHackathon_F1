import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PipelineConfig } from "../src/core/config.js";
import type { DocumentArtifact } from "../src/core/contracts.js";
import { validateLecturePlan } from "../src/modules/module2_lecture_planner/coverage-validator.js";
import { buildLecturePlan } from "../src/modules/module2_lecture_planner/duration-estimator.js";
import {
  createPlanCacheKey,
  readPlanCache,
  writePlanCache,
} from "../src/modules/module2_lecture_planner/module2-cache.js";
import type { PlannerDecision } from "../src/modules/module2_lecture_planner/planner-types.js";

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
  limits: {
    max_pdf_megabytes: 50,
    max_pdf_pages: 80,
  },
  voice: {
    provider: "google",
    voice_id: "vi-VN-Neural2-A",
    speaking_rate: 1,
  },
  render: {
    width: 1920,
    height: 1080,
    fps: 30,
  },
};

function pageAssets(page: number) {
  return {
    page_image_path: `runs/test/page-${page}.png`,
    thumbnail_path: `runs/test/page-${page}-thumb.png`,
    width: 1_188,
    height: 918,
    thumbnail_width: 320,
    thumbnail_height: 248,
  };
}

const document: DocumentArtifact = {
  schema_version: "1.0",
  title: "Test lecture",
  source_file: "inputs/test.pdf",
  source_sha256: "a".repeat(64),
  source_size_bytes: 1_024,
  language: "en",
  total_pages: 3,
  sources: [
    {
      source_id: "p1_e01",
      page: 1,
      element_type: "TEXT",
      excerpt: "Cover",
      confidence: 0.99,
    },
    {
      source_id: "p2_e01",
      page: 2,
      element_type: "DIAGRAM",
      excerpt: "Process diagram",
      confidence: 0.95,
    },
    {
      source_id: "p3_e01",
      page: 3,
      element_type: "CODE",
      excerpt: "fork() example",
      confidence: 0.95,
    },
  ],
  pages: [
    {
      page: 1,
      summary: "Cover",
      concepts: [],
      source_ids: ["p1_e01"],
      warnings: [],
      assets: pageAssets(1),
    },
    {
      page: 2,
      summary: "Diagram",
      concepts: ["process"],
      source_ids: ["p2_e01"],
      warnings: [],
      assets: pageAssets(2),
    },
    {
      page: 3,
      summary: "Code",
      concepts: ["fork"],
      source_ids: ["p3_e01"],
      warnings: [],
      assets: pageAssets(3),
    },
  ],
  sections: [
    {
      section_id: "sec_01",
      title: "Processes",
      concepts: ["process", "fork"],
      source_ids: ["p1_e01", "p2_e01", "p3_e01"],
    },
  ],
  warnings: [],
};

const validDecision: PlannerDecision = {
  title: "Processes",
  learning_objectives: ["Explain a process and a fork example."],
  chapters: [
    {
      chapter_id: "ch_01",
      title: "Process concept",
      learning_objectives: ["Understand the process diagram."],
      items: [
        {
          item_id: "item_01",
          title: "Course reference",
          treatment: "REFERENCE",
          reason: "Cover page.",
          source_ids: ["p1_e01"],
        },
        {
          item_id: "item_02",
          title: "Process diagram",
          treatment: "EXPLAIN",
          reason: "Core concept.",
          source_ids: ["p2_e01"],
        },
      ],
    },
    {
      chapter_id: "ch_02",
      title: "Fork example",
      learning_objectives: ["Inspect a fork example."],
      items: [
        {
          item_id: "item_03",
          title: "Fork code",
          treatment: "SHOW",
          reason: "Code must be inspected.",
          source_ids: ["p3_e01"],
        },
      ],
    },
  ],
};

async function temporaryDirectory(t: test.TestContext): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-module2-"),
  );
  t.after(async () => {
    const resolved = path.resolve(directory);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  return directory;
}

test("builds deterministic duration and full source coverage", () => {
  const plan = buildLecturePlan(validDecision, document, config);
  validateLecturePlan(plan, document, config);
  assert.equal(plan.estimated_duration_seconds, config.duration.target_seconds);

  assert.equal(plan.coverage.coverage_rate, 1);
  assert.deepEqual(plan.coverage.accounted_pages, [1, 2, 3]);
  assert.deepEqual(plan.coverage.reference_pages, [1]);
  assert.deepEqual(plan.coverage.covered_pages, [2, 3]);
  assert.equal(
    plan.estimated_duration_seconds,
    plan.chapters.reduce(
      (total, chapter) => total + chapter.duration_seconds,
      0,
    ),
  );
});

test("rejects a plan that omits a source in FULL mode", () => {
  const incomplete: PlannerDecision = {
    ...validDecision,
    chapters: validDecision.chapters.map((chapter) => ({
      ...chapter,
      items: chapter.items.filter((item) => item.item_id !== "item_02"),
    })),
  };
  const plan = buildLecturePlan(incomplete, document, config);

  assert.throws(
    () => validateLecturePlan(plan, document, config),
    /Thiếu source: p2_e01/,
  );
});

test("rejects CODE sources that are not explained or shown", () => {
  const invalidCodeTreatment: PlannerDecision = {
    ...validDecision,
    chapters: validDecision.chapters.map((chapter) => ({
      ...chapter,
      items: chapter.items.map((item) =>
        item.item_id === "item_03"
          ? { ...item, treatment: "MENTION" as const }
          : item,
      ),
    })),
  };
  const plan = buildLecturePlan(invalidCodeTreatment, document, config);

  assert.throws(
    () => validateLecturePlan(plan, document, config),
    /CODE source p3_e01 phải EXPLAIN hoặc SHOW/,
  );
});

test("rejects chapters over the configured maximum duration", () => {
  const plan = buildLecturePlan(validDecision, document, {
    ...config,
    max_chapter_minutes: 0.5,
  });

  assert.throws(
    () =>
      validateLecturePlan(plan, document, {
        ...config,
        max_chapter_minutes: 0.5,
      }),
    /vượt giới hạn 30s/,
  );
});

test("classifies unreadable and duplicate sources in the coverage manifest", () => {
  const classifiedDecision: PlannerDecision = {
    ...validDecision,
    chapters: validDecision.chapters.map((chapter) => ({
      ...chapter,
      items: chapter.items.map((item) => {
        if (item.item_id === "item_01") {
          return {
            ...item,
            treatment: "DUPLICATE" as const,
            reason: "The cover repeats metadata already captured elsewhere.",
          };
        }
        if (item.item_id === "item_02") {
          return {
            ...item,
            treatment: "UNREADABLE" as const,
            reason: "The diagram labels cannot be read reliably.",
          };
        }
        return item;
      }),
    })),
  };
  const plan = buildLecturePlan(classifiedDecision, document, config);

  validateLecturePlan(plan, document, config);
  assert.deepEqual(plan.coverage.duplicate_pages, [1]);
  assert.deepEqual(plan.coverage.unreadable_pages, [2]);
  assert.deepEqual(plan.coverage.covered_pages, [3]);
  assert.equal(plan.coverage.coverage_rate, 1);
});

test("writes and reads a validated plan cache", async (t) => {
  const projectDirectory = await temporaryDirectory(t);
  const plan = buildLecturePlan(validDecision, document, config);
  const cacheKey = createPlanCacheKey(
    document,
    config,
    "gemini-planner-test",
  );

  assert.equal(
    await readPlanCache(
      projectDirectory,
      cacheKey,
      document,
      config,
    ),
    null,
  );
  await writePlanCache(projectDirectory, cacheKey, plan);
  assert.deepEqual(
    await readPlanCache(
      projectDirectory,
      cacheKey,
      document,
      config,
    ),
    plan,
  );
});

test("validates numeric page order beyond page 9", () => {
  const expandedDocument: DocumentArtifact = {
    ...document,
    total_pages: 10,
    sources: [
      ...document.sources,
      ...Array.from({ length: 7 }, (_, index) => {
        const page = index + 4;
        return {
          source_id: `p${page}_e01`,
          page,
          element_type: "TEXT" as const,
          excerpt: `Page ${page}`,
          confidence: 0.99,
        };
      }),
    ],
    pages: [
      ...document.pages,
      ...Array.from({ length: 7 }, (_, index) => {
        const page = index + 4;
        return {
          page,
          summary: `Page ${page}`,
          concepts: [],
          source_ids: [`p${page}_e01`],
          warnings: [],
          assets: pageAssets(page),
        };
      }),
    ],
    sections: [
      {
        ...document.sections[0]!,
        source_ids: [
          ...document.sections[0]!.source_ids,
          ...Array.from({ length: 7 }, (_, index) => `p${index + 4}_e01`),
        ],
      },
    ],
  };
  const expandedDecision: PlannerDecision = {
    ...validDecision,
    chapters: [
      ...validDecision.chapters,
      {
        chapter_id: "ch_03",
        title: "Additional pages",
        learning_objectives: ["Account for pages four through ten."],
        items: [
          {
            item_id: "item_04",
            title: "Additional references",
            treatment: "MENTION",
            reason: "Regression fixture for numeric page sorting.",
            source_ids: Array.from(
              { length: 7 },
              (_, index) => `p${index + 4}_e01`,
            ),
          },
        ],
      },
    ],
  };
  const plan = buildLecturePlan(expandedDecision, expandedDocument, config);

  assert.doesNotThrow(() =>
    validateLecturePlan(plan, expandedDocument, config),
  );
  assert.deepEqual(plan.chapters[2]?.page_numbers, [4, 5, 6, 7, 8, 9, 10]);
});
