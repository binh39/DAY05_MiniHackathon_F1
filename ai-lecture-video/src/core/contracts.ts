import { z } from "zod";

export const sourceReferenceSchema = z.object({
  source_id: z.string().min(1),
  page: z.number().int().positive(),
  element_type: z.enum([
    "TEXT",
    "IMAGE",
    "DIAGRAM",
    "TABLE",
    "FORMULA",
    "CODE",
  ]),
  excerpt: z.string().optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  confidence: z.number().min(0).max(1),
});

export const documentSchema = z.object({
  schema_version: z.literal("1.0"),
  title: z.string().min(1),
  source_file: z.string().min(1),
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  source_size_bytes: z.number().int().positive(),
  language: z.string().min(2),
  total_pages: z.number().int().positive(),
  sources: z.array(sourceReferenceSchema),
  pages: z.array(
    z.object({
      page: z.number().int().positive(),
      summary: z.string(),
      concepts: z.array(z.string()),
      source_ids: z.array(z.string()),
      warnings: z.array(z.string()),
      assets: z.object({
        page_image_path: z.string().min(1),
        thumbnail_path: z.string().min(1),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        thumbnail_width: z.number().int().positive(),
        thumbnail_height: z.number().int().positive(),
      }),
    }),
  ),
  sections: z.array(
    z.object({
      section_id: z.string().min(1),
      title: z.string().min(1),
      concepts: z.array(z.string()),
      source_ids: z.array(z.string()),
    }),
  ),
  warnings: z.array(z.string()),
});

export const lecturePlanSchema = z.object({
  schema_version: z.literal("1.0"),
  title: z.string().min(1),
  coverage_mode: z.enum(["FULL", "CONCISE", "SUMMARY"]),
  audience: z.string().min(1),
  language: z.string().min(2),
  estimated_duration_seconds: z.number().nonnegative(),
  learning_objectives: z.array(z.string()),
  chapters: z.array(
    z.object({
      chapter_id: z.string().min(1),
      title: z.string().min(1),
      learning_objectives: z.array(z.string().min(1)).min(1),
      duration_seconds: z.number().positive(),
      source_ids: z.array(z.string()).min(1),
      page_numbers: z.array(z.number().int().positive()).min(1),
      items: z.array(
        z.object({
          item_id: z.string().min(1),
          title: z.string().min(1),
          treatment: z.enum([
            "EXPLAIN",
            "MENTION",
            "SHOW",
            "REFERENCE",
            "UNREADABLE",
            "DUPLICATE",
          ]),
          reason: z.string().min(1),
          source_ids: z.array(z.string()).min(1),
          page_numbers: z.array(z.number().int().positive()).min(1),
          estimated_narration_words: z.number().int().nonnegative(),
          duration_seconds: z.number().positive(),
        }),
      ).min(1),
    }),
  ).min(1),
  coverage: z.object({
    total_pages: z.number().int().positive(),
    total_sources: z.number().int().positive(),
    accounted_pages: z.array(z.number().int().positive()),
    accounted_source_ids: z.array(z.string()),
    covered_pages: z.array(z.number().int().positive()),
    reference_pages: z.array(z.number().int().positive()),
    unreadable_pages: z.array(z.number().int().positive()),
    duplicate_pages: z.array(z.number().int().positive()),
    coverage_rate: z.number().min(0).max(1),
  }),
  warnings: z.array(z.string()),
});

