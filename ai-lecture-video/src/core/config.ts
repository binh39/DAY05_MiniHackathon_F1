import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const pipelineConfigSchema = z.object({
  input_pdf: z.string().min(1),
  output_directory: z.string().min(1),
  coverage_mode: z.enum(["FULL", "CONCISE", "SUMMARY"]).default("FULL"),
  audience: z.string().min(1).default("beginner"),
  language: z.string().min(2).default("vi"),
  detail_level: z.enum(["brief", "standard", "detailed"]).default("standard"),
  max_chapter_minutes: z.number().positive().max(30).default(8),
  limits: z
    .object({
      max_pdf_megabytes: z.number().positive().max(50).default(50),
      max_pdf_pages: z.number().int().positive().max(1_000).default(80),
    })
    .default({
      max_pdf_megabytes: 50,
      max_pdf_pages: 80,
    }),
  voice: z.object({
    provider: z.enum(["google", "gemini", "elevenlabs", "edge"]),
    voice_id: z.string().min(1),
    speaking_rate: z.number().min(0.5).max(2),
  }),
  render: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive().max(60),
  }),
});

export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;

export async function loadConfig(
  configPath: string,
  projectDirectory: string,
): Promise<PipelineConfig> {
  const absolutePath = path.resolve(projectDirectory, configPath);
  const raw = await readFile(absolutePath, "utf8");
  return pipelineConfigSchema.parse(JSON.parse(raw));
}
