import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

function drawTitle(page: PDFPage, font: PDFFont, text: string): void {
  page.drawText(text, {
    x: 64,
    y: 760,
    size: 24,
    font,
    color: rgb(0.08, 0.2, 0.45),
  });
}

function drawLines(
  page: PDFPage,
  font: PDFFont,
  lines: string[],
  startY = 700,
): void {
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 72,
      y: startY - index * 34,
      size: 15,
      font,
      color: rgb(0.12, 0.12, 0.15),
    });
  });
}

async function main(): Promise<void> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page1 = pdf.addPage([960, 540]);
  drawTitle(page1, bold, "Introduction to Machine Learning");
  drawLines(
    page1,
    regular,
    [
      "Learning objectives",
      "- Distinguish supervised and unsupervised learning.",
      "- Understand the basic model training workflow.",
      "- Recognize the role of evaluation data.",
    ],
    680,
  );

  const page2 = pdf.addPage([960, 540]);
  drawTitle(page2, bold, "Two common learning settings");
  drawLines(
    page2,
    regular,
    [
      "Supervised learning",
      "Uses labeled examples to learn a mapping from input to target.",
      "Examples: classification and regression.",
      "",
      "Unsupervised learning",
      "Finds structure in data without target labels.",
      "Example: clustering similar observations.",
    ],
    680,
  );

  const page3 = pdf.addPage([960, 540]);
  drawTitle(page3, bold, "A simple training workflow");
  drawLines(
    page3,
    regular,
    [
      "1. Define the prediction task.",
      "2. Prepare training and evaluation data.",
      "3. Train a model on the training split.",
      "4. Evaluate on data not used for training.",
      "5. Inspect errors before deployment.",
      "",
      "Key warning: evaluation data must not leak into training.",
    ],
    680,
  );

  const outputDirectory = path.resolve(process.cwd(), "inputs");
  const outputPath = path.join(outputDirectory, "example.pdf");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, await pdf.save());
  process.stdout.write(`Created ${outputPath}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Không thể tạo sample PDF: ${message}\n`);
  process.exitCode = 1;
});
