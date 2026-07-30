import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import "dotenv/config";
import { createFirebaseServices } from "./firebase-services.js";
import { JobRunner } from "./job-runner.js";
import { JobStore } from "./job-store.js";

const jobId = process.env.PIPELINE_JOB_ID;
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
if (!jobId || !projectId || !storageBucket) {
  throw new Error(
    "Worker cần PIPELINE_JOB_ID, GOOGLE_CLOUD_PROJECT và FIREBASE_STORAGE_BUCKET.",
  );
}

const firebase = createFirebaseServices({ projectId, storageBucket });
const remoteJob = await firebase.getJob?.(jobId);
if (!remoteJob) throw new Error(`Không tìm thấy job ${jobId} trên Firestore.`);
const inputUri = remoteJob.cloud_storage?.input;
if (!inputUri || !firebase.downloadObject) {
  throw new Error(`Job ${jobId} chưa có PDF nguồn trên Cloud Storage.`);
}

const workspace = await mkdtemp(path.join(os.tmpdir(), "lecture-worker-"));
try {
  const uploadsDirectory = path.join(workspace, "backend-data", "uploads");
  const jobsDirectory = path.join(workspace, "backend-data", "jobs");
  const runDirectory = path.join(workspace, "runs", remoteJob.run_id);
  await Promise.all([
    mkdir(uploadsDirectory, { recursive: true }),
    mkdir(jobsDirectory, { recursive: true }),
    mkdir(runDirectory, { recursive: true }),
  ]);
  const inputFile = path.join(uploadsDirectory, `${remoteJob.id}.pdf`);
  await writeFile(inputFile, await firebase.downloadObject(inputUri));
  await firebase.downloadRunDirectory?.(remoteJob, runDirectory);

  const store = new JobStore(
    jobsDirectory,
    { persist: (job) => firebase.persistJob(job) },
    true,
  );
  await store.initialize();
  await store.create({
    ...remoteJob,
    input_file: inputFile,
    run_directory: remoteJob.cloud_storage?.run_prefix
      ? runDirectory
      : undefined,
  });
  process.env.PIPELINE_CODE_DIRECTORY ??= path.resolve(process.cwd());
  const runner = new JobRunner(store, workspace, undefined, firebase);
  let executionError: unknown;
  try {
    await runner.runNow(jobId);
  } catch (error) {
    executionError = error;
    const current = store.get(jobId);
    if (current && current.status !== "FAILED") {
      await store.update(jobId, {
        status: "FAILED",
        stage: "WORKER_FAILED",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    const completed = store.get(jobId);
    if (completed) {
      const runStorage = await firebase.uploadRunDirectory?.({
        ...completed,
        run_directory: runDirectory,
      });
      if (runStorage) {
        await store.update(jobId, {
          cloud_storage: { ...completed.cloud_storage, ...runStorage },
        });
      }
      if (completed.status === "FAILED") process.exitCode = 1;
    }
  }
  if (executionError) throw executionError;
} finally {
  await rm(workspace, { recursive: true, force: true });
}
