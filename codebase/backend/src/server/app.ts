import { randomUUID } from "node:crypto";
import { constants, createReadStream, createWriteStream } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { pipeline } from "node:stream/promises";
import { pipelineConfigSchema } from "../core/config.js";
import {
  documentSchema,
  lecturePlanSchema,
  videoManifestSchema,
} from "../core/contracts.js";
import {
  generateSummary,
  summaryArtifactSchema,
} from "../modules/module7_summary_generator/index.js";
import {
  JobRunner,
  moduleProgress,
  moduleStatesForRetry,
} from "./job-runner.js";
import { JobStore } from "./job-store.js";
import {
  cloudRunJobDispatcher,
  localJobDispatcher,
  type JobDispatcher,
} from "./job-dispatcher.js";
import {
  createFirebaseServices,
  type AuthenticatedUser,
  type FirebaseServices,
} from "./firebase-services.js";
import {
  applyOutlineDraft,
  defaultOutlineDraft,
  outlineDraftSchema,
  outlinePreview,
} from "./outline-service.js";
import {
  createJobFieldsSchema,
  feedbackSchema,
  initialModuleStates,
  toPublicJob,
  type JobRecord,
} from "./types.js";
import { buildResultDetail } from "./result-service.js";
import {
  assertCanCreateJob,
  QuotaExceededError,
  quotaLimitsFromEnv,
  quotaSnapshot,
  reservationSeconds,
  type UserQuotaLimits,
} from "./quota-service.js";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeRunDirectory(projectDirectory: string, job: JobRecord): string {
  if (!job.run_directory) throw new Error("Job chưa có run directory.");
  const runsRoot = path.resolve(projectDirectory, "runs");
  const resolved = path.resolve(job.run_directory);
  const relative = path.relative(runsRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Run directory nằm ngoài phạm vi cho phép.");
  }
  return resolved;
}

function safeArtifactPath(
  projectDirectory: string,
  runDirectory: string,
  candidate: string,
): string {
  const resolved = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(projectDirectory, candidate);
  const relative = path.relative(path.resolve(runDirectory), resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Artifact nằm ngoài run directory.");
  }
  return resolved;
}

function safePathWithin(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Đường dẫn xóa nằm ngoài phạm vi cho phép.");
  }
  return resolved;
}

