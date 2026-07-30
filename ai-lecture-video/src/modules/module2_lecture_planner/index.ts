import type { PipelineConfig } from "../../core/config.js";
import {
  lecturePlanSchema,
  type DocumentArtifact,
  type LecturePlanArtifact,
} from "../../core/contracts.js";
import {
  type PipelineModule,
} from "../../core/module.js";
import { getVertexEnvironment } from "../../providers/google/gemini-client.js";
import { validateLecturePlan } from "./coverage-validator.js";
import { generateLecturePlanWithGemini } from "./gemini-lecture-planner.js";
import {
  createPlanCacheKey,
  readPlanCache,
  writePlanCache,
} from "./module2-cache.js";

export interface LecturePlannerInput {
  config: PipelineConfig;
  document: DocumentArtifact;
}

export const module2LecturePlanner: PipelineModule<
  LecturePlannerInput,
  LecturePlanArtifact
> = {
  name: "module2_lecture_planner",
  description:
    "Chia chapter, quyết định mức xử lý từng nội dung và lập Coverage Manifest.",
  outputFile: "02_lecture_plan.json",
  outputSchema: lecturePlanSchema,
  async run({ config, document }, context) {
    const environment = getVertexEnvironment();
    const cacheKey = createPlanCacheKey(
      document,
      config,
      environment.plannerModel,
    );
    const cached = await readPlanCache(
      context.projectDirectory,
      cacheKey,
      document,
      config,
    );
    if (cached) {
      process.stdout.write("  Lecture plan cache hit.\n");
      return cached;
    }

    const plan = await generateLecturePlanWithGemini(document, config);
    validateLecturePlan(plan, document, config);
    await writePlanCache(context.projectDirectory, cacheKey, plan);
    return plan;
  },
};
