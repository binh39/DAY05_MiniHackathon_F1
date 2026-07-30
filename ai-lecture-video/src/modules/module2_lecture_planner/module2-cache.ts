import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PipelineConfig } from "../../core/config.js";
import {
  lecturePlanSchema,
  type DocumentArtifact,
  type LecturePlanArtifact,
} from "../../core/contracts.js";
import { validateLecturePlan } from "./coverage-validator.js";

const PROMPT_VERSION = "module2-v2-duration-contract";

function documentPlanningHash(document: DocumentArtifact): string {
  const planningInput = {
    title: document.title,
    language: document.language,
    total_pages: document.total_pages,
    sources: document.sources,
    pages: document.pages.map(({ assets: _assets, ...page }) => page),
    sections: document.sections,
    warnings: document.warnings,
  };
  return createHash("sha256")
    .update(JSON.stringify(planningInput))
    .digest("hex");
}

export function createPlanCacheKey(
  document: DocumentArtifact,
  config: PipelineConfig,
  model: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        document_hash: documentPlanningHash(document),
        model,
        prompt_version: PROMPT_VERSION,
        coverage_mode: config.coverage_mode,
        audience: config.audience,
        language: config.language,
        detail_level: config.detail_level,
        max_chapter_minutes: config.max_chapter_minutes,
        duration: config.duration,
      }),
    )
    .digest("hex");
}

function planCachePath(projectDirectory: string, cacheKey: string): string {
  return path.join(
    projectDirectory,
    ".cache",
    "module2-plan",
    `${cacheKey}.json`,
  );
}

export async function readPlanCache(
  projectDirectory: string,
  cacheKey: string,
  document: DocumentArtifact,
  config: PipelineConfig,
): Promise<LecturePlanArtifact | null> {
  try {
    const raw = await readFile(
      planCachePath(projectDirectory, cacheKey),
      "utf8",
    );
    const plan = lecturePlanSchema.parse(JSON.parse(raw));
    validateLecturePlan(plan, document, config);
    return plan;
  } catch {
    return null;
  }
}

export async function writePlanCache(
  projectDirectory: string,
  cacheKey: string,
  plan: LecturePlanArtifact,
): Promise<void> {
  const outputPath = planCachePath(projectDirectory, cacheKey);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}
