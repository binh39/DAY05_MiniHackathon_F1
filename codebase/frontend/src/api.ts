import type {
  AspectRatio,
  DurationOption,
  LanguageCode,
  PipelineModuleStates,
  VisualStyle,
} from "./types";
import { firebaseAuth } from "./firebase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787/api";

export interface ApiJob {
  kind: "DOCUMENT" | "VIDEO";
  id: string;
  status:
    | "QUEUED"
    | "RUNNING"
    | "AWAITING_APPROVAL"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  stage: string;
  progress: number;
  created_at: string;
  updated_at: string;
  original_filename: string;
  input_size_bytes: number;
  fields: {
    title?: string;
    aspect_ratio: AspectRatio;
    duration_option: "0-1" | "1-3" | "3-5" | "5-8" | "8-10";
    language: "vi" | "en";
    voice_id: string;
    visual_style: VisualStyle;
  };
  error?: string;
  warnings: string[];
  artifacts?: {
    video: string;
    subtitle: string;
    coverage: string;
    thumbnail: string;
  };
  outline_url?: string;
  feedback_url?: string;
  document_pages?: number;
  result_duration_seconds?: number;
  has_feedback?: boolean;
  modules?: PipelineModuleStates;
  failed_module?: string;
  retry_from?: string;
}

export interface SummaryArtifact {
  schema_version: "1.0";
  title: string;
  overview: string;
  key_points: Array<{
    heading: string;
    content: string;
    source_pages: number[];
  }>;
  conclusion: string;
  warnings: string[];
}

export interface FeedbackInput {
  overall_rating: number;
  content_accuracy: "ACCURATE" | "MINOR_ISSUE" | "INCORRECT" | "UNSURE";
  clarity_rating: number;
  duration_fit: "TOO_SHORT" | "JUST_RIGHT" | "TOO_LONG";
  would_use_again: boolean;
  issue_details?: string;
  comment?: string;
}

export interface FeedbackRecord extends FeedbackInput {
  created_at: string;
  updated_at: string;
}

export interface UserQuota {
  period: string;
  limits: {
    max_active_jobs: number;
    max_stored_jobs: number;
    max_storage_bytes: number;
    monthly_video_seconds: number;
  };
  usage: {
    active_jobs: number;
    stored_jobs: number;
    storage_bytes: number;
    monthly_video_seconds: number;
  };
  remaining: {
    active_jobs: number;
    stored_jobs: number;
    storage_bytes: number;
    monthly_video_seconds: number;
  };
  can_create_job: boolean;
  retention_days: number;
}

export interface OutlineDraftChapter {
  chapter_id: string;
  title: string;
  learning_objectives: string[];
  detail_level: "brief" | "standard" | "deep";
}

export interface OutlineDraft {
  title: string;
  chapters: OutlineDraftChapter[];
}

export interface OutlinePreview {
  document: {
    title: string;
    total_pages: number;
    total_sources: number;
    language: string;
    warnings: string[];
    sections: Array<{
      section_id: string;
      title: string;
      concepts: string[];
      page_numbers: number[];
    }>;
    first_thumbnail_url: string;
  };
  plan: {
    coverage_mode: "FULL" | "CONCISE" | "SUMMARY";
    estimated_duration_seconds: number;
    coverage_rate: number;
    warnings: string[];
    draft: OutlineDraft;
    chapters: Array<{
      chapter_id: string;
      title: string;
      duration_seconds: number;
      page_numbers: number[];
      items: Array<{
        item_id: string;
        title: string;
        treatment: string;
        reason: string;
        page_numbers: number[];
      }>;
    }>;
  };
}

export interface ResultDetail {
  title: string;
  duration_seconds: number;
  coverage: {
    mode: "FULL" | "CONCISE" | "SUMMARY";
    rate: number;
    total_pages: number;
    total_sources: number;
    covered_pages: number;
    reference_pages: number[];
    unreadable_pages: number[];
    duplicate_pages: number[];
    warnings: string[];
  };
  chapters: Array<{
    chapter_id: string;
    title: string;
    start_seconds: number;
    end_seconds: number;
    page_numbers: number[];
    learning_objectives: string[];
    sources: Array<{
      source_id: string;
      page: number;
      element_type: "TEXT" | "IMAGE" | "DIAGRAM" | "TABLE" | "FORMULA" | "CODE";
      excerpt?: string;
      confidence: number;
    }>;
  }>;
  pages: Array<{
    page: number;
    summary: string;
    concepts: string[];
    warnings: string[];
    image_url: string;
  }>;
}

