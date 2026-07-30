import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import type { PipelineConfig } from "../../core/config.js";

export interface ValidatedPdf {
  absolutePath: string;
  fileName: string;
  bytes: Uint8Array;
  pageCount: number;
  sizeBytes: number;
  sha256: string;
}

export async function validatePdf(
  config: PipelineConfig,
  projectDirectory: string,
): Promise<ValidatedPdf> {
  const absolutePath = path.resolve(projectDirectory, config.input_pdf);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new Error(`Input không phải file: ${config.input_pdf}`);
  }

  const maximumBytes = config.limits.max_pdf_megabytes * 1024 * 1024;
  if (fileStat.size > maximumBytes) {
    throw new Error(
      `PDF vượt giới hạn ${config.limits.max_pdf_megabytes} MB.`,
    );
  }

  const buffer = await readFile(absolutePath);
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("File không có PDF magic bytes hợp lệ.");
  }

  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Không thể đọc PDF; file có thể hỏng hoặc bị mã hóa: ${detail}`);
  }

  const pageCount = pdf.getPageCount();
  if (pageCount < 1) {
    throw new Error("PDF không có trang.");
  }
  if (pageCount > config.limits.max_pdf_pages) {
    throw new Error(`PDF vượt giới hạn ${config.limits.max_pdf_pages} trang.`);
  }

  return {
    absolutePath,
    fileName: path.basename(absolutePath),
    bytes: buffer,
    pageCount,
    sizeBytes: fileStat.size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
