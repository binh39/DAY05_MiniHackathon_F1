import path from "node:path";
import { ArtifactStore } from "../core/artifact-store.js";
import type { PipelineConfig } from "../core/config.js";
import type { PipelineModule, RunContext } from "../core/module.js";
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
  const rawOutput = await module.run(input, context);
  const output = module.outputSchema.parse(rawOutput);
  await store.writeJson(module.outputFile, output);
  process.stdout.write(`  ✓ ${module.outputFile}\n`);
  return output;
}

export async function runPipeline(
  config: PipelineConfig,
  projectDirectory: string,
): Promise<void> {
  const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const runDirectory = path.join(projectDirectory, "runs", runId);
  const context: RunContext = { runId, runDirectory, projectDirectory };
  const store = new ArtifactStore(runDirectory);
  await store.initialize();
  await store.writeJson("00_config.json", config);

  const document = await execute(
    module1DocumentIntelligence,
    config,
    context,
    store,
  );
  const lecturePlan = await execute(
    module2LecturePlanner,
    { config, document },
    context,
    store,
  );
  const script = await execute(
    module3ScriptGenerator,
    { config, document, lecturePlan },
    context,
    store,
  );
  const storyboard = await execute(
    module4StoryboardGenerator,
    { document, script },
    context,
    store,
  );

  const [visualResult, voiceResult] = await Promise.allSettled([
    execute(
      module5aVisualGenerator,
      { config, document, storyboard },
      context,
      store,
    ),
    execute(
      module5bVoiceGenerator,
      { config, script, storyboard },
      context,
      store,
    ),
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
}
