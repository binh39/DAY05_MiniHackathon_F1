import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  DocumentArtifact,
  StoryboardArtifact,
  VisualManifest,
} from "../../core/contracts.js";

const RENDERER_VERSION = "module5a-v2-remotion-4.0.501";

const cacheMetadataSchema = z.object({
  status: z.enum(["READY", "WARNING", "FAILED"]),
  warnings: z.array(z.string()),
  asset_sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export function createVisualCacheKey(
  scene: StoryboardArtifact["scenes"][number],
  document: DocumentArtifact,
  width: number,
  height: number,
): string {
  const { image_path: _runSpecificImagePath, ...stableProps } =
    scene.visual.props;
  return createHash("sha256")
    .update(
      JSON.stringify({
        renderer_version: RENDERER_VERSION,
        document_sha256: document.source_sha256,
        scene: {
          scene_id: scene.scene_id,
          visual: {
            ...scene.visual,
            props: stableProps,
          },
          narration: scene.narration,
          fallback: scene.fallback,
        },
        width,
        height,
      }),
    )
    .digest("hex");
}

function paths(projectDirectory: string, cacheKey: string) {
  const directory = path.join(
    projectDirectory,
    ".cache",
    "module5a-visual",
  );
  return {
    directory,
    image: path.join(directory, `${cacheKey}.png`),
    metadata: path.join(directory, `${cacheKey}.json`),
  };
}

async function validPng(filePath: string): Promise<boolean> {
  try {
    const bytes = await readFile(filePath);
    return (
      bytes.length > 24 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      )
    );
  } catch {
    return false;
  }
}

export async function readVisualCache(
  projectDirectory: string,
  cacheKey: string,
  outputPath: string,
): Promise<
  Pick<
    VisualManifest["scenes"][number],
    "status" | "warnings" | "asset_sha256"
  > | null
> {
  const cache = paths(projectDirectory, cacheKey);
  try {
    if (!(await validPng(cache.image))) return null;
    const metadata = cacheMetadataSchema.parse(
      JSON.parse(await readFile(cache.metadata, "utf8")),
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    await copyFile(cache.image, outputPath);
    return metadata;
  } catch {
    return null;
  }
}

export async function writeVisualCache(
  projectDirectory: string,
  cacheKey: string,
  renderedPath: string,
  metadata: z.infer<typeof cacheMetadataSchema>,
): Promise<void> {
  const cache = paths(projectDirectory, cacheKey);
  await mkdir(cache.directory, { recursive: true });
  await copyFile(renderedPath, cache.image);
  await writeFile(
    cache.metadata,
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
}