export async function createServer(
  projectDirectory: string,
  options: {
    backendDirectory?: string;
    autoRunJobs?: boolean;
    authRequired?: boolean;
    firebaseServices?: FirebaseServices;
    quotaLimits?: Partial<UserQuotaLimits>;
    retentionDays?: number;
    jobDispatcher?: JobDispatcher;
  } = {},
): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    bodyLimit: MAX_UPLOAD_BYTES + 1024 * 1024,
  });
  const backendDirectory =
    options.backendDirectory ?? path.join(projectDirectory, "backend-data");
  const autoRunJobs = options.autoRunJobs ?? true;
  const uploadsDirectory = path.join(backendDirectory, "uploads");
  const jobsDirectory = path.join(backendDirectory, "jobs");
  await mkdir(uploadsDirectory, { recursive: true });
  await mkdir(jobsDirectory, { recursive: true });
  const authRequired =
    options.authRequired ??
    (process.env.FIREBASE_AUTH_REQUIRED ?? "false").toLowerCase() === "true";
  const cloudPersistence =
    (process.env.PERSISTENCE_MODE ?? "local").toLowerCase() === "cloud";
  const firebase =
    options.firebaseServices ??
    (authRequired || cloudPersistence
      ? createFirebaseServices({
          projectId:
            process.env.GOOGLE_CLOUD_PROJECT ??
            "project-5d300c02-d165-4037-b6f",
          storageBucket:
            process.env.FIREBASE_STORAGE_BUCKET ??
            "project-5d300c02-d165-4037-b6f.firebasestorage.app",
        })
      : undefined);
  const store = new JobStore(
    jobsDirectory,
    firebase
      ? {
          loadAll:
            cloudPersistence && firebase.loadJobs
              ? () => firebase.loadJobs!()
              : undefined,
          persist: (job) => firebase.persistJob(job),
        }
      : undefined,
    !cloudPersistence,
  );
  await store.initialize();
  const quotaLimits = {
    ...quotaLimitsFromEnv(),
    ...options.quotaLimits,
  };
  const retentionDays =
    options.retentionDays ??
    Math.max(0, Number(process.env.JOB_RETENTION_DAYS ?? 0) || 0);

  async function deleteJobData(job: JobRecord): Promise<void> {
    await firebase?.deleteJob?.(job);
    if (job.input_file) {
      const inputPath = safePathWithin(uploadsDirectory, job.input_file);
      await unlink(inputPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    if (job.run_directory) {
      await rm(safeRunDirectory(projectDirectory, job), {
        recursive: true,
        force: true,
      });
    }
    const configDirectory = path.resolve(
      projectDirectory,
      "backend-data",
      "jobs",
    );
    if (/^[a-zA-Z0-9_-]+$/u.test(job.run_id)) {
      await unlink(
        safePathWithin(
          configDirectory,
          path.join(configDirectory, `${job.run_id}.config.json`),
        ),
      ).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    await store.delete(job.id);
  }

  async function deleteVideoData(job: JobRecord): Promise<JobRecord> {
    await firebase?.deleteArtifacts?.(job);
    const module1MarkedCompleted =
      job.modules?.module1_document_intelligence.status === "COMPLETED";
    if (module1MarkedCompleted && !job.run_directory) {
      job = await materializeRunDirectory(job).catch(() => job);
    }
    const candidateRunDirectory =
      module1MarkedCompleted && job.run_directory
        ? safeRunDirectory(projectDirectory, job)
        : undefined;
    const module1Completed = candidateRunDirectory
      ? await stat(path.join(candidateRunDirectory, "01_document.json"))
          .then(() => true)
          .catch(() => false)
      : false;
    const runDirectory = module1Completed
      ? candidateRunDirectory
      : undefined;

    if (runDirectory) {
      const preservedRunEntries = new Set([
        "00_config.json",
        "01_document.json",
        "07_summary.json",
        "assets",
      ]);
      for (const entry of await readdir(runDirectory, {
        withFileTypes: true,
      })) {
        if (!preservedRunEntries.has(entry.name)) {
          await rm(path.join(runDirectory, entry.name), {
            recursive: entry.isDirectory(),
            force: true,
          });
        }
      }
      const assetsDirectory = path.join(runDirectory, "assets");
      try {
        for (const entry of await readdir(assetsDirectory, {
          withFileTypes: true,
        })) {
          if (entry.name !== "pages") {
            await rm(path.join(assetsDirectory, entry.name), {
              recursive: entry.isDirectory(),
              force: true,
            });
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    } else if (job.run_directory) {
      await rm(safeRunDirectory(projectDirectory, job), {
        recursive: true,
        force: true,
      });
    }

    const configDirectory = path.resolve(
      projectDirectory,
      "backend-data",
      "jobs",
    );
    if (/^[a-zA-Z0-9_-]+$/u.test(job.run_id)) {
      await unlink(
        safePathWithin(
          configDirectory,
          path.join(configDirectory, `${job.run_id}.config.json`),
        ),
      ).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }

    const states = initialModuleStates();
    if (module1Completed) {
      states.module1_document_intelligence = {
        ...job.modules?.module1_document_intelligence,
        status: "COMPLETED",
      };
    }
    let preservedCloudStorage: Record<string, string> | undefined = job.cloud_storage?.input
      ? { input: job.cloud_storage.input }
      : undefined;
    if (firebase?.deleteRunArtifacts) await firebase.deleteRunArtifacts(job);
    if (runDirectory && firebase?.uploadRunDirectory) {
      const runStorage = await firebase.uploadRunDirectory({
        ...job,
        run_directory: runDirectory,
      });
      preservedCloudStorage = { ...preservedCloudStorage, ...runStorage };
    }
    return store.update(job.id, {
      kind: "DOCUMENT",
      status: module1Completed ? "COMPLETED" : "QUEUED",
      stage: module1Completed ? "DOCUMENT_READY" : "QUEUED",
      progress: module1Completed ? 100 : 0,
      run_id: module1Completed
        ? job.run_id
        : `${job.id}_document_${job.attempt + 1}`,
      run_directory: module1Completed ? runDirectory : undefined,
      modules: states,
      cloud_storage: preservedCloudStorage,
      quota_reserved_seconds: 0,
      result_duration_seconds: undefined,
      result_file_size_bytes: undefined,
      outline_draft: undefined,
      approved_at: undefined,
      feedback: undefined,
      failed_module: undefined,
      resume_from: undefined,
      bypass_generation_cache: undefined,
      warnings: [],
      error: undefined,
    });
  }

  if (retentionDays > 0) {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const expired = store.list().filter(
      (job) =>
        ["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) &&
        Date.parse(job.updated_at) < cutoff,
    );
    for (const job of expired) {
      await deleteJobData(job).catch((error) => {
        server.log.warn(
          { err: error, jobId: job.id },
          "Retention cleanup failed",
        );
      });
    }
  }
  const runner = new JobRunner(
    store,
    projectDirectory,
    process.env.PIPELINE_TIMEOUT_MS
      ? Number(process.env.PIPELINE_TIMEOUT_MS)
      : undefined,
    firebase,
  );
  const dispatcher =
    options.jobDispatcher ??
    ((process.env.PIPELINE_EXECUTION_MODE ?? "local") === "cloud-run-job"
      ? cloudRunJobDispatcher({
          projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "",
          region: process.env.CLOUD_RUN_REGION ?? "asia-southeast1",
          jobName: process.env.CLOUD_RUN_JOB_NAME ?? "ai-lecture-worker",
        })
      : localJobDispatcher(runner));

  async function dispatchJob(jobId: string): Promise<void> {
    if (autoRunJobs) await dispatcher.dispatch(jobId);
  }

  async function materializeRunDirectory(job: JobRecord): Promise<JobRecord> {
    if (job.run_directory) {
      const exists = await stat(job.run_directory).then(() => true).catch(() => false);
      if (exists) return job;
    }
    if (!firebase?.downloadRunDirectory || !job.cloud_storage?.run_prefix) {
      throw new Error("Job chưa có run artifacts khả dụng.");
    }
    const runDirectory = path.join(projectDirectory, "runs", job.run_id);
    const cached = await stat(runDirectory).then(() => true).catch(() => false);
    if (cached) return store.update(job.id, { run_directory: runDirectory });
    await mkdir(runDirectory, { recursive: true });
    await firebase.downloadRunDirectory(job, runDirectory);
    return store.update(job.id, { run_directory: runDirectory });
  }

  async function authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedUser> {
    if (!authRequired) return { uid: "local-development" };
    const match = authorization?.match(/^Bearer\s+(.+)$/iu);
    if (!match?.[1] || !firebase) {
      throw new Error("Thiếu Firebase ID token.");
    }
    return firebase.verifyIdToken(match[1]);
  }

  function ownsJob(job: JobRecord, user: AuthenticatedUser): boolean {
    return job.owner_uid === user.uid;
  }

  async function loadOutlineArtifacts(job: JobRecord) {
    job = await materializeRunDirectory(job);
    const runDirectory = safeRunDirectory(projectDirectory, job);
    const [document, plan, config] = await Promise.all([
      readFile(path.join(runDirectory, "01_document.json"), "utf8").then(
        (raw) => documentSchema.parse(JSON.parse(raw)),
      ),
      readFile(path.join(runDirectory, "02_lecture_plan.json"), "utf8").then(
        (raw) => lecturePlanSchema.parse(JSON.parse(raw)),
      ),
      readFile(path.join(runDirectory, "00_config.json"), "utf8").then((raw) =>
        pipelineConfigSchema.parse(JSON.parse(raw)),
      ),
    ]);
    return { runDirectory, document, plan, config };
  }

  async function loadResultArtifacts(job: JobRecord) {
    job = await materializeRunDirectory(job);
    const runDirectory = safeRunDirectory(projectDirectory, job);
    const [document, plan, manifest] = await Promise.all([
      readFile(path.join(runDirectory, "01_document.json"), "utf8").then(
        (raw) => documentSchema.parse(JSON.parse(raw)),
      ),
      readFile(path.join(runDirectory, "02_lecture_plan.json"), "utf8").then(
        (raw) => lecturePlanSchema.parse(JSON.parse(raw)),
      ),
      readFile(path.join(runDirectory, "06_video_manifest.json"), "utf8").then(
        (raw) => videoManifestSchema.parse(JSON.parse(raw)),
      ),
    ]);
    return { runDirectory, document, plan, manifest };
  }

  await server.register(cors, {
    origin: (origin, callback) => {
      const allowed = new Set(
        (process.env.FRONTEND_ORIGINS ??
          "http://localhost:4173,http://127.0.0.1:4173")
          .split(",")
          .map((value) => value.trim()),
      );
      callback(null, !origin || allowed.has(origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  await server.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });
  await server.register(multipart, {
    limits: {
      files: 1,
      fileSize: MAX_UPLOAD_BYTES,
      fields: 10,
    },
  });
  if (cloudPersistence) {
    server.addHook("preHandler", async (request) => {
      if (request.url !== "/api/health") await store.synchronize();
    });
  }

  server.get("/api/health", async () => ({
    status: "ok",
    queue_length: store.list().filter((job) => job.status === "QUEUED").length,
    active_job:
      store.list().find((job) => job.status === "RUNNING")?.id ?? null,
  }));

  server.get("/api/jobs", async (request, reply) => {
    try {
      const user = await authenticate(request.headers.authorization);
      return {
        jobs: store
          .list()
          .filter((job) => ownsJob(job, user))
          .map(toPublicJob),
      };
    } catch (error) {
      return reply.code(401).send({
        error: "UNAUTHENTICATED",
        message: errorMessage(error),
      });
    }
  });

  server.get("/api/quota", async (request, reply) => {
    try {
      const user = await authenticate(request.headers.authorization);
      return {
        ...quotaSnapshot(store.list(), user.uid, quotaLimits),
        retention_days: retentionDays,
      };
    } catch (error) {
      return reply.code(401).send({
        error: "UNAUTHENTICATED",
        message: errorMessage(error),
      });
    }
  });

  server.get<{ Params: { id: string } }>(
    "/api/jobs/:id",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      return toPublicJob(job);
    },
  );

  server.post("/api/jobs", async (request, reply) => {
    let user: AuthenticatedUser;
    try {
      user = await authenticate(request.headers.authorization);
    } catch (error) {
      return reply.code(401).send({
        error: "UNAUTHENTICATED",
        message: errorMessage(error),
      });
    }
    const id = randomUUID();
    const uploadPath = path.join(uploadsDirectory, `${id}.pdf`);
    const fields: Record<string, string> = {};
    let originalFilename = "";
    let uploaded = false;
    let fileWritten = false;
    try {
      for await (const part of request.parts()) {
        if (part.type === "file") {
          if (uploaded) {
            part.file.resume();
            continue;
          }
          originalFilename = path.basename(part.filename || "document.pdf");
          if (
            part.mimetype !== "application/pdf" &&
            !originalFilename.toLowerCase().endsWith(".pdf")
          ) {
            part.file.resume();
            throw new Error("Chỉ chấp nhận file PDF.");
          }
          await pipeline(part.file, createWriteStream(uploadPath, { flags: "wx" }));
          fileWritten = true;
          if (part.file.truncated) {
            throw new Error("PDF vượt giới hạn 50 MB.");
          }
          uploaded = true;
        } else {
          fields[part.fieldname] = String(part.value);
        }
      }
      if (!uploaded) throw new Error("Thiếu trường file PDF.");
      const header = await readFile(uploadPath);
      if (
        header.length < 5 ||
        header.subarray(0, 5).toString("ascii") !== "%PDF-"
      ) {
        throw new Error("File không có PDF magic bytes hợp lệ.");
      }
      const inputStat = await stat(uploadPath);
      const parsedFields = createJobFieldsSchema.parse(fields);
      assertCanCreateJob(
        quotaSnapshot(store.list(), user.uid, quotaLimits),
        inputStat.size,
        parsedFields,
      );
      const now = new Date().toISOString();
      const job: JobRecord = {
        id,
        owner_uid: user.uid,
        owner_email: user.email,
        run_id: id,
        status: "QUEUED",
        stage: "QUEUED",
        progress: 0,
        created_at: now,
        updated_at: now,
        input_file: uploadPath,
        original_filename: originalFilename,
        input_size_bytes: inputStat.size,
        fields: parsedFields,
        quota_reserved_seconds: reservationSeconds(parsedFields),
        attempt: 1,
        warnings: [],
        modules: initialModuleStates(),
      };
      if (firebase) {
        job.cloud_storage = {
          input: await firebase.uploadInput(job),
        };
      }
      await store.create(job);
      await dispatchJob(id);
      if (cloudPersistence) await unlink(uploadPath).catch(() => undefined);
      return reply.code(202).send(toPublicJob(job));
    } catch (error) {
      if (uploaded || fileWritten) {
        await unlink(uploadPath).catch(() => undefined);
      }
      request.log.warn({ err: error }, "Create job rejected");
      const quotaError =
        error instanceof QuotaExceededError ? error : undefined;
      return reply.code(quotaError ? 429 : 400).send({
        error: quotaError?.code ?? "INVALID_JOB_REQUEST",
        message: errorMessage(error),
      });
    }
  });

  server.post("/api/documents", async (request, reply) => {
    let user: AuthenticatedUser;
    try {
      user = await authenticate(request.headers.authorization);
    } catch (error) {
      return reply.code(401).send({
        error: "UNAUTHENTICATED",
        message: errorMessage(error),
      });
    }
    const id = randomUUID();
    const uploadPath = path.join(uploadsDirectory, `${id}.pdf`);
    let originalFilename = "";
    let uploaded = false;
    let fileWritten = false;
    try {
      for await (const part of request.parts()) {
        if (part.type !== "file" || uploaded) {
          if (part.type === "file") part.file.resume();
          continue;
        }
        originalFilename = path.basename(part.filename || "document.pdf");
        if (
          part.mimetype !== "application/pdf" &&
          !originalFilename.toLowerCase().endsWith(".pdf")
        ) {
          part.file.resume();
          throw new Error("Chỉ chấp nhận file PDF.");
        }
        await pipeline(part.file, createWriteStream(uploadPath, { flags: "wx" }));
        fileWritten = true;
        if (part.file.truncated) throw new Error("PDF vượt giới hạn 50 MB.");
        uploaded = true;
      }
      if (!uploaded) throw new Error("Thiếu trường file PDF.");
      const header = await readFile(uploadPath);
      if (
        header.length < 5 ||
        header.subarray(0, 5).toString("ascii") !== "%PDF-"
      ) {
        throw new Error("File không có PDF magic bytes hợp lệ.");
      }
      const inputStat = await stat(uploadPath);
      const defaultFields = createJobFieldsSchema.parse({});
      assertCanCreateJob(
        quotaSnapshot(store.list(), user.uid, quotaLimits),
        inputStat.size,
        defaultFields,
        false,
      );
      const now = new Date().toISOString();
      const job: JobRecord = {
        kind: "DOCUMENT",
        id,
        owner_uid: user.uid,
        owner_email: user.email,
        run_id: id,
        status: "QUEUED",
        stage: "QUEUED",
        progress: 0,
        created_at: now,
        updated_at: now,
        input_file: uploadPath,
        original_filename: originalFilename,
        input_size_bytes: inputStat.size,
        fields: defaultFields,
        quota_reserved_seconds: 0,
        attempt: 1,
        warnings: [],
        modules: initialModuleStates(),
      };
      if (firebase) {
        job.cloud_storage = { input: await firebase.uploadInput(job) };
      }
      await store.create(job);
      await dispatchJob(id);
      if (cloudPersistence) await unlink(uploadPath).catch(() => undefined);
      return reply.code(202).send(toPublicJob(job));
    } catch (error) {
      if (uploaded || fileWritten) {
        await unlink(uploadPath).catch(() => undefined);
      }
      const quotaError =
        error instanceof QuotaExceededError ? error : undefined;
      return reply.code(quotaError ? 429 : 400).send({
        error: quotaError?.code ?? "INVALID_DOCUMENT_REQUEST",
        message: errorMessage(error),
      });
    }
  });

  server.post<{ Params: { id: string }; Body: unknown }>(
    "/api/documents/:id/video",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      let job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "DOCUMENT_NOT_FOUND" });
      }
      if (job.stage === "DOCUMENT_READY" && !job.run_directory) {
        const existingJob = job;
        job = await materializeRunDirectory(existingJob).catch(() => existingJob);
      }
      if (job.stage !== "DOCUMENT_READY" || !job.run_directory) {
        return reply.code(409).send({
          error: "DOCUMENT_NOT_READY",
          message: "Tài liệu vẫn đang được phân tích.",
        });
      }
      try {
        const fields = createJobFieldsSchema.parse(request.body);
        assertCanCreateJob(
          quotaSnapshot(store.list(), user.uid, quotaLimits),
          0,
          fields,
        );
        const states = initialModuleStates();
        states.module1_document_intelligence = {
          status: "COMPLETED",
          ...job.modules?.module1_document_intelligence,
        };
        const updated = await store.update(job.id, {
          kind: "VIDEO",
          fields,
          quota_reserved_seconds: reservationSeconds(fields),
          status: "QUEUED",
          stage: "QUEUED",
          progress: moduleProgress(states),
          modules: states,
          resume_from: "module2_lecture_planner",
          failed_module: undefined,
          error: undefined,
        });
        await dispatchJob(job.id);
        return reply.code(202).send(toPublicJob(updated));
      } catch (error) {
        const quotaError =
          error instanceof QuotaExceededError ? error : undefined;
        return reply.code(quotaError ? 429 : 400).send({
          error: quotaError?.code ?? "INVALID_VIDEO_CONFIG",
          message: errorMessage(error),
        });
      }
    },
  );

  server.get<{ Params: { id: string } }>(
    "/api/documents/:id/file",
    async (request, reply) => {
      try {
        const user = await authenticate(request.headers.authorization);
        const job = store.get(request.params.id);
        if (!job || !ownsJob(job, user)) {
          return reply.code(404).send({ error: "DOCUMENT_NOT_FOUND" });
        }
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `inline; filename="${job.original_filename.replaceAll('"', "")}"`,
        );
        if (firebase?.downloadObject && job.cloud_storage?.input) {
          return reply.send(await firebase.downloadObject(job.cloud_storage.input));
        }
        await stat(job.input_file);
        return reply.send(createReadStream(job.input_file));
      } catch (error) {
        return reply.code(401).send({
          error: "DOCUMENT_UNAVAILABLE",
          message: errorMessage(error),
        });
      }
    },
  );

  server.post<{ Params: { id: string } }>(
    "/api/documents/:id/summary",
    async (request, reply) => {
      try {
        const user = await authenticate(request.headers.authorization);
        const job = store.get(request.params.id);
        if (!job || !ownsJob(job, user)) {
          return reply.code(404).send({ error: "DOCUMENT_NOT_FOUND" });
        }
        const localJob = await materializeRunDirectory(job);
        const runDirectory = safeRunDirectory(projectDirectory, localJob);
        const summaryPath = path.join(runDirectory, "07_summary.json");
        try {
          return summaryArtifactSchema.parse(
            JSON.parse(await readFile(summaryPath, "utf8")),
          );
        } catch {
          const document = documentSchema.parse(
            JSON.parse(
              await readFile(path.join(runDirectory, "01_document.json"), "utf8"),
            ),
          );
          const summary = await generateSummary(document, job.fields.language);
          await writeFile(
            summaryPath,
            `${JSON.stringify(summary, null, 2)}\n`,
            "utf8",
          );
          if (firebase?.uploadRunDirectory) {
            const runStorage = await firebase.uploadRunDirectory(localJob);
            await store.update(job.id, {
              cloud_storage: { ...job.cloud_storage, ...runStorage },
            });
          }
          return summary;
        }
      } catch (error) {
        return reply.code(409).send({
          error: "SUMMARY_NOT_AVAILABLE",
          message: errorMessage(error),
        });
      }
    },
  );

  server.delete<{ Params: { id: string } }>(
    "/api/jobs/:id/video",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user) || (job.kind ?? "VIDEO") !== "VIDEO") {
        return reply.code(404).send({ error: "VIDEO_NOT_FOUND" });
      }
      if (["QUEUED", "RUNNING"].includes(job.status)) {
        return reply.code(409).send({
          error: "VIDEO_NOT_DELETABLE",
          message: "Hãy hủy xử lý trước khi xóa video.",
        });
      }
      try {
        const preservedDocument = await deleteVideoData(job);
        if (preservedDocument.status === "QUEUED") {
          await dispatchJob(job.id);
        }
        return {
          deleted: true,
          preserved_document: true,
          document: toPublicJob(preservedDocument),
        };
      } catch (error) {
        request.log.error(
          { err: error, jobId: job.id },
          "Delete video failed",
        );
        return reply.code(500).send({
          error: "VIDEO_DELETE_FAILED",
          message: errorMessage(error),
        });
      }
    },
  );

  server.delete<{ Params: { id: string } }>(
    "/api/jobs/:id",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status === "QUEUED" || job.status === "RUNNING") {
        return reply.code(409).send({
          error: "JOB_NOT_DELETABLE",
          message: "Hãy hủy xử lý trước khi xóa job.",
        });
      }
      try {
        await deleteJobData(job);
        return { deleted: true, id: job.id };
      } catch (error) {
        request.log.error({ err: error, jobId: job.id }, "Delete job failed");
        return reply.code(500).send({
          error: "JOB_DELETE_FAILED",
          message: errorMessage(error),
        });
      }
    },
  );

  server.post<{ Params: { id: string } }>(
    "/api/jobs/:id/cancel",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      const cancelled = await runner.cancel(job.id);
      if (!cancelled) {
        return reply.code(409).send({
          error: "JOB_NOT_CANCELLABLE",
          status: job.status,
        });
      }
      return toPublicJob(store.get(job.id)!);
    },
  );

  server.post<{ Params: { id: string } }>(
    "/api/jobs/:id/retry",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "FAILED" && job.status !== "CANCELLED") {
        return reply.code(409).send({
          error: "JOB_NOT_RETRYABLE",
          status: job.status,
        });
      }
      const resumableJob =
        !job.run_directory && job.cloud_storage?.run_prefix
          ? await materializeRunDirectory(job)
          : job;
      const attempt = job.attempt + 1;
      const durationRepair =
        job.error?.includes("DURATION_OUT_OF_RANGE") ?? false;
      const retryModule = durationRepair
        ? "module3_script_generator"
        : resumableJob.resume_from ?? resumableJob.failed_module;
      const resumeStates =
        retryModule && resumableJob.run_directory
          ? moduleStatesForRetry(resumableJob.modules, retryModule)
          : undefined;
      const updated =
        retryModule && resumableJob.run_directory && resumeStates
          ? await store.update(job.id, {
              status: "QUEUED",
              stage: "QUEUED_FOR_MODULE_RETRY",
              progress: moduleProgress(resumeStates),
              attempt,
              modules: resumeStates,
              resume_from: retryModule,
              bypass_generation_cache:
                durationRepair ||
                job.bypass_generation_cache,
              failed_module: undefined,
              error: undefined,
            })
          : await store.update(job.id, {
              run_id: `${job.id}_attempt_${attempt}`,
              status: "QUEUED",
              stage: "QUEUED",
              progress: 0,
              attempt,
              run_directory: undefined,
              approved_at: undefined,
              outline_draft: undefined,
              error: undefined,
              warnings: [],
              modules: initialModuleStates(),
              failed_module: undefined,
              resume_from: undefined,
              bypass_generation_cache: undefined,
            });
      await dispatchJob(job.id);
      return reply.code(202).send(toPublicJob(updated));
    },
  );

  server.get<{ Params: { id: string } }>(
    "/api/jobs/:id/outline",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "AWAITING_APPROVAL") {
        return reply.code(409).send({
          error: "OUTLINE_NOT_AVAILABLE",
          status: job.status,
        });
      }
      try {
        const { document, plan } = await loadOutlineArtifacts(job);
        return outlinePreview(
          job.id,
          document,
          plan,
          job.outline_draft ?? defaultOutlineDraft(plan),
        );
      } catch (error) {
        return reply.code(500).send({
          error: "OUTLINE_ARTIFACT_INVALID",
          message: errorMessage(error),
        });
      }
    },
  );

  server.put<{ Params: { id: string }; Body: unknown }>(
    "/api/jobs/:id/outline",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "AWAITING_APPROVAL") {
        return reply.code(409).send({
          error: "OUTLINE_NOT_EDITABLE",
          status: job.status,
        });
      }
      try {
        const draft = outlineDraftSchema.parse(request.body);
        const { document, plan, config } = await loadOutlineArtifacts(job);
        applyOutlineDraft(plan, draft, config);
        await store.update(job.id, { outline_draft: draft });
        return outlinePreview(job.id, document, plan, draft);
      } catch (error) {
        return reply.code(400).send({
          error: "INVALID_OUTLINE",
          message: errorMessage(error),
        });
      }
    },
  );

  server.post<{ Params: { id: string }; Body: unknown }>(
    "/api/jobs/:id/approve",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "AWAITING_APPROVAL") {
        return reply.code(409).send({
          error: "OUTLINE_NOT_APPROVABLE",
          status: job.status,
        });
      }
      try {
        const { runDirectory, plan, config } = await loadOutlineArtifacts(job);
        const hasBody =
          request.body &&
          typeof request.body === "object" &&
          Object.keys(request.body as Record<string, unknown>).length > 0;
        const draft = outlineDraftSchema.parse(
          hasBody
            ? request.body
            : job.outline_draft ?? defaultOutlineDraft(plan),
        );
        const approvedPlan = lecturePlanSchema.parse(
          applyOutlineDraft(plan, draft, config),
        );
        await copyFile(
          path.join(runDirectory, "02_lecture_plan.json"),
          path.join(runDirectory, "02_lecture_plan.original.json"),
          constants.COPYFILE_EXCL,
        ).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "EEXIST") throw error;
        });
        await writeFile(
          path.join(runDirectory, "02_lecture_plan.json"),
          `${JSON.stringify(approvedPlan, null, 2)}\n`,
          "utf8",
        );
        const updated = await store.update(job.id, {
          status: "QUEUED",
          stage: "QUEUED_AFTER_APPROVAL",
          progress: 30,
          outline_draft: draft,
          approved_at: new Date().toISOString(),
          modules: {
            ...initialModuleStates(),
            ...job.modules,
            module1_document_intelligence: {
              status: "COMPLETED",
              ...job.modules?.module1_document_intelligence,
            },
            module2_lecture_planner: {
              status: "COMPLETED",
              ...job.modules?.module2_lecture_planner,
            },
          },
          error: undefined,
        });
        if (firebase?.uploadRunDirectory) {
          const runStorage = await firebase.uploadRunDirectory(updated);
          await store.update(job.id, {
            cloud_storage: { ...updated.cloud_storage, ...runStorage },
          });
        }
        await dispatchJob(job.id);
        return reply.code(202).send(toPublicJob(updated));
      } catch (error) {
        return reply.code(400).send({
          error: "OUTLINE_APPROVAL_FAILED",
          message: errorMessage(error),
        });
      }
    },
  );

  server.get<{ Params: { id: string; page: string } }>(
    "/api/jobs/:id/outline/pages/:page/thumbnail",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "AWAITING_APPROVAL") {
        return reply.code(409).send({ error: "OUTLINE_NOT_AVAILABLE" });
      }
      try {
        const { runDirectory, document } = await loadOutlineArtifacts(job);
        const pageNumber = Number(request.params.page);
        const pageArtifact = document.pages.find(
          (item) => item.page === pageNumber,
        );
        if (!pageArtifact) {
          return reply.code(404).send({ error: "PAGE_NOT_FOUND" });
        }
        const thumbnailPath = safeArtifactPath(
          projectDirectory,
          runDirectory,
          pageArtifact.assets.thumbnail_path,
        );
        await stat(thumbnailPath);
        reply.header("Content-Type", "image/png");
        reply.header("X-Content-Type-Options", "nosniff");
        return reply.send(createReadStream(thumbnailPath));
      } catch (error) {
        return reply.code(500).send({
          error: "THUMBNAIL_UNAVAILABLE",
          message: errorMessage(error),
        });
      }
    },
  );

  server.get<{ Params: { id: string } }>(
    "/api/jobs/:id/feedback",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "COMPLETED") {
        return reply.code(409).send({ error: "JOB_NOT_COMPLETED" });
      }
      return { feedback: job.feedback ?? null };
    },
  );

  server.put<{
    Params: { id: string };
    Body: unknown;
  }>("/api/jobs/:id/feedback", async (request, reply) => {
    let user: AuthenticatedUser;
    try {
      user = await authenticate(request.headers.authorization);
    } catch (error) {
      return reply.code(401).send({
        error: "UNAUTHENTICATED",
        message: errorMessage(error),
      });
    }
    const job = store.get(request.params.id);
    if (!job || !ownsJob(job, user)) {
      return reply.code(404).send({ error: "JOB_NOT_FOUND" });
    }
    if (job.status !== "COMPLETED") {
      return reply.code(409).send({ error: "JOB_NOT_COMPLETED" });
    }
    const parsed = feedbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "INVALID_FEEDBACK",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
    }
    const now = new Date().toISOString();
    const updated = await store.update(job.id, {
      feedback: {
        ...parsed.data,
        created_at: job.feedback?.created_at ?? now,
        updated_at: now,
      },
    });
    return { feedback: updated.feedback };
  });

  server.get<{
    Params: {
      id: string;
      kind: "video" | "subtitle" | "coverage" | "thumbnail";
    };
  }>("/api/jobs/:id/artifacts/:kind", async (request, reply) => {
    let user: AuthenticatedUser;
    try {
      user = await authenticate(request.headers.authorization);
    } catch (error) {
      return reply.code(401).send({
        error: "UNAUTHENTICATED",
        message: errorMessage(error),
      });
    }
    const job = store.get(request.params.id);
    if (!job || !ownsJob(job, user)) {
      return reply.code(404).send({ error: "JOB_NOT_FOUND" });
    }
    if (job.status !== "COMPLETED") {
      return reply.code(409).send({ error: "JOB_NOT_COMPLETED" });
    }
    const artifactMeta = {
      video: { type: "video/mp4", name: `${job.id}.mp4` },
      subtitle: {
        type: "application/x-subrip; charset=utf-8",
        name: `${job.id}.srt`,
      },
      coverage: {
        type: "application/json; charset=utf-8",
        name: `${job.id}-coverage.json`,
      },
      thumbnail: { type: "image/png", name: `${job.id}-thumbnail.png` },
    } as const;
    const cloudUri = job.cloud_storage?.[request.params.kind];
    if (cloudUri && firebase?.downloadObject) {
      const meta = artifactMeta[request.params.kind];
      reply.header("Content-Type", meta.type);
      reply.header("Content-Disposition", `inline; filename="${meta.name}"`);
      reply.header("X-Content-Type-Options", "nosniff");
      return reply.send(await firebase.downloadObject(cloudUri));
    }
    const localJob = await materializeRunDirectory(job);
    const runDirectory = safeRunDirectory(projectDirectory, localJob);
    const staticArtifacts = {
      video: {
        path: path.join(runDirectory, "lecture.mp4"),
        type: "video/mp4",
        name: `${job.id}.mp4`,
      },
      subtitle: {
        path: path.join(runDirectory, "lecture.srt"),
        type: "application/x-subrip; charset=utf-8",
        name: `${job.id}.srt`,
      },
      coverage: {
        path: path.join(runDirectory, "coverage-report.json"),
        type: "application/json; charset=utf-8",
        name: `${job.id}-coverage.json`,
      },
    };
    let artifact:
      | { path: string; type: string; name: string }
      | undefined = staticArtifacts[
      request.params.kind as keyof typeof staticArtifacts
    ];
    if (request.params.kind === "thumbnail") {
      const visualDirectory = path.join(runDirectory, "assets", "visuals");
      const firstPng = (await readdir(visualDirectory))
        .filter((name) => name.endsWith(".png"))
        .sort()[0];
      if (firstPng) {
        artifact = {
          path: path.join(visualDirectory, firstPng),
          type: "image/png",
          name: `${job.id}-thumbnail.png`,
        };
      }
    }
    if (!artifact) return reply.code(404).send({ error: "ARTIFACT_NOT_FOUND" });
    await stat(artifact.path);
    reply.header("Content-Type", artifact.type);
    reply.header(
      "Content-Disposition",
      `inline; filename="${artifact.name}"`,
    );
    reply.header("X-Content-Type-Options", "nosniff");
    return reply.send(createReadStream(artifact.path));
  });

  server.get<{ Params: { id: string } }>(
    "/api/jobs/:id/result",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "COMPLETED") {
        return reply.code(409).send({ error: "JOB_NOT_COMPLETED" });
      }
      try {
        const { document, plan, manifest } = await loadResultArtifacts(job);
        return buildResultDetail(job.id, document, plan, manifest);
      } catch (error) {
        return reply.code(500).send({
          error: "RESULT_UNAVAILABLE",
          message: errorMessage(error),
        });
      }
    },
  );

  server.get<{ Params: { id: string; page: string } }>(
    "/api/jobs/:id/result/pages/:page",
    async (request, reply) => {
      let user: AuthenticatedUser;
      try {
        user = await authenticate(request.headers.authorization);
      } catch (error) {
        return reply.code(401).send({
          error: "UNAUTHENTICATED",
          message: errorMessage(error),
        });
      }
      const job = store.get(request.params.id);
      if (!job || !ownsJob(job, user)) {
        return reply.code(404).send({ error: "JOB_NOT_FOUND" });
      }
      if (job.status !== "COMPLETED") {
        return reply.code(409).send({ error: "JOB_NOT_COMPLETED" });
      }
      try {
        const { runDirectory, document } = await loadResultArtifacts(job);
        const pageNumber = Number(request.params.page);
        const page = document.pages.find((item) => item.page === pageNumber);
        if (!page) return reply.code(404).send({ error: "PAGE_NOT_FOUND" });
        const imagePath = safeArtifactPath(
          projectDirectory,
          runDirectory,
          page.assets.page_image_path,
        );
        await stat(imagePath);
        reply.header("Content-Type", "image/png");
        reply.header("X-Content-Type-Options", "nosniff");
        return reply.send(createReadStream(imagePath));
      } catch (error) {
        return reply.code(500).send({
          error: "PAGE_UNAVAILABLE",
          message: errorMessage(error),
        });
      }
    },
  );

  if (autoRunJobs) {
    for (const job of store.list().filter((item) => item.status === "QUEUED")) {
      await dispatcher.dispatch(job.id);
    }
  }
  return server;
}
