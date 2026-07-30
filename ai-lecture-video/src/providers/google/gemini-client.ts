import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

export interface VertexEnvironment {
  project: string;
  location: string;
  documentModel: string;
  plannerModel: string;
  scriptModel: string;
  storyboardModel: string;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Thiếu biến môi trường ${name}. Hãy kiểm tra file .env và ADC.`,
    );
  }
  return value;
}

export function getVertexEnvironment(): VertexEnvironment {
  const documentModel =
    process.env.GEMINI_DOCUMENT_MODEL?.trim() || "gemini-3.5-flash";
  return {
    project: requiredEnvironment("GOOGLE_CLOUD_PROJECT"),
    location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || "global",
    documentModel,
    plannerModel: process.env.GEMINI_PLANNER_MODEL?.trim() || documentModel,
    scriptModel: process.env.GEMINI_SCRIPT_MODEL?.trim() || documentModel,
    storyboardModel:
      process.env.GEMINI_STORYBOARD_MODEL?.trim() || documentModel,
  };
}

export function createVertexClient(
  environment: VertexEnvironment = getVertexEnvironment(),
): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: true,
    project: environment.project,
    location: environment.location,
    httpOptions: {
      apiVersion: "v1",
    },
  });
}
