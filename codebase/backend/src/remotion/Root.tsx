import React from "react";
import { Composition } from "remotion";
import { SceneComposition } from "./SceneComposition.js";
import type { SceneRenderProps } from "./scene-render-types.js";

const defaultProps: SceneRenderProps = {
  scene: {
    scene_id: "scene_preview",
    chapter_id: "preview",
    narration_id: "preview",
    narration: "Preview",
    visual: {
      type: "TITLE",
      source_ids: [],
      template: "title-card-v1",
      props: {
        title: "AI Lecture Video",
        subtitle: "Scene preview",
        chapter_label: "Preview",
      },
    },
    asset_plan: {
      mode: "GENERATED_LAYOUT",
      instructions: ["Preview"],
    },
    fallback: {
      visual_type: "BULLET",
      reason: "Preview fallback",
    },
    warnings: [],
    estimated_duration_seconds: 3,
  },
  resolvedImageSrc: null,
  width: 1920,
  height: 1080,
  visualStyle: "modern_minimal",
};

export function RemotionRoot() {
  return (
    <Composition
      id="LectureScene"
      component={SceneComposition}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
    />
  );
}
