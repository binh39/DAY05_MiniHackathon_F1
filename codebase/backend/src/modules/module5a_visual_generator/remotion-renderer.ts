import { readFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
  type RenderStillOptions,
} from "@remotion/renderer";
import type { StoryboardArtifact } from "../../core/contracts.js";
import type { PipelineConfig } from "../../core/config.js";
import type { SceneRenderProps } from "../../remotion/scene-render-types.js";

type Browser = NonNullable<RenderStillOptions["puppeteerInstance"]>;

function mimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function dataUri(
  scene: StoryboardArtifact["scenes"][number],
  projectDirectory: string,
): Promise<string | null> {
  const rawPath =
    typeof scene.visual.props.image_path === "string"
      ? scene.visual.props.image_path
      : scene.asset_plan.source_path;
  if (!rawPath) return null;
  const absolutePath = path.resolve(projectDirectory, rawPath);
  const bytes = await readFile(absolutePath);
  return `data:${mimeType(absolutePath)};base64,${bytes.toString("base64")}`;
}

export interface RemotionRenderSession {
  render(
    scene: StoryboardArtifact["scenes"][number],
    outputPath: string,
  ): Promise<void>;
  close(): Promise<void>;
}

export async function createRemotionRenderSession(
  projectDirectory: string,
  width: number,
  height: number,
  visualStyle: PipelineConfig["visual_style"],
): Promise<RemotionRenderSession> {
  const entryPoint = path.join(
    process.env.PIPELINE_CODE_DIRECTORY ?? projectDirectory,
    "src",
    "remotion",
    "index.tsx",
  );
  process.stdout.write("  Bundling Remotion composition...\n");
  const serveUrl = await bundle({
    entryPoint,
    webpackOverride: (configuration) => ({
      ...configuration,
      resolve: {
        ...configuration.resolve,
        extensionAlias: {
          ...configuration.resolve?.extensionAlias,
          ".js": [".ts", ".tsx", ".js"],
        },
      },
    }),
  });
  process.stdout.write("  Opening Remotion headless browser...\n");
  const browser: Browser = await openBrowser("chrome", {
    chromeMode: "headless-shell",
    browserExecutable: process.env.CHROME_PATH ?? null,
    logLevel: "warn",
  });
  return {
    async render(scene, outputPath) {
      const inputProps: SceneRenderProps = {
        scene,
        resolvedImageSrc: await dataUri(scene, projectDirectory),
        width,
        height,
        visualStyle,
      };
      const composition = await selectComposition({
        serveUrl,
        id: "LectureScene",
        inputProps: inputProps as unknown as Record<string, unknown>,
        puppeteerInstance: browser,
        logLevel: "warn",
      });
      await renderStill({
        composition: { ...composition, width, height },
        serveUrl,
        output: outputPath,
        inputProps: inputProps as unknown as Record<string, unknown>,
        imageFormat: "png",
        frame: 15,
        overwrite: true,
        puppeteerInstance: browser,
        logLevel: "warn",
      });
    },
    async close() {
      await browser.close({ silent: true });
    },
  };
}
