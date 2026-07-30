import path from "node:path";
import { ArtifactStore } from "../core/artifact-store.js";
import type { PipelineConfig } from "../core/config.js";
import {
  documentSchema,
  lecturePlanSchema,
  scriptSchema,
  storyboardSchema,
  visualManifestSchema,
  voiceManifestSchema,
} from "../core/contracts.js";
import type { PipelineModule, RunContext } from "../core/module.js";
import {
  emitPipelineEvent,
  pipelineModuleIdSchema,
  type PipelineModuleId,
} from "../core/pipeline-events.js";
import { module1DocumentIntelligence } from "../modules/module1_document_intelligence/index.js";
import { module2LecturePlanner } from "../modules/module2_lecture_planner/index.js";
import { module3ScriptGenerator } from "../modules/module3_script_generator/index.js";
import { module4StoryboardGenerator } from "../modules/module4_storyboard_generator/index.js";
import { module5aVisualGenerator } from "../modules/module5a_visual_generator/index.js";
import { module5bVoiceGenerator } from "../modules/module5b_voice_generator/index.js";
import { module6VideoComposer } from "../modules/module6_video_composer/index.js";

async function execute<I, O>(
  module: PipelineModule<I, O>,
  input: I,
  context: RunContext,
  store: ArtifactStore,
): Promise<O> {
  process.stdout.write(`→ ${module.name}\n`);
  const moduleId = pipelineModuleIdSchema.parse(module.name);
  emitPipelineEvent({
    type: "MODULE_STARTED",
    module: moduleId,
    at: new Date().toISOString(),
  });
  try {
    const rawOutput = await module.run(input, context);
    const output = module.outputSchema.parse(rawOutput);
    await store.writeJson(module.outputFile, output);
    process.stdout.write(`  ✓ ${module.outputFile}\n`);
    emitPipelineEvent({
      type: "MODULE_COMPLETED",
      module: moduleId,
      at: new Date().toISOString(),
    });
    return output;
  } catch (error) {
    emitPipelineEvent({
      type: "MODULE_FAILED",
      module: moduleId,
      at: new Date().toISOString(),
      error: error instanceof Error ? error.message.slice(0, 1000) : String(error),
    });
    throw error;
  }
}

const moduleRank: Record<PipelineModuleId, number> = {
  module1_document_intelligence: 1,
  module2_lecture_planner: 2,
  module3_script_generator: 3,
  module4_storyboard_generator: 4,
  module5a_visual_generator: 5,
  module5b_voice_generator: 5,
  module6_video_composer: 6,
};

async function loadOrRun<O>(
  store: ArtifactStore,
  fileName: string,
  schema: { parse(value: unknown): O },
  run: () => Promise<O>,
): Promise<O> {
  try {
    return schema.parse(await store.readJson(fileName));
  } catch {
    return run();
  }
}

export async function runPipeline(
  config: PipelineConfig,
  projectDirectory: string,
  options: {
    mode?: "full" | "document" | "plan" | "resume";
    startAt?: PipelineModuleId;
  } = {},
): Promise<"AWAITING_APPROVAL" | "COMPLETED"> {
  const requestedRunId = process.env.PIPELINE_RUN_ID;
  if (requestedRunId && !/^[a-zA-Z0-9_-]{1,100}$/.test(requestedRunId)) {
    throw new Error("PIPELINE_RUN_ID không hợp lệ.");
  }
  const runId =
    requestedRunId ?? new Date().toISOString().replaceAll(/[:.]/g, "-");
  const runDirectory = path.join(projectDirectory, "runs", runId);
  const context: RunContext = { runId, runDirectory, projectDirectory };
  const store = new ArtifactStore(runDirectory);
  await store.initialize();
  await store.writeJson("00_config.json", config);

  const mode = options.mode ?? "full";
  const startAt =
    options.startAt ??
    (mode === "resume"
      ? "module3_script_generator"
      : "module1_document_intelligence");
  const startRank = moduleRank[startAt];
  const document =
    startRank > 1
      ? documentSchema.parse(
          await store.readJson("01_document.json"),
        )
      : await execute(
          module1DocumentIntelligence,
          config,
          context,
          store,
        );
  if (mode === "document") {
    process.stdout.write("PIPELINE_STATUS:DOCUMENT_READY\n");
    return "AWAITING_APPROVAL";
  }
  const lecturePlan =
    startRank > 2
      ? lecturePlanSchema.parse(
          await store.readJson("02_lecture_plan.json"),
        )
      : await execute(
          module2LecturePlanner,
          { config, document },
          context,
          store,
        );
  if (mode === "plan") {
    process.stdout.write("PIPELINE_STATUS:AWAITING_APPROVAL\n");
    return "AWAITING_APPROVAL";
  }
  const script =
    startRank > 3
      ? scriptSchema.parse(await store.readJson("03_script.json"))
      : await execute(
          module3ScriptGenerator,
          { config, document, lecturePlan },
          context,
          store,
        );
  const storyboard =
    startRank > 4
      ? storyboardSchema.parse(await store.readJson("04_storyboard.json"))
      : await execute(
          module4StoryboardGenerator,
          { document, script },
          context,
          store,
        );

  const runVisual = () =>
    execute(
      module5aVisualGenerator,
      { config, document, storyboard },
      context,
      store,
    );
  const runVoice = () =>
    execute(
      module5bVoiceGenerator,
      { config, script, storyboard },
      context,
      store,
    );
  const visualPromise =
    startAt === "module5b_voice_generator" ||
    startAt === "module6_video_composer"
      ? loadOrRun(
          store,
          "05a_visual_manifest.json",
          visualManifestSchema,
          runVisual,
        )
      : runVisual();
  const voicePromise =
    startAt === "module5a_visual_generator" ||
    startAt === "module6_video_composer"
      ? loadOrRun(
          store,
          "05b_voice_manifest.json",
          voiceManifestSchema,
          runVoice,
        )
      : runVoice();

  const [visualResult, voiceResult] = await Promise.allSettled([
    visualPromise,
    voicePromise,
  ]);

  if (visualResult.status === "rejected") {
    throw visualResult.reason;
  }
  if (voiceResult.status === "rejected") {
    throw voiceResult.reason;
  }
  const visuals = visualResult.value;
  const voices = voiceResult.value;

  await execute(
    module6VideoComposer,
    { config, lecturePlan, storyboard, visuals, voices },
    context,
    store,
  );
  return "COMPLETED";
}
