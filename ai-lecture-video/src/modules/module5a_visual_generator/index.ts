import type { PipelineConfig } from "../../core/config.js";
import {
  visualManifestSchema,
  type DocumentArtifact,
  type StoryboardArtifact,
  type VisualManifest,
} from "../../core/contracts.js";
import { type PipelineModule } from "../../core/module.js";
import { generateVisualManifest } from "./visual-generator.js";

export interface VisualGeneratorInput {
  config: PipelineConfig;
  document: DocumentArtifact;
  storyboard: StoryboardArtifact;
}

export const module5aVisualGenerator: PipelineModule<
  VisualGeneratorInput,
  VisualManifest
> = {
  name: "module5a_visual_generator",
  description:
    "Render page/crop/highlight và scene template bằng Remotion/React/SVG.",
  outputFile: "05a_visual_manifest.json",
  outputSchema: visualManifestSchema,
  async run({ config, document, storyboard }, context) {
    return generateVisualManifest(
      config,
      document,
      storyboard,
      context.projectDirectory,
      context.runDirectory,
    );
  },
};
