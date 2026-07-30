import type { ZodType } from "zod";

export type ModuleName =
  | "module1_document_intelligence"
  | "module2_lecture_planner"
  | "module3_script_generator"
  | "module4_storyboard_generator"
  | "module5a_visual_generator"
  | "module5b_voice_generator"
  | "module6_video_composer";

export interface RunContext {
  runId: string;
  runDirectory: string;
  projectDirectory: string;
}

export interface PipelineModule<I, O> {
  readonly name: ModuleName;
  readonly description: string;
  readonly outputFile: string;
  readonly outputSchema: ZodType<O>;
  run(input: I, context: RunContext): Promise<O>;
}

export class ModuleNotImplementedError extends Error {
  constructor(moduleName: ModuleName, nextStep: string) {
    super(`${moduleName} chưa được kết nối implementation. ${nextStep}`);
    this.name = "ModuleNotImplementedError";
  }
}
