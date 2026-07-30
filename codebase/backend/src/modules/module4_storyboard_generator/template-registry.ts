import { z } from "zod";

export const visualTypeSchema = z.enum([
  "TITLE",
  "ORIGINAL_PAGE",
  "CROP_AND_HIGHLIGHT",
  "BULLET",
  "DIAGRAM",
  "SUMMARY",
]);

export type VisualType = z.infer<typeof visualTypeSchema>;

const bboxSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

const templateDefinitions = {
  TITLE: {
    template: "title-card-v1",
    propsSchema: z.object({
      title: z.string().min(1),
      subtitle: z.string().min(1),
      chapter_label: z.string().min(1),
    }).strict(),
  },
  ORIGINAL_PAGE: {
    template: "original-page-v1",
    propsSchema: z.object({
      page: z.number().int().positive(),
      image_path: z.string().min(1),
      caption: z.string().min(1),
      fit: z.literal("contain"),
    }).strict(),
  },
  CROP_AND_HIGHLIGHT: {
    template: "crop-highlight-v1",
    propsSchema: z.object({
      page: z.number().int().positive(),
      image_path: z.string().min(1),
      image_width: z.number().int().positive(),
      image_height: z.number().int().positive(),
      crop_bbox: bboxSchema,
      highlight_bbox: bboxSchema,
      caption: z.string().min(1),
    }).strict(),
  },
  BULLET: {
    template: "bullet-v1",
    propsSchema: z.object({
      heading: z.string().min(1),
      bullets: z.array(z.string().min(1)).min(1).max(5),
      accent: z.literal("blue"),
    }).strict(),
  },
  DIAGRAM: {
    template: "diagram-v1",
    propsSchema: z.object({
      title: z.string().min(1),
      nodes: z.array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
        }).strict(),
      ).min(2).max(8),
      edges: z.array(
        z.object({
          from: z.string().min(1),
          to: z.string().min(1),
          label: z.string(),
        }).strict(),
      ).min(1).max(12),
      source_page: z.number().int().positive(),
    }).strict(),
  },
  SUMMARY: {
    template: "summary-v1",
    propsSchema: z.object({
      title: z.string().min(1),
      points: z.array(z.string().min(1)).min(1).max(5),
      chapter_id: z.string().min(1),
    }).strict(),
  },
} as const;

export function templateName(type: VisualType): string {
  return templateDefinitions[type].template;
}

export function validateTemplateProps(
  type: VisualType,
  props: Record<string, unknown>,
): void {
  templateDefinitions[type].propsSchema.parse(props);
}

export function registeredTemplates(): Array<{
  type: VisualType;
  template: string;
}> {
  return visualTypeSchema.options.map((type) => ({
    type,
    template: templateName(type),
  }));
}
