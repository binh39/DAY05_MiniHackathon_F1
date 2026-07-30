import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PipelineConfig } from "../../core/config.js";
import type {
  DocumentArtifact,
  StoryboardArtifact,
  VisualManifest,
} from "../../core/contracts.js";
import { inspectSceneLayout } from "./layout-qa.js";
import {
  createRemotionRenderSession,
  type RemotionRenderSession,
} from "./remotion-renderer.js";
import {
  createVisualCacheKey,
  readVisualCache,
  writeVisualCache,
} from "./visual-cache.js";

async function checksum(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function fallbackScene(
  scene: StoryboardArtifact["scenes"][number],
): StoryboardArtifact["scenes"][number] {
  return {
    ...scene,
    visual: {
      type: "BULLET",
      source_ids: scene.visual.source_ids,
      template: "bullet-v1",
      props: {
        heading: "Nội dung bài giảng",
        bullets: [scene.narration.slice(0, 180)],
        accent: "blue",
      },
    },
    asset_plan: {
      mode: "GENERATED_LAYOUT",
      instructions: ["Render emergency bullet fallback."],
    },
    warnings: [
      ...scene.warnings,
      `Đã dùng visual fallback: ${scene.fallback.reason}`,
    ],
  };
}

async function renderWithRetry(
  session: RemotionRenderSession,
  scene: StoryboardArtifact["scenes"][number],
  outputPath: string,
): Promise<{ status: "READY" | "WARNING"; warnings: string[] }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await session.render(scene, outputPath);
      const warnings = [...scene.warnings, ...inspectSceneLayout(scene)];
      return {
        status: warnings.length > 0 ? "WARNING" : "READY",
        warnings,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await delay(400);
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  const fallback = fallbackScene(scene);
  await session.render(fallback, outputPath);
  return {
    status: "WARNING",
    warnings: [`Primary render failed: ${reason}`, ...fallback.warnings],
  };
}

export async function generateVisualManifest(
  config: PipelineConfig,
  document: DocumentArtifact,
  storyboard: StoryboardArtifact,
  projectDirectory: string,
  runDirectory: string,
): Promise<VisualManifest> {
  const outputDirectory = path.join(runDirectory, "assets", "visuals");
  await mkdir(outputDirectory, { recursive: true });
  const results = new Array<VisualManifest["scenes"][number]>(
    storyboard.scenes.length,
  );
  const misses: Array<{
    index: number;
    scene: StoryboardArtifact["scenes"][number];
    outputPath: string;
    cacheKey: string;
  }> = [];

  for (let index = 0; index < storyboard.scenes.length; index += 1) {
    const scene = storyboard.scenes[index]!;
    const outputPath = path.join(outputDirectory, `${scene.scene_id}.png`);
    const cacheKey = createVisualCacheKey(
      scene,
      document,
      config.render.width,
      config.render.height,
    );
    const cached = await readVisualCache(
      projectDirectory,
      cacheKey,
      outputPath,
    );
    if (cached) {
      results[index] = {
        scene_id: scene.scene_id,
        template: scene.visual.template,
        asset_path: path.relative(projectDirectory, outputPath),
        asset_sha256: cached.asset_sha256,
        width: config.render.width,
        height: config.render.height,
        status: cached.status,
        warnings: cached.warnings,
      };
    } else {
      misses.push({ index, scene, outputPath, cacheKey });
    }
  }

  if (misses.length === 0) {
    process.stdout.write("  Visual scene cache hit for all scenes.\n");
  } else {
    process.stdout.write(
      `  Rendering ${misses.length}/${storyboard.scenes.length} visual scenes...\n`,
    );
    const session = await createRemotionRenderSession(
      projectDirectory,
      config.render.width,
      config.render.height,
    );
    try {
      for (const miss of misses) {
        const renderResult = await renderWithRetry(
          session,
          miss.scene,
          miss.outputPath,
        );
        const assetSha256 = await checksum(miss.outputPath);
        results[miss.index] = {
          scene_id: miss.scene.scene_id,
          template: miss.scene.visual.template,
          asset_path: path.relative(projectDirectory, miss.outputPath),
          asset_sha256: assetSha256,
          width: config.render.width,
          height: config.render.height,
          status: renderResult.status,
          warnings: renderResult.warnings,
        };
        await writeVisualCache(
          projectDirectory,
          miss.cacheKey,
          miss.outputPath,
          {
            status: renderResult.status,
            warnings: renderResult.warnings,
            asset_sha256: assetSha256,
          },
        );
        if ((miss.index + 1) % 10 === 0) {
          process.stdout.write(
            `  Rendered ${miss.index + 1}/${storyboard.scenes.length}\n`,
          );
        }
      }
    } finally {
      await session.close();
    }
  }

  return {
    schema_version: "1.0",
    render_engine: "remotion@4.0.501",
    width: config.render.width,
    height: config.render.height,
    total_scenes: storyboard.scenes.length,
    scenes: results,
  };
}
