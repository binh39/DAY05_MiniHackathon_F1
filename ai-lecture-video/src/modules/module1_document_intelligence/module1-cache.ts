import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PipelineConfig } from "../../core/config.js";
import {
  analysisSchema,
  type DocumentAnalysis,
} from "./gemini-document-analyzer.js";
import type { ValidatedPdf } from "./pdf-validator.js";

const PROMPT_VERSION = "module1-v2";

export function createAnalysisCacheKey(
  pdf: ValidatedPdf,
  config: PipelineConfig,
  model: string,
): string {
  const identity = JSON.stringify({
    source_sha256: pdf.sha256,
    model,
    prompt_version: PROMPT_VERSION,
    language: config.language,
    audience: config.audience,
    detail_level: config.detail_level,
  });
  return createHash("sha256").update(identity).digest("hex");
}

function cachePath(projectDirectory: string, cacheKey: string): string {
  return path.join(
    projectDirectory,
    ".cache",
    "module1-analysis",
    `${cacheKey}.json`,
  );
}

export async function readAnalysisCache(
  projectDirectory: string,
  cacheKey: string,
): Promise<DocumentAnalysis | null> {
  try {
    const raw = await readFile(cachePath(projectDirectory, cacheKey), "utf8");
    return analysisSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeAnalysisCache(
  projectDirectory: string,
  cacheKey: string,
  analysis: DocumentAnalysis,
): Promise<void> {
  const outputPath = cachePath(projectDirectory, cacheKey);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
}
