import type { PipelineConfig } from "../../core/config.js";
import {
  documentSchema,
  type DocumentArtifact,
} from "../../core/contracts.js";
import {
  type PipelineModule,
} from "../../core/module.js";
import { analyzePdfWithGemini } from "./gemini-document-analyzer.js";
import {
  createAnalysisCacheKey,
  readAnalysisCache,
  writeAnalysisCache,
} from "./module1-cache.js";
import { renderPdfPages } from "./page-renderer.js";
import { validatePdf } from "./pdf-validator.js";
import { getVertexEnvironment } from "../../providers/google/gemini-client.js";

export const module1DocumentIntelligence: PipelineModule<
  PipelineConfig,
  DocumentArtifact
> = {
  name: "module1_document_intelligence",
  description:
    "Đọc PDF đa phương thức, lập cấu trúc tài liệu và Source Registry.",
  outputFile: "01_document.json",
  outputSchema: documentSchema,
  async run(config, context) {
    const pdf = await validatePdf(config, context.projectDirectory);
    const environment = getVertexEnvironment();
    const cacheKey = createAnalysisCacheKey(
      pdf,
      config,
      environment.documentModel,
    );
    let analysis = await readAnalysisCache(context.projectDirectory, cacheKey);
    if (analysis) {
      process.stdout.write("  Document analysis cache hit.\n");
    } else {
      analysis = await analyzePdfWithGemini(pdf, config);
      await writeAnalysisCache(context.projectDirectory, cacheKey, analysis);
    }

    const pageAssets = await renderPdfPages(
      pdf,
      context.projectDirectory,
      context.runDirectory,
    );
    const assetsByPage = new Map(
      pageAssets.map((assets) => [assets.page, assets]),
    );

    return {
      schema_version: "1.0",
      title: analysis.title,
      source_file: config.input_pdf,
      source_sha256: pdf.sha256,
      source_size_bytes: pdf.sizeBytes,
      language: analysis.language,
      total_pages: pdf.pageCount,
      sources: analysis.sources,
      pages: analysis.pages.map((page) => {
        const assets = assetsByPage.get(page.page);
        if (!assets) {
          throw new Error(`Thiếu page assets cho trang ${page.page}.`);
        }
        return { ...page, assets };
      }),
      sections: analysis.sections,
      warnings: analysis.warnings,
    };
  },
};
