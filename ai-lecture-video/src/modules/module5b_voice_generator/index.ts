import type { PipelineConfig } from "../../core/config.js";
import {
  type ScriptArtifact,
  voiceManifestSchema,
  type StoryboardArtifact,
  type VoiceManifest,
} from "../../core/contracts.js";
import type { PipelineModule } from "../../core/module.js";
import { generateVoiceManifest } from "./voice-generator.js";

export interface VoiceGeneratorInput {
  config: PipelineConfig;
  script: ScriptArtifact;
  storyboard: StoryboardArtifact;
}

export const module5bVoiceGenerator: PipelineModule<
  VoiceGeneratorInput,
  VoiceManifest
> = {
  name: "module5b_voice_generator",
  description:
    "Sinh audio từng scene, áp dụng pronunciation glossary và trả duration thật.",
  outputFile: "05b_voice_manifest.json",
  outputSchema: voiceManifestSchema,
  async run(input, context) {
    return generateVoiceManifest(
      input.config,
      input.script,
      input.storyboard,
      context.projectDirectory,
      context.runDirectory,
    );
  },
};