function durationCode(
  duration: DurationOption,
): ApiJob["fields"]["duration_option"] {
  return duration.replace(" phút", "").replace("–", "-") as ApiJob["fields"]["duration_option"];
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(body.message ?? `API trả HTTP ${response.status}.`);
  }
  return body;
}

async function authorizationHeaders(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Bạn cần đăng nhập để sử dụng API.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

export async function createJob(input: {
  file: File;
  title: string;
  ratio: AspectRatio;
  duration: DurationOption;
  language: LanguageCode;
  voiceId: string;
  visualStyle: VisualStyle;
}, onUploadProgress?: (percent: number) => void): Promise<ApiJob> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("title", input.title);
  form.append("aspect_ratio", input.ratio);
  form.append("duration_option", durationCode(input.duration));
  form.append("language", input.language);
  form.append("voice_id", input.voiceId);
  form.append("visual_style", input.visualStyle);
  const headers = await authorizationHeaders();
  return new Promise<ApiJob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/jobs`);
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onUploadProgress?.(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    });
    request.addEventListener("load", () => {
      try {
        const body = JSON.parse(request.responseText) as ApiJob & {
          message?: string;
        };
        if (request.status < 200 || request.status >= 300) {
          reject(
            new Error(body.message ?? `API trả HTTP ${request.status}.`),
          );
          return;
        }
        onUploadProgress?.(100);
        resolve(body);
      } catch {
        reject(new Error("Backend trả response không hợp lệ."));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("Không thể kết nối backend khi upload.")),
    );
    request.addEventListener("abort", () =>
      reject(new Error("Upload đã bị hủy.")),
    );
    request.send(form);
  });
}

export async function uploadDocument(
  file: File,
  onUploadProgress?: (percent: number) => void,
): Promise<ApiJob> {
  const form = new FormData();
  form.append("file", file);
  const headers = await authorizationHeaders();
  return new Promise<ApiJob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/documents`);
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onUploadProgress?.(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    });
    request.addEventListener("load", () => {
      try {
        const body = JSON.parse(request.responseText) as ApiJob & {
          message?: string;
        };
        if (request.status < 200 || request.status >= 300) {
          reject(new Error(body.message ?? `API trả HTTP ${request.status}.`));
          return;
        }
        onUploadProgress?.(100);
        resolve(body);
      } catch {
        reject(new Error("Backend trả response không hợp lệ."));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("Không thể kết nối backend khi upload.")),
    );
    request.send(form);
  });
}

export async function startVideoFromDocument(
  id: string,
  input: {
    title: string;
    ratio: AspectRatio;
    duration: DurationOption;
    language: LanguageCode;
    voiceId: string;
    visualStyle: VisualStyle;
  },
): Promise<ApiJob> {
  return responseJson<ApiJob>(
    await fetch(`${API_BASE_URL}/documents/${id}/video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authorizationHeaders()),
      },
      body: JSON.stringify({
        title: input.title,
        aspect_ratio: input.ratio,
        duration_option: durationCode(input.duration),
        language: input.language,
        voice_id: input.voiceId,
        visual_style: input.visualStyle,
      }),
    }),
  );
}

export async function documentBlobUrl(id: string): Promise<string> {
  return artifactBlobUrl(`/api/documents/${id}/file`);
}

export async function generateDocumentSummary(
  id: string,
): Promise<SummaryArtifact> {
  return responseJson<SummaryArtifact>(
    await fetch(`${API_BASE_URL}/documents/${id}/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authorizationHeaders()),
      },
      body: "{}",
    }),
  );
}

export async function listJobs(): Promise<ApiJob[]> {
  const response = await responseJson<{ jobs: ApiJob[] }>(
    await fetch(`${API_BASE_URL}/jobs`, {
      headers: await authorizationHeaders(),
    }),
  );
  return response.jobs;
}