export const scriptSchema = z.object({
  schema_version: z.literal("1.0"),
  title: z.string().min(1),
  language: z.string().min(2),
  estimated_duration_seconds: z.number().positive(),
  chapters: z.array(
    z.object({
      chapter_id: z.string().min(1),
      title: z.string().min(1),
      estimated_duration_seconds: z.number().positive(),
      learning_objectives: z.array(z.string().min(1)).min(1),
      objective_coverage: z.array(
        z.object({
          objective_index: z.number().int().nonnegative(),
          objective: z.string().min(1),
          narration_ids: z.array(z.string().min(1)).min(1),
        }),
      ),
      narrations: z.array(
        z.object({
          narration_id: z.string().min(1),
          item_id: z.string().min(1).optional(),
          kind: z.enum([
            "GROUNDED_CLAIM",
            "TEACHING_ANALOGY",
            "EXAMPLE",
            "TRANSITION",
            "LEARNING_CHECK",
          ]),
          text: z.string().min(1),
          source_ids: z.array(z.string()),
          objective_indices: z.array(z.number().int().nonnegative()),
          estimated_duration_seconds: z.number().positive(),
        }),
      ).min(1),
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
  validation: z.object({
    grounded_claims: z.number().int().nonnegative(),
    ungrounded_claims: z.array(z.string()),
    missing_objectives: z.array(z.string()),
    semantic_reviewed: z.boolean(),
    semantic_issues: z.array(
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
  }),
});

export const storyboardSchema = z.object({
  schema_version: z.literal("1.0"),
  title: z.string().min(1),
  language: z.string().min(2),
  estimated_duration_seconds: z.number().positive(),
  scenes: z.array(
    z.object({
      scene_id: z.string().min(1),
      chapter_id: z.string().min(1),
      narration_id: z.string().min(1),
      narration: z.string().min(1),
      visual: z.object({
        type: z.enum([
          "TITLE",
          "ORIGINAL_PAGE",
          "CROP_AND_HIGHLIGHT",
          "BULLET",
          "DIAGRAM",
          "SUMMARY",
        ]),
        source_ids: z.array(z.string()),
        template: z.string().min(1),
        props: z.record(z.unknown()),
      }),
      asset_plan: z.object({
        mode: z.enum([
          "PAGE_IMAGE",
          "SOURCE_CROP",
          "GENERATED_LAYOUT",
          "NONE",
        ]),
        page: z.number().int().positive().optional(),
        source_path: z.string().min(1).optional(),
        crop_bbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional(),
        instructions: z.array(z.string().min(1)),
      }),
      fallback: z.object({
        visual_type: z.enum([
          "TITLE",
          "ORIGINAL_PAGE",
          "CROP_AND_HIGHLIGHT",
          "BULLET",
          "DIAGRAM",
          "SUMMARY",
        ]),
        reason: z.string().min(1),
      }),
      warnings: z.array(z.string()),
      estimated_duration_seconds: z.number().positive(),
    }),
  ).min(1),
  validation: z.object({
    total_narrations: z.number().int().positive(),
    total_scenes: z.number().int().positive(),
    missing_narration_ids: z.array(z.string()),
    duplicate_narration_ids: z.array(z.string()),
    invalid_source_ids: z.array(z.string()),
    duration_delta_seconds: z.number().nonnegative(),
  }),
});

export const visualManifestSchema = z.object({
  schema_version: z.literal("1.0"),
  render_engine: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  total_scenes: z.number().int().nonnegative(),
  scenes: z.array(
    z.object({
      scene_id: z.string().min(1),
      template: z.string().min(1),
      asset_path: z.string().min(1),
      asset_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      status: z.enum(["READY", "WARNING", "FAILED"]),
      warnings: z.array(z.string()),
    }),
  ),
});

export const voiceManifestSchema = z.object({
  schema_version: z.literal("1.0"),
  provider: z.string().min(1),
  voice_id: z.string().min(1),
  audio_encoding: z.literal("LINEAR16"),
  sample_rate_hertz: z.number().int().positive(),
  total_scenes: z.number().int().nonnegative(),
  total_duration_seconds: z.number().nonnegative(),
  scenes: z.array(
    z.object({
      scene_id: z.string().min(1),
      narration_id: z.string().min(1),
      audio_path: z.string().min(1),
      audio_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      duration_seconds: z.number().positive(),
      sample_rate_hertz: z.number().int().positive(),
      status: z.enum(["READY", "WARNING", "FAILED"]),
      warnings: z.array(z.string()),
    }),
  ),
});

export const videoManifestSchema = z.object({
  schema_version: z.literal("1.0"),
  video_path: z.string().min(1),
  video_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  file_size_bytes: z.number().int().positive(),
  video_codec: z.literal("h264"),
  audio_codec: z.literal("aac"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  total_scenes: z.number().int().positive(),
  subtitle_path: z.string().min(1),
  subtitle_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  duration_seconds: z.number().positive(),
  chapter_timestamps: z.array(
    z.object({
      chapter_id: z.string().min(1),
      start_seconds: z.number().nonnegative(),
    }),
  ),
  coverage_report_path: z.string().min(1),
  coverage_report_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  warnings: z.array(z.string()),
});

export type DocumentArtifact = z.infer<typeof documentSchema>;
export type LecturePlanArtifact = z.infer<typeof lecturePlanSchema>;
export type ScriptArtifact = z.infer<typeof scriptSchema>;
export type StoryboardArtifact = z.infer<typeof storyboardSchema>;
export type VisualManifest = z.infer<typeof visualManifestSchema>;
export type VoiceManifest = z.infer<typeof voiceManifestSchema>;
export type VideoManifest = z.infer<typeof videoManifestSchema>;
