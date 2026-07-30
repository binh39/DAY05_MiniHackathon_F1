import {
  storyboardSchema,
  type DocumentArtifact,
  type ScriptArtifact,
  type StoryboardArtifact,
} from "../../core/contracts.js";
import { type PipelineModule } from "../../core/module.js";
import { getVertexEnvironment } from "../../providers/google/gemini-client.js";
import { generateStoryboardWithGemini } from "./gemini-storyboard-planner.js";
import {
  createStoryboardCacheKey,
  readStoryboardCache,
  writeStoryboardCache,
} from "./module4-cache.js";
import { validateStoryboard } from "./storyboard-validator.js";

export interface StoryboardGeneratorInput {
  document: DocumentArtifact;
  script: ScriptArtifact;
}

export const module4StoryboardGenerator: PipelineModule<
  StoryboardGeneratorInput,
  StoryboardArtifact
> = {
  name: "module4_storyboard_generator",
  description:
    "Ánh xạ từng narration vào scene type cố định và source asset phù hợp.",
  outputFile: "04_storyboard.json",
  outputSchema: storyboardSchema,
  async run({ document, script }, context) {
    const environment = getVertexEnvironment();
    const cacheKey = createStoryboardCacheKey(
      document,
      script,
      environment.storyboardModel,
    );
    const cached = await readStoryboardCache(
      context.projectDirectory,
      cacheKey,
      document,
      script,
    );
    if (cached) {
      process.stdout.write("  Storyboard cache hit.\n");
      return cached;
    }
    const storyboard = await generateStoryboardWithGemini(document, script);
    validateStoryboard(storyboard, document, script);
    await writeStoryboardCache(
      context.projectDirectory,
      cacheKey,
      storyboard,
    );
    return storyboard;
  },
};
