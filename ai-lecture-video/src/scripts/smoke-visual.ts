import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import type { StoryboardArtifact } from "../core/contracts.js";
import { createRemotionRenderSession } from "../modules/module5a_visual_generator/remotion-renderer.js";

async function main(): Promise<void> {
  const projectDirectory = process.cwd();
  const outputDirectory = path.join(
    projectDirectory,
    "eval",
    "visual-smoke",
  );
  await mkdir(outputDirectory, { recursive: true });
  const sourcePath = path.join(outputDirectory, "crop-source.png");
  const canvas = createCanvas(1_200, 800);
  const context = canvas.getContext("2d");
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, 1_200, 800);
  context.fillStyle = "#15345c";
  context.font = "bold 56px Arial";
  context.fillText("Process Control Block", 90, 130);
  context.fillStyle = "#dbeafe";
  context.fillRect(260, 240, 680, 300);
  context.strokeStyle = "#2563eb";
  context.lineWidth = 6;
  context.strokeRect(260, 240, 680, 300);
  context.fillStyle = "#10233f";
  context.font = "34px Arial";
  context.fillText("PID · State · Registers · Memory", 330, 400);
  await canvas.encode("png").then(async (buffer) => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(sourcePath, buffer);
  });

  const relativeSource = path.relative(projectDirectory, sourcePath);
  const scene: StoryboardArtifact["scenes"][number] = {
    scene_id: "scene_crop_smoke",
    chapter_id: "smoke",
    narration_id: "crop_smoke",
    narration: "Highlight the Process Control Block fields.",
    visual: {
      type: "CROP_AND_HIGHLIGHT",
      source_ids: ["smoke_source"],
      template: "crop-highlight-v1",
      props: {
        page: 1,
        image_path: relativeSource,
        image_width: 1_200,
        image_height: 800,
        crop_bbox: [0.2, 0.24, 0.6, 0.4],
        highlight_bbox: [0.2, 0.24, 0.6, 0.4],
        caption: "Vùng thông tin quan trọng trong PCB",
      },
    },
    asset_plan: {
      mode: "SOURCE_CROP",
      page: 1,
      source_path: relativeSource,
      crop_bbox: [0.2, 0.24, 0.6, 0.4],
      instructions: ["Smoke test crop and highlight."],
    },
    fallback: {
      visual_type: "ORIGINAL_PAGE",
      reason: "Smoke fallback",
    },
    warnings: [],
    estimated_duration_seconds: 5,
  };

  const session = await createRemotionRenderSession(
    projectDirectory,
    1_920,
    1_080,
  );
  try {
    const outputPath = path.join(outputDirectory, "crop-highlight.png");
    await session.render(scene, outputPath);
    process.stdout.write(`Visual smoke render: ${outputPath}\n`);
  } finally {
    await session.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
