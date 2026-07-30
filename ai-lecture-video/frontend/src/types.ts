export type AspectRatio = "16:9" | "9:16" | "1:1";
export type DurationOption =
  | "0–1 phút"
  | "1–3 phút"
  | "3–5 phút"
  | "5–8 phút"
  | "8–10 phút";

export interface User {
  name: string;
  email: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: string;
  pages: number;
  uploadedAt: string;
  status: "ready" | "analyzing";
  color: string;
}

export interface VideoItem {
  id: string;
  title: string;
  documentName: string;
  duration: string;
  ratio: AspectRatio;
  createdAt: string;
  status: "ready" | "processing";
  progress?: number;
  color: string;
}
