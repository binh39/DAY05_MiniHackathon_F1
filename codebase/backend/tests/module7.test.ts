import assert from "node:assert/strict";
import test from "node:test";
import { summaryArtifactSchema } from "../src/modules/module7_summary_generator/index.js";

test("summary artifact preserves structured Vietnamese text and source pages", () => {
  const summary = summaryArtifactSchema.parse({
    schema_version: "1.0",
    title: "Tổng quan quy trình phát triển phần mềm",
    overview: "Tài liệu trình bày các bước chính của một quy trình phát triển.",
    key_points: [
      {
        heading: "Các giai đoạn chính",
        content: "Quy trình đi từ phân tích yêu cầu đến triển khai và bảo trì.",
        source_pages: [1, 2],
      },
    ],
    conclusion: "Mỗi giai đoạn cần đầu vào, đầu ra và tiêu chí kiểm tra rõ ràng.",
    warnings: [],
  });

  assert.equal(summary.schema_version, "1.0");
  assert.equal(summary.key_points[0]?.source_pages.join(","), "1,2");
  assert.match(summary.title, /quy trình/i);
});

test("summary artifact rejects key points without page references", () => {
  const result = summaryArtifactSchema.safeParse({
    schema_version: "1.0",
    title: "Tóm tắt",
    overview: "Nội dung tổng quan.",
    key_points: [
      {
        heading: "Ý chính",
        content: "Nội dung ý chính.",
        source_pages: [],
      },
    ],
    conclusion: "Kết luận.",
    warnings: [],
  });

  assert.equal(result.success, false);
});
