import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PipelineConfig } from "../src/core/config.js";
import {
  canonicalizeSourceId,
  normalizeAnalysisReferences,
  type DocumentAnalysis,
} from "../src/modules/module1_document_intelligence/gemini-document-analyzer.js";
import {
  createAnalysisCacheKey,
  readAnalysisCache,
  writeAnalysisCache,
} from "../src/modules/module1_document_intelligence/module1-cache.js";
import { renderPdfPages } from "../src/modules/module1_document_intelligence/page-renderer.js";
import { validatePdf } from "../src/modules/module1_document_intelligence/pdf-validator.js";

function config(inputPdf: string, maxPages = 80): PipelineConfig {
  return {
    input_pdf: inputPdf,
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
      max_pdf_pages: maxPages,
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
}

async function temporaryProject(t: test.TestContext): Promise<string> {
  const projectDirectory = await mkdtemp(
    path.join(os.tmpdir(), "ai-lecture-video-test-"),
  );
  t.after(async () => {
    const resolved = path.resolve(projectDirectory);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  await mkdir(path.join(projectDirectory, "inputs"), { recursive: true });
  return projectDirectory;
}

async function createPdf(
  outputPath: string,
  pageCount: number,
): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([400, 300]);
    page.drawText(`Test page ${index + 1}`, {
      x: 40,
      y: 240,
      size: 20,
      font,
    });
  }
  await writeFile(outputPath, await pdf.save());
}

const sampleAnalysis: DocumentAnalysis = {
  title: "Sample",
  language: "en",
  sources: [
    {
      source_id: "p1_e01",
      page: 1,
      element_type: "TEXT",
      excerpt: "Test page",
      confidence: 0.99,
    },
  ],
  pages: [
    {
      page: 1,
      summary: "A test page.",
      concepts: ["testing"],
      source_ids: ["p1_e01"],
      warnings: [],
    },
  ],
  sections: [
    {
      section_id: "sec_01",
      title: "Testing",
      concepts: ["testing"],
      source_ids: ["p1_e01"],
    },
  ],
  warnings: [],
};

test("validates PDF, counts pages and computes SHA-256", async (t) => {
  const projectDirectory = await temporaryProject(t);
  const inputPath = path.join(projectDirectory, "inputs", "valid.pdf");
  await createPdf(inputPath, 2);

  const result = await validatePdf(
    config("inputs/valid.pdf"),
    projectDirectory,
  );

  assert.equal(result.pageCount, 2);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.ok(result.sizeBytes > 0);
});

test("rejects a file without PDF magic bytes", async (t) => {
  const projectDirectory = await temporaryProject(t);
  await writeFile(
    path.join(projectDirectory, "inputs", "invalid.pdf"),
    "not a pdf",
    "utf8",
  );

  await assert.rejects(
    validatePdf(config("inputs/invalid.pdf"), projectDirectory),
    /magic bytes/,
  );
});

test("rejects a PDF over the configured page limit", async (t) => {
  const projectDirectory = await temporaryProject(t);
  const inputPath = path.join(projectDirectory, "inputs", "too-many.pdf");
  await createPdf(inputPath, 2);

  await assert.rejects(
    validatePdf(config("inputs/too-many.pdf", 1), projectDirectory),
    /vượt giới hạn 1 trang/,
  );
});

test("normalizes source IDs before consistency validation", () => {
  assert.equal(canonicalizeSourceId("p016_e2"), "p16_e02");
  const normalized = normalizeAnalysisReferences({
    ...sampleAnalysis,
    sources: [{ ...sampleAnalysis.sources[0]!, source_id: "p01_e1" }],
    pages: [{ ...sampleAnalysis.pages[0]!, source_ids: ["p1_e01"] }],
  });
  assert.equal(normalized.sources[0]?.source_id, "p1_e01");
  assert.equal(normalized.pages[0]?.source_ids[0], "p1_e01");
});

test("writes and reads validated document analysis cache", async (t) => {
  const projectDirectory = await temporaryProject(t);
  const inputPath = path.join(projectDirectory, "inputs", "cached.pdf");
  await createPdf(inputPath, 1);
  const pdf = await validatePdf(config("inputs/cached.pdf"), projectDirectory);
  const cacheKey = createAnalysisCacheKey(
    pdf,
    config("inputs/cached.pdf"),
    "gemini-test",
  );

  assert.equal(await readAnalysisCache(projectDirectory, cacheKey), null);
  await writeAnalysisCache(projectDirectory, cacheKey, sampleAnalysis);
  assert.deepEqual(
    await readAnalysisCache(projectDirectory, cacheKey),
    sampleAnalysis,
  );
});

test("renders full page images and thumbnails with cache reuse", async (t) => {
  const projectDirectory = await temporaryProject(t);
  const inputPath = path.join(projectDirectory, "inputs", "render.pdf");
  const runDirectory = path.join(projectDirectory, "runs", "run-1");
  await createPdf(inputPath, 1);
  const pdf = await validatePdf(config("inputs/render.pdf"), projectDirectory);

  const first = await renderPdfPages(pdf, projectDirectory, runDirectory);
  assert.equal(first.length, 1);
  assert.ok(first[0]!.width > first[0]!.thumbnail_width);
  await access(path.join(projectDirectory, first[0]!.page_image_path));
  await access(path.join(projectDirectory, first[0]!.thumbnail_path));

  const secondRunDirectory = path.join(projectDirectory, "runs", "run-2");
  const second = await renderPdfPages(
    pdf,
    projectDirectory,
    secondRunDirectory,
  );
  assert.equal(second.length, 1);
  await access(path.join(projectDirectory, second[0]!.page_image_path));
});
