import { module1DocumentIntelligence } from "../modules/module1_document_intelligence/index.js";
import { module2LecturePlanner } from "../modules/module2_lecture_planner/index.js";
import { module3ScriptGenerator } from "../modules/module3_script_generator/index.js";
import { module4StoryboardGenerator } from "../modules/module4_storyboard_generator/index.js";
import { module5aVisualGenerator } from "../modules/module5a_visual_generator/index.js";
import { module5bVoiceGenerator } from "../modules/module5b_voice_generator/index.js";
import { module6VideoComposer } from "../modules/module6_video_composer/index.js";

export const pipelineDefinition = [
  module1DocumentIntelligence,
  module2LecturePlanner,
  module3ScriptGenerator,
  module4StoryboardGenerator,
  module5aVisualGenerator,
  module5bVoiceGenerator,
  module6VideoComposer,
] as const;

export function describePipeline(): string {
  const lines = pipelineDefinition.map(
    (module, index) =>
      `${String(index + 1).padStart(2, "0")}. ${module.name}\n    ${module.description}\n    → ${module.outputFile}`,
  );

  return [
    "AI Lecture Video Pipeline",
    "=========================",
    ...lines,
    "",
    "Ghi chú: module5a_visual_generator và module5b_voice_generator chạy song song.",
  ].join("\n");
}
