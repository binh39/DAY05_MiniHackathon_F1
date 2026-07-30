import { spawn, type ChildProcess } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PipelineConfig } from "../core/config.js";
import type { VideoManifest } from "../core/contracts.js";
import {
  PIPELINE_MODULES,
  pipelineEventSchema,
  type PipelineEvent,
  type PipelineModuleId,
} from "../core/pipeline-events.js";
import type { FirebaseServices } from "./firebase-services.js";
import { JobStore } from "./job-store.js";
import {
  initialModuleStates,
  type JobRecord,
  type ModuleStates,
} from "./types.js";

const MODULE_META: Record<
  PipelineModuleId,
  {
    stage: string;
    weight: number;
    timeoutMs: number;
    timeoutEnv: string;
  }
> = {
  module1_document_intelligence: {
    stage: "ANALYZING_DOCUMENT",
    weight: 15,
    timeoutMs: 10 * 60_000,
    timeoutEnv: "PIPELINE_MODULE1_TIMEOUT_MS",
  },
  module2_lecture_planner: {
    stage: "PLANNING_LECTURE",
    weight: 15,
    timeoutMs: 8 * 60_000,
    timeoutEnv: "PIPELINE_MODULE2_TIMEOUT_MS",
  },
  module3_script_generator: {
    stage: "GENERATING_SCRIPT",
    weight: 15,
    timeoutMs: 10 * 60_000,
    timeoutEnv: "PIPELINE_MODULE3_TIMEOUT_MS",
  },
  module4_storyboard_generator: {
    stage: "GENERATING_STORYBOARD",
    weight: 15,
    timeoutMs: 8 * 60_000,
    timeoutEnv: "PIPELINE_MODULE4_TIMEOUT_MS",
  },
  module5a_visual_generator: {
    stage: "GENERATING_VISUALS",
    weight: 12,
    timeoutMs: 20 * 60_000,
    timeoutEnv: "PIPELINE_MODULE5A_TIMEOUT_MS",
  },
  module5b_voice_generator: {
    stage: "GENERATING_VOICE",
    weight: 10,
    timeoutMs: 15 * 60_000,
    timeoutEnv: "PIPELINE_MODULE5B_TIMEOUT_MS",
  },
  module6_video_composer: {
    stage: "COMPOSING_VIDEO",
    weight: 18,
    timeoutMs: 15 * 60_000,
    timeoutEnv: "PIPELINE_MODULE6_TIMEOUT_MS",
  },
};

const MODULE_RANK: Record<PipelineModuleId, number> = {
  module1_document_intelligence: 1,
  module2_lecture_planner: 2,
  module3_script_generator: 3,
  module4_storyboard_generator: 4,
  module5a_visual_generator: 5,
  module5b_voice_generator: 5,
  module6_video_composer: 6,
};

function normalizedStates(states?: ModuleStates): ModuleStates {
  return { ...initialModuleStates(), ...states };
}

export function moduleProgress(states: ModuleStates): number {
  return PIPELINE_MODULES.reduce(
    (total, module) =>
      total +
      (states[module].status === "COMPLETED"
        ? MODULE_META[module].weight
        : 0),
    0,
  );
}

export function resolveModuleTimeout(
  module: PipelineModuleId,
  fallbackTimeoutMs?: number,
  environment: NodeJS.ProcessEnv = process.env,
): number {
  const configured = Number(environment[MODULE_META[module].timeoutEnv]);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return fallbackTimeoutMs ?? MODULE_META[module].timeoutMs;
}

export function moduleStatesForRetry(
  states: ModuleStates | undefined,
  failedModule: PipelineModuleId,
): ModuleStates {
  const current = normalizedStates(states);
  const failedRank = MODULE_RANK[failedModule];
  return Object.fromEntries(
    PIPELINE_MODULES.map((module) => {
      const keepCompleted =
        current[module].status === "COMPLETED" &&
        (MODULE_RANK[module] < failedRank ||
          (failedRank === 5 &&
            MODULE_RANK[module] === 5 &&
            module !== failedModule));
      return [
        module,
        keepCompleted ? current[module] : { status: "PENDING" },
      ];
    }),
  ) as ModuleStates;
}

