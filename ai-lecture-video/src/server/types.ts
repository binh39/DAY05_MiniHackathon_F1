import { z } from "zod";
import {
  PIPELINE_MODULES,
  type PipelineModuleId,
} from "../core/pipeline-events.js";

export const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);
export const durationOptionSchema = z.enum([
  "0-1",
  "1-3",
  "3-5",
  "5-8",
  "8-10",
]);

export const createJobFieldsSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  aspect_ratio: aspectRatioSchema.default("16:9"),
  duration_option: durationOptionSchema.default("5-8"),
  language: z.enum(["vi", "en"]).default("vi"),
  voice_id: z.string().trim().min(1).max(100).default("vi-VN-Neural2-A"),
});

export const feedbackSchema = z.object({
  overall_rating: z.number().int().min(1).max(5),
  content_accuracy: z.enum([
    "ACCURATE",
    "MINOR_ISSUE",
    "INCORRECT",
    "UNSURE",
  ]),
  clarity_rating: z.number().int().min(1).max(5),
  duration_fit: z.enum(["TOO_SHORT", "JUST_RIGHT", "TOO_LONG"]),
  would_use_again: z.boolean(),
  issue_details: z.string().trim().max(2000).optional(),
  comment: z.string().trim().max(2000).optional(),
});

export type CreateJobFields = z.infer<typeof createJobFieldsSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export interface FeedbackRecord extends FeedbackInput {
  created_at: string;
  updated_at: string;
}

export type ModuleRunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export interface ModuleRunState {
  status: ModuleRunStatus;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export type ModuleStates = Record<PipelineModuleId, ModuleRunState>;

export function initialModuleStates(): ModuleStates {
  return Object.fromEntries(
    PIPELINE_MODULES.map((module) => [module, { status: "PENDING" }]),
  ) as ModuleStates;
}
export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "AWAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface JobRecord {
  id: string;
  owner_uid: string;
  owner_email?: string;
  run_id: string;
  status: JobStatus;
  stage: string;
  progress: number;
  created_at: string;
  updated_at: string;
  input_file: string;
  original_filename: string;
  input_size_bytes: number;
  fields: CreateJobFields;
  attempt: number;
  run_directory?: string;
  error?: string;
  warnings: string[];
  cloud_storage?: Record<string, string>;
  outline_draft?: OutlineDraft;
  approved_at?: string;
  document_pages?: number;
  result_duration_seconds?: number;
  feedback?: FeedbackRecord;
  modules?: ModuleStates;
  failed_module?: PipelineModuleId;
  resume_from?: PipelineModuleId;
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

export interface PublicJob {
  id: string;
  status: JobStatus;
  stage: string;
  progress: number;
  created_at: string;
  updated_at: string;
  original_filename: string;
  input_size_bytes: number;
  fields: CreateJobFields;
  attempt: number;
  error?: string;
  warnings: string[];
  status_url: string;
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
  modules?: ModuleStates;
  failed_module?: PipelineModuleId;
}

export function toPublicJob(job: JobRecord): PublicJob {
  const base = `/api/jobs/${job.id}`;
  return {
    id: job.id,
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
    status_url: base,
    outline_url:
      job.status === "AWAITING_APPROVAL"
        ? `${base}/outline`
        : undefined,
    feedback_url:
      job.status === "COMPLETED" ? `${base}/feedback` : undefined,
    document_pages: job.document_pages,
    result_duration_seconds: job.result_duration_seconds,
    has_feedback: Boolean(job.feedback),
    modules: job.modules,
    failed_module: job.failed_module,
    artifacts:
      job.status === "COMPLETED"
        ? {
            video: `${base}/artifacts/video`,
            subtitle: `${base}/artifacts/subtitle`,
            coverage: `${base}/artifacts/coverage`,
            thumbnail: `${base}/artifacts/thumbnail`,
          }
        : undefined,
  };
}