export async function getQuota(): Promise<UserQuota> {
  return responseJson<UserQuota>(
    await fetch(`${API_BASE_URL}/quota`, {
      headers: await authorizationHeaders(),
    }),
  );
}

export async function deleteJob(id: string): Promise<void> {
  await responseJson<{ deleted: true; id: string }>(
    await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: "DELETE",
      headers: await authorizationHeaders(),
    }),
  );
}

export async function deleteVideo(id: string): Promise<void> {
  await responseJson<{
    deleted: true;
    preserved_document: true;
    document: ApiJob;
  }>(
    await fetch(`${API_BASE_URL}/jobs/${id}/video`, {
      method: "DELETE",
      headers: await authorizationHeaders(),
    }),
  );
}

export async function retryJob(id: string): Promise<ApiJob> {
  return responseJson<ApiJob>(
    await fetch(`${API_BASE_URL}/jobs/${id}/retry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authorizationHeaders()),
      },
      body: "{}",
    }),
  );
}

export async function cancelJob(id: string): Promise<ApiJob> {
  return responseJson<ApiJob>(
    await fetch(`${API_BASE_URL}/jobs/${id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authorizationHeaders()),
      },
      body: "{}",
    }),
  );
}

export async function getOutline(id: string): Promise<OutlinePreview> {
  return responseJson<OutlinePreview>(
    await fetch(`${API_BASE_URL}/jobs/${id}/outline`, {
      headers: await authorizationHeaders(),
    }),
  );
}

export async function saveOutline(
  id: string,
  draft: OutlineDraft,
): Promise<OutlinePreview> {
  return responseJson<OutlinePreview>(
    await fetch(`${API_BASE_URL}/jobs/${id}/outline`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await authorizationHeaders()),
      },
      body: JSON.stringify(draft),
    }),
  );
}

export async function approveOutline(
  id: string,
  draft: OutlineDraft,
): Promise<ApiJob> {
  return responseJson<ApiJob>(
    await fetch(`${API_BASE_URL}/jobs/${id}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authorizationHeaders()),
      },
      body: JSON.stringify(draft),
    }),
  );
}

export async function getResult(id: string): Promise<ResultDetail> {
  return responseJson<ResultDetail>(
    await fetch(`${API_BASE_URL}/jobs/${id}/result`, {
      headers: await authorizationHeaders(),
    }),
  );
}

export async function getFeedback(id: string): Promise<FeedbackRecord | null> {
  const response = await responseJson<{ feedback: FeedbackRecord | null }>(
    await fetch(`${API_BASE_URL}/jobs/${id}/feedback`, {
      headers: await authorizationHeaders(),
    }),
  );
  return response.feedback;
}

export async function saveFeedback(
  id: string,
  feedback: FeedbackInput,
): Promise<FeedbackRecord> {
  const response = await responseJson<{ feedback: FeedbackRecord }>(
    await fetch(`${API_BASE_URL}/jobs/${id}/feedback`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await authorizationHeaders()),
      },
      body: JSON.stringify(feedback),
    }),
  );
  return response.feedback;
}

export function artifactUrl(relativeUrl: string): string {
  const apiOrigin = new URL(API_BASE_URL).origin;
  return new URL(relativeUrl, apiOrigin).toString();
}

const artifactCache = new Map<string, Promise<string>>();

export function artifactBlobUrl(relativeUrl: string): Promise<string> {
  const absoluteUrl = artifactUrl(relativeUrl);
  const cached = artifactCache.get(absoluteUrl);
  if (cached) return cached;
  const pending = (async () => {
    const response = await fetch(absoluteUrl, {
      headers: await authorizationHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Không thể tải artifact: HTTP ${response.status}.`);
    }
    return URL.createObjectURL(await response.blob());
  })();
  artifactCache.set(absoluteUrl, pending);
  return pending;
}

export function clearArtifactCache(): void {
  for (const pending of artifactCache.values()) {
    void pending.then((url) => URL.revokeObjectURL(url)).catch(() => undefined);
  }
  artifactCache.clear();
}
