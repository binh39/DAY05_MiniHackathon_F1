import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { JobRecord } from "./types.js";

export class JobStore {
  private readonly jobs = new Map<string, JobRecord>();

  constructor(
    private readonly directory: string,
    private readonly onPersist?: (job: JobRecord) => Promise<void>,
  ) {}

  async initialize(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const files = await readdir(this.directory);
    for (const file of files.filter(
      (name) => name.endsWith(".json") && !name.endsWith(".config.json"),
    )) {
      try {
        const job = JSON.parse(
          await readFile(path.join(this.directory, file), "utf8"),
        ) as JobRecord;
        if (
          typeof job.id !== "string" ||
          typeof job.created_at !== "string" ||
          typeof job.status !== "string"
        ) {
          continue;
        }
        if (job.status === "RUNNING") {
          job.status = "FAILED";
          job.stage = "INTERRUPTED";
          job.error = "Backend đã dừng khi pipeline đang chạy.";
          job.updated_at = new Date().toISOString();
          this.jobs.set(job.id, job);
          await this.persist(job);
        } else {
          this.jobs.set(job.id, job);
        }
      } catch {
        // Ignore invalid metadata files; they are never exposed by the API.
      }
    }
  }

  list(): JobRecord[] {
    return [...this.jobs.values()].sort((left, right) =>
      right.created_at.localeCompare(left.created_at),
    );
  }

  get(id: string): JobRecord | undefined {
    return this.jobs.get(id);
  }

  async create(job: JobRecord): Promise<void> {
    if (this.jobs.has(job.id)) throw new Error(`Job ${job.id} đã tồn tại.`);
    this.jobs.set(job.id, job);
    await this.persist(job);
  }

  async update(
    id: string,
    updates: Partial<Omit<JobRecord, "id" | "created_at">>,
  ): Promise<JobRecord> {
    const current = this.jobs.get(id);
    if (!current) throw new Error(`Không tìm thấy job ${id}.`);
    const updated: JobRecord = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.jobs.set(id, updated);
    await this.persist(updated);
    return updated;
  }

  private async persist(job: JobRecord): Promise<void> {
    await writeFile(
      path.join(this.directory, `${job.id}.json`),
      `${JSON.stringify(job, null, 2)}\n`,
      "utf8",
    );
    await this.onPersist?.(job);
  }
}
