import type { LectureTimeline, TimelineScene } from "./timeline.js";

export interface SubtitleCue {
  index: number;
  startSeconds: number;
  endSeconds: number;
  lines: string[];
  sceneId: string;
}

function cleanNarration(text: string): string {
  return text
    .replace(/\bp\d+_e\d+\b/giu, "")
    .replace(/\[(?:source|nguồn)[^\]]*\]/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function wrapCue(text: string, maxLineLength = 42): string[] {
  const words = text.split(/\s+/u);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxLineLength || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function chunks(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?…])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const output: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/u);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const candidateLines = wrapCue(candidate);
      if (
        !current ||
        (candidateLines.length <= 2 &&
          candidateLines.every((line) => line.length <= 48))
      ) {
        current = candidate;
      } else {
        output.push(current);
        current = word;
      }
    }
    if (current) output.push(current);
  }
  return output.length > 0 ? output : [text];
}

function sceneCues(scene: TimelineScene): Omit<SubtitleCue, "index">[] {
  const text = cleanNarration(scene.narration);
  if (!text) return [];
  const parts = chunks(text);
  const weights = parts.map((part) => Math.max(1, part.length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = scene.startSeconds;
  return parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const duration = isLast
      ? scene.startSeconds + scene.voiceDurationSeconds - cursor
      : (scene.voiceDurationSeconds * weights[index]!) / totalWeight;
    const startSeconds = cursor;
    const endSeconds = Math.max(startSeconds + 0.1, cursor + duration);
    cursor = endSeconds;
    return {
      startSeconds,
      endSeconds,
      lines: wrapCue(part),
      sceneId: scene.sceneId,
    };
  });
}

export function buildSubtitleCues(timeline: LectureTimeline): SubtitleCue[] {
  return timeline.scenes
    .flatMap(sceneCues)
    .map((cue, index) => ({ ...cue, index: index + 1 }));
}

function srtTimestamp(seconds: number): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

export function renderSrt(cues: SubtitleCue[]): string {
  return `${cues
    .map(
      (cue) =>
        `${cue.index}\n${srtTimestamp(cue.startSeconds)} --> ${srtTimestamp(cue.endSeconds)}\n${cue.lines.join("\n")}`,
    )
    .join("\n\n")}\n`;
}

export function validateSubtitleCues(
  cues: SubtitleCue[],
  durationSeconds: number,
): void {
  let previousEnd = 0;
  for (const cue of cues) {
    if (cue.startSeconds < previousEnd - 0.001) {
      throw new Error(`Subtitle cue ${cue.index} bị chồng timestamp.`);
    }
    if (cue.endSeconds <= cue.startSeconds) {
      throw new Error(`Subtitle cue ${cue.index} có duration không hợp lệ.`);
    }
    if (cue.lines.length > 2 || cue.lines.some((line) => line.length > 48)) {
      throw new Error(`Subtitle cue ${cue.index} vượt quality bar 2×48 ký tự.`);
    }
    if (cue.endSeconds > durationSeconds + 0.01) {
      throw new Error(`Subtitle cue ${cue.index} vượt duration video.`);
    }
    previousEnd = cue.endSeconds;
  }
}
