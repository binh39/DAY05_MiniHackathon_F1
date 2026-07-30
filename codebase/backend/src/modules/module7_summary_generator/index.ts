import { z } from "zod";
import type { DocumentArtifact } from "../../core/contracts.js";

export const summaryArtifactSchema = z.object({
  schema_version: z.literal("1.0"),
  title: z.string().min(1),
  overview: z.string().min(1),
  key_points: z
    .array(
      z.object({
        heading: z.string().min(1),
        content: z.string().min(1),
        source_pages: z.array(z.number().int().positive()).min(1),
      }),
    )
    .min(1),
  conclusion: z.string().min(1),
  warnings: z.array(z.string()),
});

export type SummaryArtifact = z.infer<typeof summaryArtifactSchema>;

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schema_version",
    "title",
    "overview",
    "key_points",
    "conclusion",
    "warnings",
  ],
  properties: {
    schema_version: { type: "string", enum: ["1.0"] },
    title: { type: "string" },
    overview: { type: "string" },
    key_points: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "content", "source_pages"],
        properties: {
          heading: { type: "string" },
          content: { type: "string" },
          source_pages: {
            type: "array",
            minItems: 1,
            items: { type: "integer" },
          },
        },
      },
    },
    conclusion: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

export async function generateSummary(
  document: DocumentArtifact,
  language = "vi",
): Promise<SummaryArtifact> {
  // The provider loads dotenv, so defer importing it until a new summary is
  // actually generated. The production entrypoint remains responsible for
  // initializing the environment.
  const { createVertexClient, getVertexEnvironment } = await import(
    "../../providers/google/gemini-client.js"
  );
  const environment = getVertexEnvironment();
  const client = createVertexClient(environment);
  const model =
    process.env.GEMINI_SUMMARY_MODEL?.trim() || environment.documentModel;
  const response = await client.models.generateContent({
    model,
    contents: `Bạn là biên tập viên học thuật. Hãy tóm tắt Document Intelligence JSON dưới đây bằng ${
      language === "en" ? "English" : "tiếng Việt chuẩn chính tả"
    }.

Quy tắc:
- Chỉ dùng thông tin có trong JSON, không suy diễn hoặc bổ sung kiến thức ngoài.
- Viết câu hoàn chỉnh, rõ ràng; không chép nguyên danh sách bullet rời rạc.
- Giữ đúng thuật ngữ chuyên môn và tên riêng.
- Mỗi ý chính phải ghi đúng source_pages.
- Nếu nguồn có confidence thấp hoặc warning quan trọng, ghi ngắn gọn trong warnings.
- Không dùng Markdown trong các trường văn bản. Chỉ trả về JSON.

Document:
${JSON.stringify({
  title: document.title,
  language: document.language,
  total_pages: document.total_pages,
  sections: document.sections,
  pages: document.pages.map((page) => ({
    page: page.page,
    summary: page.summary,
    concepts: page.concepts,
    warnings: page.warnings,
  })),
  sources: document.sources.map((source) => ({
    page: source.page,
    element_type: source.element_type,
    excerpt: source.excerpt,
    confidence: source.confidence,
  })),
  warnings: document.warnings,
})}`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema,
      temperature: 0.2,
    },
  });
  if (!response.text) {
    throw new Error("Gemini không trả nội dung tóm tắt.");
  }
  const summary = summaryArtifactSchema.parse(JSON.parse(response.text));
  const invalidPage = summary.key_points
    .flatMap((item) => item.source_pages)
    .find((page) => page > document.total_pages);
  if (invalidPage) {
    throw new Error(`Tóm tắt tham chiếu trang không tồn tại: ${invalidPage}.`);
  }
  return summary;
}
