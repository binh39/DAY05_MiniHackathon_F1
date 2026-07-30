import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  storyboardSchema,
  type DocumentArtifact,
  type ScriptArtifact,
  type StoryboardArtifact,
} from "../../core/contracts.js";
import { validateStoryboard } from "./storyboard-validator.js";

const PROMPT_VERSION = "module4-v2";

export function createStoryboardCacheKey(
  document: DocumentArtifact,
  script: ScriptArtifact,
  model: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        document_sha256: document.source_sha256,
        document_sources: document.sources,
        document_pages: document.pages.map((page) => ({
          page: page.page,
          width: page.assets.width,
          height: page.assets.height,
        })),
        script,
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
    "module4-storyboard",
    `${cacheKey}.json`,
  );
}

export function rebaseStoryboardAssets(
  storyboard: StoryboardArtifact,
  document: DocumentArtifact,
): StoryboardArtifact {
  const rebased = structuredClone(storyboard);
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );
  const pageByNumber = new Map(
    document.pages.map((page) => [page.page, page]),
  );

  for (const scene of rebased.scenes) {
    const source = scene.visual.source_ids
      .map((sourceId) => sourceById.get(sourceId))
      .find((candidate) => candidate !== undefined);
    const page = source ? pageByNumber.get(source.page) : undefined;
    if (!source || !page) continue;

    if (
      scene.visual.type === "ORIGINAL_PAGE" ||
      scene.visual.type === "CROP_AND_HIGHLIGHT"
    ) {
      scene.visual.props.image_path = page.assets.page_image_path;
    }
    if (
      scene.asset_plan.mode === "PAGE_IMAGE" ||
      scene.asset_plan.mode === "SOURCE_CROP" ||
      scene.visual.type === "DIAGRAM"
    ) {
      scene.asset_plan.page = source.page;
      scene.asset_plan.source_path = page.assets.page_image_path;
    }
  }
  return rebased;
}

export async function readStoryboardCache(
  projectDirectory: string,
  cacheKey: string,
  document: DocumentArtifact,
  script: ScriptArtifact,
): Promise<StoryboardArtifact | null> {
  try {
    const raw = await readFile(cachePath(projectDirectory, cacheKey), "utf8");
    const cached = storyboardSchema.parse(JSON.parse(raw));
    const storyboard = rebaseStoryboardAssets(cached, document);
    validateStoryboard(storyboard, document, script);
    return storyboard;
  } catch {
    return null;
  }
}

export async function writeStoryboardCache(
  projectDirectory: string,
  cacheKey: string,
  storyboard: StoryboardArtifact,
): Promise<void> {
  const outputPath = cachePath(projectDirectory, cacheKey);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(storyboard, null, 2)}\n`,
    "utf8",
  );
}
