import { createReadStream } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import type { JobRecord } from "./types.js";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
}

export interface FirebaseServices {
  verifyIdToken(idToken: string): Promise<AuthenticatedUser>;
  persistJob(job: JobRecord): Promise<void>;
  loadJobs?(): Promise<JobRecord[]>;
  getJob?(id: string): Promise<JobRecord | undefined>;
  uploadInput(job: JobRecord): Promise<string>;
  uploadArtifacts(job: JobRecord): Promise<Record<string, string>>;
  uploadRunDirectory?(job: JobRecord): Promise<Record<string, string>>;
  downloadRunDirectory?(job: JobRecord, destination: string): Promise<void>;
  downloadObject?(uri: string): Promise<Buffer>;
  deleteArtifacts?(job: JobRecord): Promise<void>;
  deleteRunArtifacts?(job: JobRecord): Promise<void>;
  deleteJob?(job: JobRecord): Promise<void>;
}

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { mapValue: { fields: Record<string, FirestoreValue> } }
  | { arrayValue: { values: FirestoreValue[] } };

function firestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          firestoreValue(item),
        ]),
      ),
    },
  };
}

function firestoreFields(
  value: Record<string, unknown>,
): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, firestoreValue(item)]),
  );
}

function cloudJob(job: JobRecord): Record<string, unknown> {
  return {
    id: job.id,
    run_id: job.run_id,
    kind: job.kind ?? "VIDEO",
    owner_uid: job.owner_uid,
    owner_email: job.owner_email,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    created_at: job.created_at,
    updated_at: job.updated_at,
    original_filename: job.original_filename,
    input_size_bytes: job.input_size_bytes,
    fields: job.fields,
    attempt: job.attempt,
    error: job.error,
    warnings: job.warnings,
    storage: job.cloud_storage,
    approved_at: job.approved_at,
    outline_draft: job.outline_draft,
    document_pages: job.document_pages,
    result_duration_seconds: job.result_duration_seconds,
    result_file_size_bytes: job.result_file_size_bytes,
    quota_reserved_seconds: job.quota_reserved_seconds,
    feedback: job.feedback,
    modules: job.modules,
    failed_module: job.failed_module,
    resume_from: job.resume_from,
    bypass_generation_cache: job.bypass_generation_cache,
  };
}

function localJob(fields: Record<string, FirestoreValue>): JobRecord {
  const value = fromFirestoreFields(fields) as Record<string, unknown>;
  return {
    ...(value as unknown as JobRecord),
    run_id: String(value.run_id ?? value.id),
    input_file: "",
    run_directory: undefined,
    cloud_storage: value.storage as Record<string, string> | undefined,
    warnings: Array.isArray(value.warnings) ? (value.warnings as string[]) : [],
  };
}

function fromFirestoreValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return undefined;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  }
  return Object.fromEntries(
    Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [
      key,
      fromFirestoreValue(item),
    ]),
  );
}

function fromFirestoreFields(
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]),
  );
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".srt")) return "application/x-subrip";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

