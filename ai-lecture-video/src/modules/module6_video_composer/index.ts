import type { PipelineConfig } from "../../core/config.js";
import {
  videoManifestSchema,
  type LecturePlanArtifact,
  type StoryboardArtifact,
  type VideoManifest,
  type VisualManifest,
  type VoiceManifest,
} from "../../core/contracts.js";
import type { PipelineModule } from "../../core/module.js";
import { composeVideo } from "./video-composer.js";

export interface VideoComposerInput {
  config: PipelineConfig;
  lecturePlan: LecturePlanArtifact;
  storyboard: StoryboardArtifact;
  visuals: VisualManifest;
  voices: VoiceManifest;
}

export const module6VideoComposer: PipelineModule<
  VideoComposerInput,
  VideoManifest
> = {
  name: "module6_video_composer",
  description:
    "Đồng bộ voice/visual, tạo subtitle, chapter timestamp và lecture.mp4.",
  outputFile: "06_video_manifest.json",
  outputSchema: videoManifestSchema,
  async run(input, context) {
    return composeVideo(
      input.config,
      input.lecturePlan,
      input.storyboard,
      input.visuals,
      input.voices,
      context.projectDirectory,
      context.runDirectory,
    );
  },
};
