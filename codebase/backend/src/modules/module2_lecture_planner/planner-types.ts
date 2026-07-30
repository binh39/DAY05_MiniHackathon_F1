import { z } from "zod";

export const treatmentSchema = z.enum([
  "EXPLAIN",
  "MENTION",
  "SHOW",
  "REFERENCE",
  "OUT_OF_SCOPE",
  "UNREADABLE",
  "DUPLICATE",
]);

export type Treatment = z.infer<typeof treatmentSchema>;

export const plannerDecisionSchema = z.object({
  title: z.string().min(1),
  learning_objectives: z.array(z.string().min(1)).min(1),
  chapters: z
    .array(
      z.object({
        chapter_id: z.string().min(1),
        title: z.string().min(1),
        learning_objectives: z.array(z.string().min(1)).min(1),
        items: z
          .array(
            z.object({
              item_id: z.string().min(1),
              title: z.string().min(1),
              treatment: treatmentSchema,
              reason: z.string().min(1),
              source_ids: z.array(z.string().min(1)).min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type PlannerDecision = z.infer<typeof plannerDecisionSchema>;
