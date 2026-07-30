import type { StoryboardArtifact } from "../core/contracts.js";

export type SceneRenderProps = {
  scene: StoryboardArtifact["scenes"][number];
  resolvedImageSrc: string | null;
  width: number;
  height: number;
} & Record<string, unknown>;
