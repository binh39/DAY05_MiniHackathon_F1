import { z } from "zod";

export const pipelineModuleIdSchema = z.enum([
  "module1_document_intelligence",
  "module2_lecture_planner",
  "module3_script_generator",
  "module4_storyboard_generator",
  "module5a_visual_generator",
  "module5b_voice_generator",
  "module6_video_composer",
]);

export type PipelineModuleId = z.infer<typeof pipelineModuleIdSchema>;

export const PIPELINE_MODULES: PipelineModuleId[] = [
  "module1_document_intelligence",
  "module2_lecture_planner",
  "module3_script_generator",
  "module4_storyboard_generator",
  "module5a_visual_generator",
  "module5b_voice_generator",
  "module6_video_composer",
];

export const pipelineEventSchema = z.object({
  type: z.enum([
    "MODULE_STARTED",
    "MODULE_PROGRESS",
    "MODULE_COMPLETED",
    "MODULE_FAILED",
  ]),
  module: pipelineModuleIdSchema,
  at: z.string().datetime(),
  progress: z.number().int().min(0).max(100).optional(),
  stage: z.string().min(1).optional(),
  error: z.string().optional(),
});

export type PipelineEvent = z.infer<typeof pipelineEventSchema>;

export function emitPipelineEvent(event: PipelineEvent): void {
  process.stdout.write(`PIPELINE_EVENT:${JSON.stringify(event)}\n`);
}
