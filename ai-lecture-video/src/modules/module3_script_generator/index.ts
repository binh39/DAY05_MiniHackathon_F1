import type { PipelineConfig } from "../../core/config.js";
import {
  scriptSchema,
  type DocumentArtifact,
  type LecturePlanArtifact,
  type ScriptArtifact,
} from "../../core/contracts.js";
import { type PipelineModule } from "../../core/module.js";
import { getVertexEnvironment } from "../../providers/google/gemini-client.js";
import { generateScriptWithGemini } from "./gemini-script-writer.js";
import { validateScript } from "./grounding-validator.js";
import {
  createScriptCacheKey,
  readScriptCache,
  writeScriptCache,
} from "./module3-cache.js";

export interface ScriptGeneratorInput {
  config: PipelineConfig;
  document: DocumentArtifact;
  lecturePlan: LecturePlanArtifact;
}

export const module3ScriptGenerator: PipelineModule<
  ScriptGeneratorInput,
  ScriptArtifact
> = {
  name: "module3_script_generator",
  description:
    "Sinh lời giảng theo chapter và kiểm tra grounded claim/learning objective.",
  outputFile: "03_script.json",
  outputSchema: scriptSchema,
  async run({ config, document, lecturePlan }, context) {
    const environment = getVertexEnvironment();
    const cacheKey = createScriptCacheKey(
      document,
      lecturePlan,
      config,
      environment.scriptModel,
    );
    const cached = await readScriptCache(
      context.projectDirectory,
      cacheKey,
      document,
      lecturePlan,
    );
    if (cached) {
      process.stdout.write("  Script cache hit.\n");
      return cached;
    }

    const script = await generateScriptWithGemini(
      document,
      lecturePlan,
      config,
    );
    validateScript(script, document, lecturePlan);
    await writeScriptCache(context.projectDirectory, cacheKey, script);
    return script;
  },
};
