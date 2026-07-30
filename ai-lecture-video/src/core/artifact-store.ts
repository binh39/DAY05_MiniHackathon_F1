import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class ArtifactStore {
  constructor(private readonly runDirectory: string) {}

  async initialize(): Promise<void> {
    await mkdir(this.runDirectory, { recursive: true });
  }

  async writeJson(fileName: string, value: unknown): Promise<string> {
    const outputPath = path.join(this.runDirectory, fileName);
    await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    return outputPath;
  }

  async readJson<T>(fileName: string): Promise<T> {
    return JSON.parse(
      await readFile(path.join(this.runDirectory, fileName), "utf8"),
    ) as T;
  }
}
