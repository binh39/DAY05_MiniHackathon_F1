export type AspectRatio = "16:9" | "9:16" | "1:1";
export type LanguageCode = "vi" | "en";
export type VisualStyle = "modern_minimal" | "academic" | "dynamic";
export type DurationOption =
  | "0–1 phút"
  | "1–3 phút"
  | "3–5 phút"
  | "5–8 phút"
  | "8–10 phút";

export type PipelineModuleId =
  | "module1_document_intelligence"
  | "module2_lecture_planner"
  | "module3_script_generator"
  | "module4_storyboard_generator"
  | "module5a_visual_generator"
  | "module5b_voice_generator"
  | "module6_video_composer";

export type PipelineModuleStates = Record<
  PipelineModuleId,
  {
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    started_at?: string;
    completed_at?: string;
    error?: string;
  }
>;

export interface User {
  uid: string;
  name: string;
  email: string;
}

export interface DocumentItem {
  id: string;
  jobId: string;
  summaryJobId?: string;
  name: string;
  size: string;
  sizeBytes: number;
  pages?: number;
  uploadedAt: string;
  status: "ready" | "analyzing" | "video";
  progress?: number;
  stage?: string;
  color: string;
}

export interface VideoItem {
  id: string;
  title: string;
  documentName: string;
  duration: string;
  ratio: AspectRatio;
  createdAt: string;
  status: "ready" | "processing" | "review" | "failed";
  progress?: number;
  color: string;
  error?: string;
  videoUrl?: string;
  subtitleUrl?: string;
  coverageUrl?: string;
  thumbnailUrl?: string;
  jobId?: string;
  stage?: string;
  durationSeconds?: number;
  hasFeedback?: boolean;
  modules?: PipelineModuleStates;
  failedModule?: string;
}
