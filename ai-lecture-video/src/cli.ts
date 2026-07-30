import path from "node:path";
import { loadConfig } from "./core/config.js";
import { describePipeline } from "./pipeline/pipeline-definition.js";
import { runPipeline } from "./pipeline/run-pipeline.js";
import { pipelineModuleIdSchema } from "./core/pipeline-events.js";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "inspect";
  const projectDirectory = process.cwd();

  if (command === "inspect") {
    process.stdout.write(`${describePipeline()}\n`);
    return;
  }

  if (command === "run") {
    const configPath = process.argv[3] ?? "config.json";
    const config = await loadConfig(configPath, projectDirectory);
    const mode = process.env.PIPELINE_MODE;
    if (mode && !["full", "plan", "resume"].includes(mode)) {
      throw new Error(`PIPELINE_MODE không hợp lệ: ${mode}.`);
    }
    const startAt = process.env.PIPELINE_START_MODULE
      ? pipelineModuleIdSchema.parse(process.env.PIPELINE_START_MODULE)
      : undefined;
    await runPipeline(config, projectDirectory, {
      mode: (mode as "full" | "plan" | "resume" | undefined) ?? "full",
      startAt,
    });
    return;
  }

  throw new Error(
    `Lệnh không hợp lệ: ${command}. Dùng "inspect" hoặc "run [config.json]".`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Pipeline dừng: ${message}\n`);
  process.exitCode = 1;
});
