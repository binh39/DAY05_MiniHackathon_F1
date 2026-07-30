import path from "node:path";
import "dotenv/config";
import { createServer } from "./app.js";

const projectDirectory = path.resolve(process.cwd());
const server = await createServer(projectDirectory);
const port = Number(process.env.API_PORT ?? 8787);
const host = process.env.API_HOST ?? "127.0.0.1";

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exitCode = 1;
}
