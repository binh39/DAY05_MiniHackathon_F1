import { z } from "zod";

export const narrationKindSchema = z.enum([
  "GROUNDED_CLAIM",
  "TEACHING_ANALOGY",
  "EXAMPLE",
  "TRANSITION",
  "LEARNING_CHECK",
]);

export const chapterScriptDecisionSchema = z.object({
  narrations: z.array(
    z.object({
      narration_id: z.string().min(1),
      item_id: z.string().min(1).optional(),
      kind: narrationKindSchema,
      text: z.string().min(1),
      source_ids: z.array(z.string()),
      objective_indices: z.array(z.number().int().nonnegative()),
    }),
  ).min(1),
  pronunciation_glossary: z.array(
    z.object({
      term: z.string().min(1),
      pronunciation: z.string().min(1),
      meaning: z.string().min(1),
      source_ids: z.array(z.string()),
    }),
  ),
});

export const semanticReviewSchema = z.object({
  issues: z.array(
    z.object({
      narration_id: z.string().min(1),
      issue_type: z.enum([
        "UNSUPPORTED",
        "WRONG_SOURCE",
        "CONTRADICTION",
      ]),
      explanation: z.string().min(1),
    }),
  ),
});

export type ChapterScriptDecision = z.infer<
  typeof chapterScriptDecisionSchema
>;
export type SemanticReview = z.infer<typeof semanticReviewSchema>;
