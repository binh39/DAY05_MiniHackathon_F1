import type {
  DocumentArtifact,
  ScriptArtifact,
  StoryboardArtifact,
} from "../../core/contracts.js";
import {
  templateName,
  type VisualType,
} from "./template-registry.js";
import type { ChapterStoryboardDecision } from "./storyboard-types.js";

type Source = DocumentArtifact["sources"][number];
type Narration = ScriptArtifact["chapters"][number]["narrations"][number];
type Route = ChapterStoryboardDecision["routes"][number];

const DURATION_PRECISION_DIGITS = 3;

function normalizedDuration(value: number): number {
  return Number(value.toFixed(DURATION_PRECISION_DIGITS));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function chooseSource(
  route: Route,
  sourceById: Map<string, Source>,
): Source | undefined {
  return route.source_ids
    .map((sourceId) => sourceById.get(sourceId))
    .find((source): source is Source => Boolean(source));
}

function fallbackType(route: Route, source?: Source): VisualType {
  if (source) return "ORIGINAL_PAGE";
  if (route.visual_type === "TITLE") return "TITLE";
  return "BULLET";
}

function buildVisual(
  route: Route,
  narration: Narration,
  chapter: ScriptArtifact["chapters"][number],
  document: DocumentArtifact,
): {
  visual: StoryboardArtifact["scenes"][number]["visual"];
  assetPlan: StoryboardArtifact["scenes"][number]["asset_plan"];
  fallback: StoryboardArtifact["scenes"][number]["fallback"];
  warnings: string[];
} {
  const sourceById = new Map(
    document.sources.map((source) => [source.source_id, source]),
  );
  const pageByNumber = new Map(
    document.pages.map((page) => [page.page, page]),
  );
  const source = chooseSource(route, sourceById);
  const warnings: string[] = [];
  let visualType = route.visual_type;

  if (
    ["ORIGINAL_PAGE", "CROP_AND_HIGHLIGHT", "DIAGRAM"].includes(
      visualType,
    ) &&
    !source
  ) {
    warnings.push(
      `${visualType} thiếu source; dùng generated BULLET fallback.`,
    );
    visualType = "BULLET";
  }
  if (visualType === "CROP_AND_HIGHLIGHT" && !source?.bbox) {
    warnings.push(
      "Source chưa có bounding box; hạ xuống ORIGINAL_PAGE.",
    );
    visualType = "ORIGINAL_PAGE";
  }
  if (
    visualType === "DIAGRAM" &&
    (source?.element_type !== "DIAGRAM" || !route.diagram)
  ) {
    warnings.push(
      "DIAGRAM không có diagram source/structure hợp lệ; dùng ORIGINAL_PAGE.",
    );
    visualType = source ? "ORIGINAL_PAGE" : "BULLET";
  }

  const page = source ? pageByNumber.get(source.page) : undefined;
  let props: Record<string, unknown>;
  let assetPlan: StoryboardArtifact["scenes"][number]["asset_plan"];

  if (visualType === "TITLE") {
    props = {
      title: route.heading,
      subtitle: route.key_points.join(" · "),
      chapter_label: chapter.title,
    };
    assetPlan = {
      mode: "GENERATED_LAYOUT",
      instructions: ["Render title card with chapter identity."],
    };
  } else if (visualType === "ORIGINAL_PAGE" && source && page) {
    props = {
      page: source.page,
      image_path: page.assets.page_image_path,
      caption: route.heading,
      fit: "contain",
    };
    assetPlan = {
      mode: "PAGE_IMAGE",
      page: source.page,
      source_path: page.assets.page_image_path,
      instructions: [
        "Preserve original page aspect ratio.",
        "Keep the complete source page visible.",
      ],
    };
  } else if (
    visualType === "CROP_AND_HIGHLIGHT" &&
    source?.bbox &&
    page
  ) {
    props = {
      page: source.page,
      image_path: page.assets.page_image_path,
      image_width: page.assets.width,
      image_height: page.assets.height,
      crop_bbox: source.bbox,
      highlight_bbox: source.bbox,
      caption: route.heading,
    };
    assetPlan = {
      mode: "SOURCE_CROP",
      page: source.page,
      source_path: page.assets.page_image_path,
      crop_bbox: source.bbox,
      instructions: [
        "Crop around the element bounding box with safe padding.",
        "Highlight the exact source element without covering content.",
      ],
    };
  } else if (
    visualType === "DIAGRAM" &&
    source &&
    route.diagram
  ) {
    props = {
      title: route.heading,
      nodes: route.diagram.nodes,
      edges: route.diagram.edges,
      source_page: source.page,
    };
    assetPlan = {
      mode: "GENERATED_LAYOUT",
      page: source.page,
      source_path: page?.assets.page_image_path,
      instructions: [
        "Render only the supplied nodes and edges.",
        "Keep source page available as a visual reference.",
      ],
    };
  } else if (visualType === "SUMMARY") {
    props = {
      title: route.heading,
      points: route.key_points,
      chapter_id: chapter.chapter_id,
    };
    assetPlan = {
      mode: "GENERATED_LAYOUT",
      instructions: ["Render a concise chapter recap."],
    };
  } else {
    visualType = "BULLET";
    props = {
      heading: route.heading,
      bullets: route.key_points,
      accent: "blue",
    };
    assetPlan = {
      mode: "GENERATED_LAYOUT",
      instructions: ["Render deterministic heading and bullet layout."],
    };
  }

  const finalSourceIds = unique(
    route.source_ids.filter((sourceId) => sourceById.has(sourceId)),
  );
  return {
    visual: {
      type: visualType,
      source_ids: finalSourceIds,
      template: templateName(visualType),
      props,
    },
    assetPlan,
    fallback: {
      visual_type: fallbackType(route, source),
      reason: source
        ? "Nếu template chính lỗi, hiển thị nguyên trang nguồn."
        : "Nếu template chính lỗi, hiển thị bullet layout tối giản.",
    },
    warnings,
  };
}

export function buildStoryboard(
  document: DocumentArtifact,
  script: ScriptArtifact,
  decisions: Map<string, ChapterStoryboardDecision>,
): StoryboardArtifact {
  const scenes: StoryboardArtifact["scenes"] = [];
  let sceneNumber = 1;

  for (const chapter of script.chapters) {
    const decision = decisions.get(chapter.chapter_id);
    if (!decision) {
      throw new Error(
        `Thiếu storyboard decision cho ${chapter.chapter_id}.`,
      );
    }
    const routeByNarrationId = new Map(
      decision.routes.map((route) => [route.narration_id, route]),
    );
    for (const narration of chapter.narrations) {
      const route = routeByNarrationId.get(narration.narration_id);
      if (!route) {
        throw new Error(
          `Thiếu visual route cho ${narration.narration_id}.`,
        );
      }
      const prepared = buildVisual(
        route,
        narration,
        chapter,
        document,
      );
      scenes.push({
        scene_id: `scene_${String(sceneNumber).padStart(4, "0")}`,
        chapter_id: chapter.chapter_id,
        narration_id: narration.narration_id,
        narration: narration.text,
        visual: prepared.visual,
        asset_plan: prepared.assetPlan,
        fallback: prepared.fallback,
        warnings: prepared.warnings,
        estimated_duration_seconds:
          narration.estimated_duration_seconds,
      });
      sceneNumber += 1;
    }
  }

  const expectedNarrationIds = script.chapters.flatMap((chapter) =>
    chapter.narrations.map((narration) => narration.narration_id),
  );
  const sceneNarrationIds = scenes.map((scene) => scene.narration_id);
  const counts = new Map<string, number>();
  for (const narrationId of sceneNarrationIds) {
    counts.set(narrationId, (counts.get(narrationId) ?? 0) + 1);
  }
  const validSourceIds = new Set(
    document.sources.map((source) => source.source_id),
  );
  const storyboardDuration = normalizedDuration(
    scenes.reduce(
      (total, scene) => total + scene.estimated_duration_seconds,
      0,
    ),
  );
  const durationDelta = normalizedDuration(
    Math.abs(storyboardDuration - script.estimated_duration_seconds),
  );

  return {
    schema_version: "1.0",
    title: script.title,
    language: script.language,
    estimated_duration_seconds: storyboardDuration,
    scenes,
    validation: {
      total_narrations: expectedNarrationIds.length,
      total_scenes: scenes.length,
      missing_narration_ids: expectedNarrationIds.filter(
        (narrationId) => !counts.has(narrationId),
      ),
      duplicate_narration_ids: [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([narrationId]) => narrationId),
      invalid_source_ids: unique(
        scenes
          .flatMap((scene) => scene.visual.source_ids)
          .filter((sourceId) => !validSourceIds.has(sourceId)),
      ),
      duration_delta_seconds: durationDelta,
    },
  };
}
