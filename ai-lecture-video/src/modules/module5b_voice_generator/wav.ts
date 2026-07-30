import { writeFile } from "node:fs/promises";

export interface WavMetadata {
  audioFormat: number;
  channels: number;
  sampleRateHertz: number;
  byteRate: number;
  bitsPerSample: number;
  dataSizeBytes: number;
  durationSeconds: number;
}

export function parseWav(buffer: Buffer): WavMetadata {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Audio không có RIFF/WAVE header hợp lệ.");
  }
  let offset = 12;
  let format:
    | Omit<WavMetadata, "dataSizeBytes" | "durationSeconds">
    | undefined;
  let dataSizeBytes: number | undefined;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > buffer.length) {
      throw new Error(`WAV chunk ${chunkId} vượt kích thước file.`);
    }
    if (chunkId === "fmt " && chunkSize >= 16) {
      format = {
        audioFormat: buffer.readUInt16LE(dataOffset),
        channels: buffer.readUInt16LE(dataOffset + 2),
        sampleRateHertz: buffer.readUInt32LE(dataOffset + 4),
        byteRate: buffer.readUInt32LE(dataOffset + 8),
        bitsPerSample: buffer.readUInt16LE(dataOffset + 14),
      };
    }
    if (chunkId === "data") {
      dataSizeBytes = chunkSize;
    }
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  if (!format || dataSizeBytes === undefined) {
    throw new Error("WAV thiếu fmt hoặc data chunk.");
  }
  if (
    format.audioFormat !== 1 ||
    format.channels !== 1 ||
    format.bitsPerSample !== 16
  ) {
    throw new Error(
      `WAV phải là PCM mono 16-bit; actual format=${format.audioFormat}, channels=${format.channels}, bits=${format.bitsPerSample}.`,
    );
  }
  if (format.byteRate <= 0 || dataSizeBytes <= 0) {
    throw new Error("WAV không có audio payload hợp lệ.");
  }
  return {
    ...format,
    dataSizeBytes,
    durationSeconds: dataSizeBytes / format.byteRate,
  };
}

export function createSilentWav(
  durationSeconds: number,
  sampleRateHertz = 24_000,
): Buffer {
  const samples = Math.max(1, Math.ceil(durationSeconds * sampleRateHertz));
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRateHertz, 24);
  buffer.writeUInt32LE(sampleRateHertz * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

export async function writeSilentWav(
  filePath: string,
  durationSeconds: number,
  sampleRateHertz = 24_000,
): Promise<void> {
  await writeFile(
    filePath,
    createSilentWav(durationSeconds, sampleRateHertz),
  );
}
