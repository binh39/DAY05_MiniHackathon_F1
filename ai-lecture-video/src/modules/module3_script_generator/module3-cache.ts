import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PipelineConfig } from "../../core/config.js";
import {
  scriptSchema,
  type DocumentArtifact,
  type LecturePlanArtifact,
  type ScriptArtifact,
} from "../../core/contracts.js";
import { validateScript } from "./grounding-validator.js";

const PROMPT_VERSION = "module3-v3-duration-contract";

export function createScriptCacheKey(
  document: DocumentArtifact,
  lecturePlan: LecturePlanArtifact,
  config: PipelineConfig,
  model: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        document_sha256: document.source_sha256,
        document_sources: document.sources,
        lecture_plan: lecturePlan,
        language: config.language,
        audience: config.audience,
        detail_level: config.detail_level,
        duration: config.duration,
        model,
        prompt_version: PROMPT_VERSION,
      }),
    )
    .digest("hex");
}

function cachePath(projectDirectory: string, cacheKey: string): string {
  return path.join(
    projectDirectory,
    ".cache",
    "module3-script",
    `${cacheKey}.json`,
  );
}

export async function readScriptCache(
  projectDirectory: string,
  cacheKey: string,
  document: DocumentArtifact,
  lecturePlan: LecturePlanArtifact,
): Promise<ScriptArtifact | null> {
  try {
    const raw = await readFile(cachePath(projectDirectory, cacheKey), "utf8");
    const script = scriptSchema.parse(JSON.parse(raw));
    validateScript(script, document, lecturePlan);
    return script;
  } catch {
    return null;
  }
}

export async function writeScriptCache(
  projectDirectory: string,
  cacheKey: string,
  script: ScriptArtifact,
): Promise<void> {
  const outputPath = cachePath(projectDirectory, cacheKey);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(script, null, 2)}\n`, "utf8");
}