export function createFirebaseServices(options: {
  projectId: string;
  storageBucket: string;
}): FirebaseServices {
  const auth = new GoogleAuth({
    projectId: options.projectId,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const tokenVerifier = new OAuth2Client();
  let firebaseCertificates:
    | { values: Record<string, string>; expiresAt: number }
    | undefined;

  async function secureTokenCertificates(): Promise<Record<string, string>> {
    if (firebaseCertificates && firebaseCertificates.expiresAt > Date.now()) {
      return firebaseCertificates.values;
    }
    const response = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    );
    if (!response.ok) {
      throw new Error(
        `Không thể tải Firebase signing certificates: HTTP ${response.status}.`,
      );
    }
    const values = (await response.json()) as Record<string, string>;
    const maxAge = Number(
      response.headers
        .get("cache-control")
        ?.match(/max-age=(\d+)/u)?.[1] ?? 3600,
    );
    firebaseCertificates = {
      values,
      expiresAt: Date.now() + Math.max(60, maxAge - 60) * 1000,
    };
    return values;
  }

  async function upload(filePath: string, objectName: string): Promise<string> {
    const client = await auth.getClient();
    await client.request({
      url: `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(options.storageBucket)}/o`,
      method: "POST",
      params: { uploadType: "media", name: objectName },
      headers: { "Content-Type": contentType(filePath) },
      data: createReadStream(filePath),
    });
    return `gs://${options.storageBucket}/${objectName}`;
  }

  async function deleteObjectsWithPrefix(prefix: string): Promise<void> {
    const client = await auth.getClient();
    let pageToken: string | undefined;
    do {
      const response = await client.request<{
        items?: Array<{ name: string }>;
        nextPageToken?: string;
      }>({
        url: `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(options.storageBucket)}/o`,
        method: "GET",
        params: { prefix, pageToken },
      });
      for (const item of response.data.items ?? []) {
        await client
          .request({
            url:
              `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(options.storageBucket)}` +
              `/o/${encodeURIComponent(item.name)}`,
            method: "DELETE",
          })
          .catch((error: { response?: { status?: number } }) => {
            if (error.response?.status !== 404) throw error;
          });
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);
  }

  function parseStorageUri(uri: string): { bucket: string; objectName: string } {
    const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/u);
    if (!match?.[1] || !match[2]) {
      throw new Error(`Storage URI không hợp lệ: ${uri}`);
    }
    return { bucket: match[1], objectName: match[2] };
  }

  async function download(uri: string): Promise<Buffer> {
    const { bucket, objectName } = parseStorageUri(uri);
    const client = await auth.getClient();
    const response = await client.request<ArrayBuffer>({
      url:
        `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}` +
        `/o/${encodeURIComponent(objectName)}`,
      method: "GET",
      params: { alt: "media" },
      responseType: "arraybuffer",
    });
    return Buffer.from(response.data);
  }

  async function listObjects(prefix: string): Promise<string[]> {
    const client = await auth.getClient();
    const names: string[] = [];
    let pageToken: string | undefined;
    do {
      const response = await client.request<{
        items?: Array<{ name: string }>;
        nextPageToken?: string;
      }>({
        url: `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(options.storageBucket)}/o`,
        method: "GET",
        params: { prefix, pageToken },
      });
      names.push(...(response.data.items ?? []).map((item) => item.name));
      pageToken = response.data.nextPageToken;
    } while (pageToken);
    return names;
  }

  async function filesBelow(directory: string): Promise<string[]> {
    const result: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) result.push(...(await filesBelow(candidate)));
      else if (entry.isFile()) result.push(candidate);
    }
    return result;
  }

  async function fetchJob(id: string): Promise<JobRecord | undefined> {
    const client = await auth.getClient();
    try {
      const response = await client.request<{
        fields: Record<string, FirestoreValue>;
      }>({
        url:
          `https://firestore.googleapis.com/v1/projects/${options.projectId}` +
          `/databases/(default)/documents/jobs/${encodeURIComponent(id)}`,
        method: "GET",
      });
      return localJob(response.data.fields);
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  return {
    async verifyIdToken(idToken) {
      const ticket = await tokenVerifier.verifySignedJwtWithCertsAsync(
        idToken,
        await secureTokenCertificates(),
        options.projectId,
        [`https://securetoken.google.com/${options.projectId}`],
      );
      const payload = ticket.getPayload();
      if (
        !payload?.sub ||
        payload.iss !== `https://securetoken.google.com/${options.projectId}`
      ) {
        throw new Error("Firebase ID token không hợp lệ.");
      }
      return {
        uid: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    },

    async persistJob(job) {
      const client = await auth.getClient();
      await client.request({
        url:
          `https://firestore.googleapis.com/v1/projects/${options.projectId}` +
          `/databases/(default)/documents/jobs/${job.id}`,
        method: "PATCH",
        data: { fields: firestoreFields(cloudJob(job)) },
      });
    },

    async loadJobs() {
      const client = await auth.getClient();
      const jobs: JobRecord[] = [];
      let pageToken: string | undefined;
      do {
        const response = await client.request<{
          documents?: Array<{ fields: Record<string, FirestoreValue> }>;
          nextPageToken?: string;
        }>({
          url:
            `https://firestore.googleapis.com/v1/projects/${options.projectId}` +
            "/databases/(default)/documents/jobs",
          method: "GET",
          params: { pageSize: 1000, pageToken },
        });
        jobs.push(
          ...(response.data.documents ?? []).map((document) =>
            localJob(document.fields),
          ),
        );
        pageToken = response.data.nextPageToken;
      } while (pageToken);
      return jobs;
    },

    getJob: fetchJob,

    async uploadInput(job) {
      const objectName =
        `users/${job.owner_uid}/jobs/${job.id}/input/` +
        path.basename(job.original_filename);
      return upload(job.input_file, objectName);
    },

    async uploadArtifacts(job) {
      if (!job.run_directory) return {};
      const artifacts: Record<string, string> = {
        video: path.join(job.run_directory, "lecture.mp4"),
        subtitle: path.join(job.run_directory, "lecture.srt"),
        coverage: path.join(job.run_directory, "coverage-report.json"),
      };
      const visualDirectory = path.join(job.run_directory, "assets", "visuals");
      const firstVisual = (await readdir(visualDirectory))
        .filter((name) => name.endsWith(".png"))
        .sort()[0];
      if (firstVisual) artifacts.thumbnail = path.join(visualDirectory, firstVisual);
      return Object.fromEntries(
        await Promise.all(
          Object.entries(artifacts).map(async ([kind, filePath]) => [
            kind,
            await upload(
              filePath,
              `users/${job.owner_uid}/jobs/${job.id}/artifacts/${path.basename(filePath)}`,
            ),
          ]),
        ),
      );
    },

    async uploadRunDirectory(job) {
      if (!job.run_directory) return {} as Record<string, string>;
      const prefix = `users/${job.owner_uid}/jobs/${job.id}/run/`;
      const files = await filesBelow(job.run_directory);
      await Promise.all(
        files.map((filePath) => {
          const relative = path
            .relative(job.run_directory!, filePath)
            .replaceAll("\\", "/");
          return upload(filePath, `${prefix}${relative}`);
        }),
      );
      return { run_prefix: `gs://${options.storageBucket}/${prefix}` };
    },

    async downloadRunDirectory(job, destination) {
      const uri = job.cloud_storage?.run_prefix;
      if (!uri) return;
      const { bucket, objectName: prefix } = parseStorageUri(uri);
      if (bucket !== options.storageBucket) {
        throw new Error("Run artifacts không thuộc Storage bucket đã cấu hình.");
      }
      for (const objectName of await listObjects(prefix)) {
        const relative = objectName.slice(prefix.length);
        if (!relative || relative.includes("..")) continue;
        const target = path.resolve(destination, relative);
        const safeRelative = path.relative(path.resolve(destination), target);
        if (safeRelative.startsWith("..") || path.isAbsolute(safeRelative)) continue;
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(
          target,
          await download(`gs://${options.storageBucket}/${objectName}`),
        );
      }
    },

    downloadObject: download,

    async deleteArtifacts(job) {
      await deleteObjectsWithPrefix(
        `users/${job.owner_uid}/jobs/${job.id}/artifacts/`,
      );
    },

    async deleteRunArtifacts(job) {
      await deleteObjectsWithPrefix(`users/${job.owner_uid}/jobs/${job.id}/run/`);
    },

    async deleteJob(job) {
      const client = await auth.getClient();
      const prefix = `users/${job.owner_uid}/jobs/${job.id}/`;
      await deleteObjectsWithPrefix(prefix);
      await client
        .request({
          url:
            `https://firestore.googleapis.com/v1/projects/${options.projectId}` +
            `/databases/(default)/documents/jobs/${job.id}`,
          method: "DELETE",
        })
        .catch((error: { response?: { status?: number } }) => {
          if (error.response?.status !== 404) throw error;
        });
    },
  };
}
