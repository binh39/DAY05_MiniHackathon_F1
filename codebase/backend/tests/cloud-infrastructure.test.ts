import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { JobStore } from "../src/server/job-store.js";
import { initialModuleStates, type JobRecord } from "../src/server/types.js";

function job(): JobRecord {
  const now = new Date().toISOString();
  return {
    id: "cloud-job",
    owner_uid: "owner",
    run_id: "cloud-job",
    status: "QUEUED",
    stage: "QUEUED",
    progress: 0,
    created_at: now,
    updated_at: now,
    input_file: "",
    original_filename: "lecture.pdf",
    input_size_bytes: 100,
    fields: {
      aspect_ratio: "16:9",
      duration_option: "1-3",
      language: "vi",
      voice_id: "vi-VN-Neural2-A",
      visual_style: "modern_minimal",
    },
    attempt: 1,
    warnings: [],
    modules: initialModuleStates(),
    cloud_storage: { input: "gs://bucket/input.pdf" },
  };
}

test("cloud JobStore loads Firestore state and does not write JSON metadata", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cloud-job-store-"));
  const persisted: JobRecord[] = [];
  try {
    const store = new JobStore(
      directory,
      {
        loadAll: async () => [job()],
        persist: async (value) => {
          persisted.push(value);
        },
      },
      false,
    );
    await store.initialize();
    assert.equal(store.get("cloud-job")?.cloud_storage?.input, "gs://bucket/input.pdf");
    await store.update("cloud-job", { status: "RUNNING", stage: "STARTING" });
    assert.equal(persisted.at(-1)?.status, "RUNNING");
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
