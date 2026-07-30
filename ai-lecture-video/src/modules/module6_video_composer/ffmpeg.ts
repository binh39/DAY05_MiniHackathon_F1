import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

interface CompositorPackage {
  dir: string;
}

function compositorPackageName(): string {
  const key = `${process.platform}-${process.arch}`;
  const packages: Record<string, string> = {
    "win32-x64": "@remotion/compositor-win32-x64-msvc",
    "darwin-x64": "@remotion/compositor-darwin-x64",
    "darwin-arm64": "@remotion/compositor-darwin-arm64",
    "linux-x64": "@remotion/compositor-linux-x64-gnu",
    "linux-arm64": "@remotion/compositor-linux-arm64-gnu",
  };
  const packageName = packages[key];
  if (!packageName) {
    throw new Error(`Không hỗ trợ Remotion compositor trên ${key}.`);
  }
  return packageName;
}

export function remotionBinary(binary: "ffmpeg" | "ffprobe"): string {
  const require = createRequire(import.meta.url);
  const compositor = require(compositorPackageName()) as CompositorPackage;
  return path.join(
    compositor.dir,
    process.platform === "win32" ? `${binary}.exe` : binary,
  );
}

export async function runMediaCommand(
  binary: "ffmpeg" | "ffprobe",
  args: string[],
  options: {
    cwd?: string;
    timeoutMs?: number;
  } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(remotionBinary(binary), args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${binary} timeout sau ${options.timeoutMs ?? 300_000}ms.`));
    }, options.timeoutMs ?? 300_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `${binary} exit ${code}: ${stderr.slice(-2_000) || stdout.slice(-2_000)}`,
          ),
        );
      }
    });
  });
}
