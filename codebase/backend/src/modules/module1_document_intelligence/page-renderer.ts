import { createCanvas } from "@napi-rs/canvas";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { z } from "zod";
import type { ValidatedPdf } from "./pdf-validator.js";

const pageAssetSchema = z.object({
  page: z.number().int().positive(),
  page_image_file: z.string().min(1),
  thumbnail_file: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  thumbnail_width: z.number().int().positive(),
  thumbnail_height: z.number().int().positive(),
});

const pageAssetManifestSchema = z.object({
  schema_version: z.literal("1.0"),
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  pages: z.array(pageAssetSchema),
});

export type PageAsset = z.infer<typeof pageAssetSchema>;

export interface PageAssetReference {
  page: number;
  page_image_path: string;
  thumbnail_path: string;
  width: number;
  height: number;
  thumbnail_width: number;
  thumbnail_height: number;
}

function portablePath(value: string): string {
  return value.replaceAll("\\", "/");
}

async function readCachedManifest(
  cacheDirectory: string,
  sha256: string,
): Promise<z.infer<typeof pageAssetManifestSchema> | null> {
  try {
    const raw = await readFile(
      path.join(cacheDirectory, "manifest.json"),
      "utf8",
    );
    const manifest = pageAssetManifestSchema.parse(JSON.parse(raw));
    return manifest.source_sha256 === sha256 ? manifest : null;
  } catch {
    return null;
  }
}

async function renderToCache(
  pdf: ValidatedPdf,
  cacheDirectory: string,
  onPageRendered?: (completedPages: number, totalPages: number) => void,
): Promise<z.infer<typeof pageAssetManifestSchema>> {
  await mkdir(cacheDirectory, { recursive: true });
  const loadingTask = getDocument({
    data: new Uint8Array(pdf.bytes),
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;
  const pages: PageAsset[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const fullViewport = page.getViewport({ scale: 1.5 });
      const thumbnailScale = Math.min(1, 320 / baseViewport.width);
      const thumbnailViewport = page.getViewport({ scale: thumbnailScale });

      const width = Math.ceil(fullViewport.width);
      const height = Math.ceil(fullViewport.height);
      const thumbnailWidth = Math.ceil(thumbnailViewport.width);
      const thumbnailHeight = Math.ceil(thumbnailViewport.height);
      const pageImageFile = `page-${String(pageNumber).padStart(3, "0")}.png`;
      const thumbnailFile = `page-${String(pageNumber).padStart(3, "0")}-thumb.png`;

      const canvas = createCanvas(width, height);
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: canvas.getContext(
          "2d",
        ) as unknown as CanvasRenderingContext2D,
        viewport: fullViewport,
      }).promise;
      await writeFile(
        path.join(cacheDirectory, pageImageFile),
        canvas.toBuffer("image/png"),
      );

      const thumbnailCanvas = createCanvas(thumbnailWidth, thumbnailHeight);
      await page.render({
        canvas: thumbnailCanvas as unknown as HTMLCanvasElement,
        canvasContext: thumbnailCanvas.getContext(
          "2d",
        ) as unknown as CanvasRenderingContext2D,
        viewport: thumbnailViewport,
      }).promise;
      await writeFile(
        path.join(cacheDirectory, thumbnailFile),
        thumbnailCanvas.toBuffer("image/png"),
      );

      pages.push({
        page: pageNumber,
        page_image_file: pageImageFile,
        thumbnail_file: thumbnailFile,
        width,
        height,
        thumbnail_width: thumbnailWidth,
        thumbnail_height: thumbnailHeight,
      });
      onPageRendered?.(pageNumber, document.numPages);
      page.cleanup();
    }
  } finally {
    document.cleanup();
    await loadingTask.destroy();
  }

  const manifest = {
    schema_version: "1.0" as const,
    source_sha256: pdf.sha256,
    pages,
  };
  await writeFile(
    path.join(cacheDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifest;
}

export async function renderPdfPages(
  pdf: ValidatedPdf,
  projectDirectory: string,
  runDirectory: string,
  onPageRendered?: (completedPages: number, totalPages: number) => void,
): Promise<PageAssetReference[]> {
  const cacheDirectory = path.join(
    projectDirectory,
    ".cache",
    "page-assets",
    pdf.sha256,
  );
  let manifest = await readCachedManifest(cacheDirectory, pdf.sha256);
  if (!manifest || manifest.pages.length !== pdf.pageCount) {
    process.stdout.write("  Rendering PDF pages and thumbnails...\n");
    manifest = await renderToCache(pdf, cacheDirectory, onPageRendered);
  } else {
    process.stdout.write("  Page asset cache hit.\n");
    onPageRendered?.(manifest.pages.length, manifest.pages.length);
  }

  const runAssetDirectory = path.join(runDirectory, "assets", "pages");
  await mkdir(path.dirname(runAssetDirectory), { recursive: true });
  await cp(cacheDirectory, runAssetDirectory, {
    recursive: true,
    force: true,
  });

  return manifest.pages.map((pageAsset) => ({
    page: pageAsset.page,
    page_image_path: portablePath(
      path.relative(
        projectDirectory,
        path.join(runAssetDirectory, pageAsset.page_image_file),
      ),
    ),
    thumbnail_path: portablePath(
      path.relative(
        projectDirectory,
        path.join(runAssetDirectory, pageAsset.thumbnail_file),
      ),
    ),
    width: pageAsset.width,
    height: pageAsset.height,
    thumbnail_width: pageAsset.thumbnail_width,
    thumbnail_height: pageAsset.thumbnail_height,
  }));
}
