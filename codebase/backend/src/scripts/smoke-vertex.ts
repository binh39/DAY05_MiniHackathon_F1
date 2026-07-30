import { z } from "zod";
import {
  createVertexClient,
  getVertexEnvironment,
} from "../providers/google/gemini-client.js";

const smokeResponseSchema = z.object({
  status: z.literal("ok"),
  message: z.string().min(1),
});

async function main(): Promise<void> {
  const environment = getVertexEnvironment();
  const client = createVertexClient(environment);
  const startedAt = performance.now();

  process.stdout.write(
    `Vertex smoke test: project=${environment.project}, location=${environment.location}, model=${environment.documentModel}\n`,
  );

  const response = await client.models.generateContent({
    model: environment.documentModel,
    contents:
      'Return JSON with status exactly "ok" and a short Vietnamese message confirming the connection.',
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["status", "message"],
        properties: {
          status: { type: "string", const: "ok" },
          message: { type: "string" },
        },
      },
    },
  });

  if (!response.text) {
    throw new Error("Vertex AI không trả về text.");
  }

  const result = smokeResponseSchema.parse(JSON.parse(response.text));
  const latencyMs = Math.round(performance.now() - startedAt);
  process.stdout.write(`✓ ${result.message}\n`);
  process.stdout.write(`latency_ms=${latencyMs}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Vertex smoke test thất bại: ${message}\n`);
  process.exitCode = 1;
});
