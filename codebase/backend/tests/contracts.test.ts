import assert from "node:assert/strict";
import test from "node:test";
import { sourceReferenceSchema } from "../src/core/contracts.js";
import { describePipeline } from "../src/pipeline/pipeline-definition.js";

test("source reference requires page-level traceability", () => {
  const source = sourceReferenceSchema.parse({
    source_id: "p12_e04",
    page: 12,
    element_type: "DIAGRAM",
    confidence: 0.95,
  });

  assert.equal(source.source_id, "p12_e04");
  assert.equal(source.page, 12);
});

test("pipeline description exposes all named modules", () => {
  const description = describePipeline();
  assert.match(description, /module1_document_intelligence/);
  assert.match(description, /module5a_visual_generator/);
  assert.match(description, /module5b_voice_generator/);
  assert.match(description, /module6_video_composer/);
});
