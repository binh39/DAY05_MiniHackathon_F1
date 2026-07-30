import type { StoryboardArtifact } from "../core/contracts.js";
import type { PipelineConfig } from "../core/config.js";

export type SceneRenderProps = {
  scene: StoryboardArtifact["scenes"][number];
  resolvedImageSrc: string | null;
  width: number;
  height: number;
  visualStyle: PipelineConfig["visual_style"];
} & Record<string, unknown>;
