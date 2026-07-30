import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import type { SubtitleCue } from "./subtitle.js";
import type { LectureTimeline } from "./timeline.js";
import { runMediaCommand } from "./ffmpeg.js";

const probeSchema = z.object({
  streams: z.array(
    z.object({
      codec_type: z.string().optional(),
      codec_name: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      r_frame_rate: z.string().optional(),
      sample_rate: z.string().optional(),
      channels: z.number().optional(),
    }),
  ),
  format: z.object({
    duration: z.string(),
    size: z.string().optional(),
  }),
});

export interface MediaProbe {
  durationSeconds: number;
  fileSizeBytes: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  fps: number;
}

function parseRate(rate: string | undefined): number {
  if (!rate) return 0;
  const [numerator, denominator] = rate.split("/").map(Number);
  return denominator ? (numerator ?? 0) / denominator : numerator ?? 0;
}

export async function probeMedia(filePath: string): Promise<MediaProbe> {
  const result = await runMediaCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
    "-of",
    "json",
    filePath,
  ]);
  const parsed = probeSchema.parse(JSON.parse(result.stdout));
  const video = parsed.streams.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams.find((stream) => stream.codec_type === "audio");
  return {
    durationSeconds: Number(parsed.format.duration),
    fileSizeBytes: Number(parsed.format.size ?? (await stat(filePath)).size),
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    videoCodec: video?.codec_name ?? "",
    audioCodec: audio?.codec_name ?? "",
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    fps: parseRate(video?.r_frame_rate),
  };
}

export function validateTimeline(
  timeline: LectureTimeline,
  cues: SubtitleCue[],
): void {
  if (timeline.scenes.length === 0) {
    throw new Error("Timeline không có scene.");
  }
  for (let index = 1; index < timeline.chapterTimestamps.length; index += 1) {
    if (
      timeline.chapterTimestamps[index]!.start_seconds <=
      timeline.chapterTimestamps[index - 1]!.start_seconds
    ) {
      throw new Error("Chapter timestamp không tăng dần.");
    }
  }
  if (cues.length === 0) {
    throw new Error("Subtitle không có cue.");
  }
}

export async function validateFinalMedia(
  videoPath: string,
  subtitlePath: string,
  timeline: LectureTimeline,
  width: number,
  height: number,
  fps: number,
): Promise<MediaProbe> {
  const probe = await probeMedia(videoPath);
  const subtitle = await readFile(subtitlePath, "utf8");
  if (!probe.hasVideo || !probe.hasAudio) {
    throw new Error("Video cuối phải có cả video stream và audio stream.");
  }
  if (probe.videoCodec !== "h264" || probe.audioCodec !== "aac") {
    throw new Error(
      `Codec không hợp lệ: video=${probe.videoCodec}, audio=${probe.audioCodec}.`,
    );
  }
  if (probe.width !== width || probe.height !== height) {
    throw new Error(
      `Resolution không hợp lệ: ${probe.width}x${probe.height}.`,
    );
  }
  if (Math.abs(probe.fps - fps) > 0.01) {
    throw new Error(`FPS không hợp lệ: ${probe.fps}.`);
  }
  if (Math.abs(probe.durationSeconds - timeline.durationSeconds) > 0.2) {
    throw new Error(
      `Duration video ${probe.durationSeconds}s lệch timeline ${timeline.durationSeconds}s.`,
    );
  }
  if (!subtitle.includes("-->")) {
    throw new Error("Subtitle SRT không có timestamp.");
  }
  return probe;
}
