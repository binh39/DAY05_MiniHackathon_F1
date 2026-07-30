import { z } from "zod";
import { visualTypeSchema } from "./template-registry.js";

const diagramSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ).min(2).max(8),
  edges: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      label: z.string(),
    }),
  ).min(1).max(12),
});

export const chapterStoryboardDecisionSchema = z.object({
  routes: z.array(
    z.object({
      narration_id: z.string().min(1),
      visual_type: visualTypeSchema,
      source_ids: z.array(z.string()),
      heading: z.string().min(1),
      key_points: z.array(z.string().min(1)).min(1).max(5),
      diagram: diagramSchema.optional(),
      reason: z.string().min(1),
    }),
  ).min(1),
});

export type ChapterStoryboardDecision = z.infer<
  typeof chapterStoryboardDecisionSchema
>;
