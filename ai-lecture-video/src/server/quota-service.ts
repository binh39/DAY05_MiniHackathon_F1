import type { CreateJobFields, JobRecord } from "./types.js";

export interface UserQuotaLimits {
  max_active_jobs: number;
  max_stored_jobs: number;
  max_storage_bytes: number;
  monthly_video_seconds: number;
}

export interface UserQuotaUsage {
  active_jobs: number;
  stored_jobs: number;
  storage_bytes: number;
  monthly_video_seconds: number;
}

export interface UserQuotaSnapshot {
  period: string;
  limits: UserQuotaLimits;
  usage: UserQuotaUsage;
  remaining: UserQuotaUsage;
  can_create_job: boolean;
}

const DURATION_RESERVATIONS: Record<
  CreateJobFields["duration_option"],
  number
> = {
  "0-1": 60,
  "1-3": 180,
  "3-5": 300,
  "5-8": 480,
  "8-10": 600,
};

function positiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : fallback;
}

export function quotaLimitsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): UserQuotaLimits {
  return {
    max_active_jobs: positiveInteger(env.USER_MAX_ACTIVE_JOBS, 2),
    max_stored_jobs: positiveInteger(env.USER_MAX_STORED_JOBS, 20),
    max_storage_bytes:
      positiveInteger(env.USER_MAX_STORAGE_MEGABYTES, 2048) * 1024 * 1024,
    monthly_video_seconds:
      positiveInteger(env.USER_MONTHLY_VIDEO_MINUTES, 60) * 60,
  };
}

export function reservationSeconds(
  fields: Pick<CreateJobFields, "duration_option">,
): number {
  return DURATION_RESERVATIONS[fields.duration_option];
}

export function quotaSnapshot(
  jobs: JobRecord[],
  ownerUid: string,
  limits: UserQuotaLimits,
  now = new Date(),
): UserQuotaSnapshot {
  const period = now.toISOString().slice(0, 7);
  const owned = jobs.filter((job) => job.owner_uid === ownerUid);
  const usage: UserQuotaUsage = {
    active_jobs: owned.filter(
      (job) => job.status === "QUEUED" || job.status === "RUNNING",
    ).length,
    stored_jobs: owned.length,
    storage_bytes: owned.reduce(
      (total, job) =>
        total + job.input_size_bytes + (job.result_file_size_bytes ?? 0),
      0,
    ),
    monthly_video_seconds: owned
      .filter(
        (job) =>
          job.created_at.slice(0, 7) === period && job.status !== "CANCELLED",
      )
      .reduce(
        (total, job) =>
          total +
          (job.result_duration_seconds ??
            job.quota_reserved_seconds ??
            reservationSeconds(job.fields)),
        0,
      ),
  };
  const remaining: UserQuotaUsage = {
    active_jobs: Math.max(0, limits.max_active_jobs - usage.active_jobs),
    stored_jobs: Math.max(0, limits.max_stored_jobs - usage.stored_jobs),
    storage_bytes: Math.max(0, limits.max_storage_bytes - usage.storage_bytes),
    monthly_video_seconds: Math.max(
      0,
      limits.monthly_video_seconds - usage.monthly_video_seconds,
    ),
  };
  return {
    period,
    limits,
    usage,
    remaining,
    can_create_job:
      remaining.active_jobs > 0 &&
      remaining.stored_jobs > 0 &&
      remaining.storage_bytes > 0 &&
      remaining.monthly_video_seconds > 0,
  };
}

export class QuotaExceededError extends Error {
  constructor(
    readonly code:
      | "ACTIVE_JOB_LIMIT"
      | "STORED_JOB_LIMIT"
      | "STORAGE_LIMIT"
      | "MONTHLY_VIDEO_LIMIT",
    message: string,
  ) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export function assertCanCreateJob(
  snapshot: UserQuotaSnapshot,
  inputSizeBytes: number,
  fields: CreateJobFields,
): void {
  if (snapshot.remaining.active_jobs < 1) {
    throw new QuotaExceededError(
      "ACTIVE_JOB_LIMIT",
      "Bạn đã đạt giới hạn job đang xử lý. Hãy chờ job hiện tại hoàn tất.",
    );
  }
  if (snapshot.remaining.stored_jobs < 1) {
    throw new QuotaExceededError(
      "STORED_JOB_LIMIT",
      "Thư viện đã đạt giới hạn số job. Hãy xóa một job cũ rồi thử lại.",
    );
  }
  if (snapshot.remaining.storage_bytes < inputSizeBytes) {
    throw new QuotaExceededError(
      "STORAGE_LIMIT",
      "Dung lượng lưu trữ còn lại không đủ cho PDF này.",
    );
  }
  if (snapshot.remaining.monthly_video_seconds < reservationSeconds(fields)) {
    throw new QuotaExceededError(
      "MONTHLY_VIDEO_LIMIT",
      "Thời lượng video tháng này không đủ cho tùy chọn đã chọn.",
    );
  }
}