type DurationOption = JobRecord["fields"]["duration_option"];

export function durationConfig(option: DurationOption): Pick<
  PipelineConfig,
  "coverage_mode" | "detail_level" | "duration"
> {
  if (option === "0-1" || option === "1-3") {
    return {
      coverage_mode: "SUMMARY",
      detail_level: "brief",
      duration:
        option === "0-1"
          ? { option, min_seconds: 0, max_seconds: 60, target_seconds: 50 }
          : { option, min_seconds: 60, max_seconds: 180, target_seconds: 145 },
    };
  }
  if (option === "3-5") {
    return {
      coverage_mode: "CONCISE",
      detail_level: "brief",
      duration: {
        option,
        min_seconds: 180,
        max_seconds: 300,
        target_seconds: 255,
      },
    };
  }
  if (option === "5-8") {
    return {
      coverage_mode: "CONCISE",
      detail_level: "standard",
      duration: {
        option,
        min_seconds: 300,
        max_seconds: 480,
        target_seconds: 410,
      },
    };
  }
  return {
    coverage_mode: "FULL",
    detail_level: "brief",
    duration: {
      option,
      min_seconds: 480,
      max_seconds: 600,
      target_seconds: 530,
    },
  };
}

function dimensions(aspectRatio: JobRecord["fields"]["aspect_ratio"]) {
  if (aspectRatio === "9:16") return { width: 1080, height: 1920 };
  if (aspectRatio === "1:1") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

function pipelineConfig(job: JobRecord, projectDirectory: string): PipelineConfig {
  const duration = durationConfig(job.fields.duration_option);
  return {
    input_pdf: path.relative(projectDirectory, job.input_file),
    output_directory: "outputs",
    ...duration,
    visual_style: job.fields.visual_style ?? "modern_minimal",
    audience: "beginner",
    language: job.fields.language,
    max_chapter_minutes: 8,
    limits: { max_pdf_megabytes: 50, max_pdf_pages: 80 },
    voice: {
      provider: "google",
      voice_id: job.fields.voice_id,
      speaking_rate: 1,
    },
    render: {
      ...dimensions(job.fields.aspect_ratio),
      fps: 30,
    },
  };
}

export class JobRunner {
  private readonly queue: string[] = [];
  private active:
    | {
        jobId: string;
        child: ChildProcess;
        timers: Map<string, NodeJS.Timeout>;
      }
    | undefined;

  constructor(
    private readonly store: JobStore,
    private readonly projectDirectory: string,
    private readonly fallbackTimeoutMs?: number,
    private readonly firebase?: FirebaseServices,
  ) {}

  private timeoutFor(module: PipelineModuleId): number {
    return resolveModuleTimeout(module, this.fallbackTimeoutMs);
  }

  private clearActiveTimers(): void {
    if (!this.active) return;
    for (const timer of this.active.timers.values()) clearTimeout(timer);
    this.active.timers.clear();
  }

  enqueue(jobId: string): void {
    if (!this.queue.includes(jobId) && this.active?.jobId !== jobId) {
      this.queue.push(jobId);
    }
    void this.drain();
  }

  async cancel(jobId: string): Promise<boolean> {
    const queuedIndex = this.queue.indexOf(jobId);
    if (queuedIndex >= 0) {
      this.queue.splice(queuedIndex, 1);
      await this.store.update(jobId, {
        status: "CANCELLED",
        stage: "CANCELLED",
        error: undefined,
      });
      return true;
    }
    if (this.active?.jobId === jobId) {
      this.clearActiveTimers();
      this.active.child.kill();
      await this.store.update(jobId, {
        status: "CANCELLED",
        stage: "CANCELLED",
        error: undefined,
      });
      return true;
    }
    const paused = this.store.get(jobId);
    if (paused?.status === "AWAITING_APPROVAL") {
      await this.store.update(jobId, {
        status: "CANCELLED",
        stage: "CANCELLED",
        error: undefined,
      });
      return true;
    }
    return false;
  }

  private async drain(): Promise<void> {
    if (this.active || this.queue.length === 0) return;
    const jobId = this.queue.shift()!;
    try {
      await this.run(jobId);
    } finally {
      this.active = undefined;
      void this.drain();
    }
  }

  private async run(jobId: string): Promise<void> {
    const job = this.store.get(jobId);
    if (!job || job.status !== "QUEUED") return;
    const pipelineMode = job.approved_at ? "resume" : "plan";
    const configPath = path.join(
      this.projectDirectory,
      "backend-data",
      "jobs",
      `${job.run_id}.config.json`,
    );
    await writeFile(
      configPath,
      `${JSON.stringify(pipelineConfig(job, this.projectDirectory), null, 2)}\n`,
      "utf8",
    );
    const startingStates = normalizedStates(job.modules);
    await this.store.update(jobId, {
      status: "RUNNING",
      stage: "STARTING",
      progress: Math.max(2, moduleProgress(startingStates)),
      modules: startingStates,
      error: undefined,
    });

    const tsxCli = path.join(
      this.projectDirectory,
      "node_modules",
      "tsx",
      "dist",
      "cli.mjs",
    );
    const child = spawn(
      process.execPath,
      [tsxCli, "src/cli.ts", "run", path.relative(this.projectDirectory, configPath)],
      {
        cwd: this.projectDirectory,
        windowsHide: true,
        env: {
          ...process.env,
          PIPELINE_RUN_ID: job.run_id,
          PIPELINE_MODE: pipelineMode,
          PIPELINE_START_MODULE: job.resume_from,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const timers = new Map<string, NodeJS.Timeout>();
    this.active = { jobId, child, timers };
    let stderr = "";
    let updateChain = Promise.resolve();
    let stdoutBuffer = "";
    let timedOutModule: PipelineModuleId | undefined;
    let failedEvent: PipelineEvent | undefined;
    const defaultStart: PipelineModuleId =
      job.resume_from ??
      (pipelineMode === "resume"
        ? "module3_script_generator"
        : "module1_document_intelligence");

    const startTimer = (module: PipelineModuleId) => {
      const currentTimer = timers.get(module);
      if (currentTimer) clearTimeout(currentTimer);
      timers.set(
        module,
        setTimeout(() => {
          timedOutModule = module;
          child.kill();
        }, this.timeoutFor(module)),
      );
    };
    const stopTimer = (module: PipelineModuleId) => {
      const timer = timers.get(module);
      if (timer) clearTimeout(timer);
      timers.delete(module);
    };
    timers.set(
      "startup",
      setTimeout(() => {
        timedOutModule = defaultStart;
        child.kill();
      }, Math.min(this.timeoutFor(defaultStart), 60_000)),
    );

    const handleEvent = (event: PipelineEvent) => {
      if (event.type === "MODULE_STARTED") {
        const startupTimer = timers.get("startup");
        if (startupTimer) clearTimeout(startupTimer);
        timers.delete("startup");
        startTimer(event.module);
      } else {
        stopTimer(event.module);
      }
      if (event.type === "MODULE_FAILED") {
        failedEvent = event;
        child.kill();
      }
      updateChain = updateChain.then(async () => {
        const current = this.store.get(jobId);
        if (!current || current.status !== "RUNNING") return;
        const states = normalizedStates(current.modules);
        if (event.type === "MODULE_STARTED") {
          states[event.module] = {
            status: "RUNNING",
            started_at: event.at,
          };
        } else if (event.type === "MODULE_COMPLETED") {
          states[event.module] = {
            ...states[event.module],
            status: "COMPLETED",
            completed_at: event.at,
            error: undefined,
          };
        } else {
          states[event.module] = {
            ...states[event.module],
            status: "FAILED",
            completed_at: event.at,
            error: event.error,
          };
        }
        const visualRunning =
          states.module5a_visual_generator.status === "RUNNING";
        const voiceRunning =
          states.module5b_voice_generator.status === "RUNNING";
        const stage =
          visualRunning && voiceRunning
            ? "GENERATING_ASSETS_PARALLEL"
            : visualRunning
              ? MODULE_META.module5a_visual_generator.stage
              : voiceRunning
                ? MODULE_META.module5b_voice_generator.stage
                : MODULE_META[event.module].stage;
        await this.store.update(jobId, {
          modules: states,
          stage:
            event.type === "MODULE_FAILED"
              ? `${MODULE_META[event.module].stage}_FAILED`
              : stage,
          progress: Math.max(2, moduleProgress(states)),
          failed_module:
            event.type === "MODULE_FAILED" ? event.module : undefined,
        });
      });
    };

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/u);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("PIPELINE_EVENT:")) continue;
        try {
          const parsed = pipelineEventSchema.safeParse(
            JSON.parse(line.slice("PIPELINE_EVENT:".length)),
          );
          if (parsed.success) handleEvent(parsed.data);
        } catch {
          // Ignore malformed stdout; only validated structured events mutate state.
        }
      }
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-8_000);
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      child.once("error", (error) => {
        stderr = `${stderr}\n${error.message}`.slice(-8_000);
        resolve(-1);
      });
      child.once("close", resolve);
    });
    this.clearActiveTimers();
    await updateChain;
    const current = this.store.get(jobId);
    if (!current || current.status === "CANCELLED") return;
    if (exitCode !== 0) {
      const failedModule =
        timedOutModule ??
        failedEvent?.module ??
        PIPELINE_MODULES.find(
          (module) => current.modules?.[module].status === "RUNNING",
        ) ??
        defaultStart;
      const states = normalizedStates(current.modules);
      const error = timedOutModule
        ? `${failedModule} vượt timeout ${Math.round(
            this.timeoutFor(failedModule) / 1000,
          )} giây.`
        : failedEvent?.error ??
          stderr.trim().split(/\r?\n/u).at(-1) ??
          `Pipeline exit code ${exitCode}.`;
      states[failedModule] = {
        ...states[failedModule],
        status: "FAILED",
        completed_at: new Date().toISOString(),
        error,
      };
      await this.store.update(jobId, {
        status: "FAILED",
        stage: timedOutModule ? "MODULE_TIMEOUT" : "MODULE_FAILED",
        progress: Math.max(2, moduleProgress(states)),
        modules: states,
        failed_module: failedModule,
        run_directory: path.join(
          this.projectDirectory,
          "runs",
          job.run_id,
        ),
        error,
      });
      return;
    }

    const runDirectory = path.join(this.projectDirectory, "runs", job.run_id);
    if (pipelineMode === "plan") {
      const document = JSON.parse(
        await readFile(path.join(runDirectory, "01_document.json"), "utf8"),
      ) as { total_pages?: number };
      await this.store.update(jobId, {
        status: "AWAITING_APPROVAL",
        stage: "AWAITING_APPROVAL",
        progress: 30,
        run_directory: runDirectory,
        document_pages: document.total_pages,
        failed_module: undefined,
        resume_from: undefined,
        error: undefined,
      });
      return;
    }
    const manifest = JSON.parse(
      await readFile(
        path.join(runDirectory, "06_video_manifest.json"),
        "utf8",
      ),
    ) as VideoManifest;
    const completed = await this.store.update(jobId, {
      status: "COMPLETED",
      stage: "COMPLETED",
      progress: 100,
      run_directory: runDirectory,
      warnings: manifest.warnings,
      result_duration_seconds: manifest.duration_seconds,
      result_file_size_bytes: manifest.file_size_bytes,
      failed_module: undefined,
      resume_from: undefined,
      error: undefined,
    });
    if (this.firebase) {
      try {
        const artifacts = await this.firebase.uploadArtifacts(completed);
        await this.store.update(jobId, {
          cloud_storage: {
            ...completed.cloud_storage,
            ...artifacts,
          },
        });
      } catch (error) {
        await this.store.update(jobId, {
          warnings: [
            ...completed.warnings,
            `Không thể đồng bộ artifact lên Firebase Storage: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        });
      }
    }
  }
}
