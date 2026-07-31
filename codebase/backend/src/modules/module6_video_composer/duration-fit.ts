export const NATURAL_TEMPO_MIN = 0.85;
export const NATURAL_TEMPO_MAX = 1.15;
export const RECOVERY_TEMPO_MIN = 0.7;
export const RECOVERY_TEMPO_MAX = 1.35;

export interface DurationFitInput {
  rawDurationSeconds: number;
  fixedGapSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  targetSeconds: number;
}

export interface DurationFitResult {
  audioTempo: number;
  desiredDurationSeconds: number;
  mode: "NATURAL" | "RECOVERY" | "UNCHANGED";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function candidateForTempoRange(
  voiceSeconds: number,
  fixedGapSeconds: number,
  safeMinSeconds: number,
  safeMaxSeconds: number,
  targetSeconds: number,
  minimumTempo: number,
  maximumTempo: number,
): Omit<DurationFitResult, "mode"> | null {
  const shortestDuration = voiceSeconds / maximumTempo + fixedGapSeconds;
  const longestDuration = voiceSeconds / minimumTempo + fixedGapSeconds;
  const feasibleMinimum = Math.max(safeMinSeconds, shortestDuration);
  const feasibleMaximum = Math.min(safeMaxSeconds, longestDuration);
  if (feasibleMinimum > feasibleMaximum + 0.001) return null;

  const desiredDurationSeconds = clamp(
    targetSeconds,
    feasibleMinimum,
    feasibleMaximum,
  );
  const desiredVoiceSeconds = desiredDurationSeconds - fixedGapSeconds;
  if (desiredVoiceSeconds <= 0) return null;
  return {
    audioTempo: voiceSeconds / desiredVoiceSeconds,
    desiredDurationSeconds,
  };
}

/**
 * Fits measured narration to the requested video duration without inserting a
 * long silent tail. We first move toward the target inside a natural ±15%
 * speaking-rate band. The wider recovery band is only used when the raw audio
 * cannot reach the selected min/max range naturally (for example an old cached
 * script generated with the former 125 WPM estimate).
 */
export function fitNarrationDuration(
  input: DurationFitInput,
): DurationFitResult {
  const voiceSeconds = input.rawDurationSeconds - input.fixedGapSeconds;
  if (!Number.isFinite(voiceSeconds) || voiceSeconds <= 0) {
    throw new Error(
      "DURATION_OUT_OF_RANGE: thời lượng narration thực tế không hợp lệ.",
    );
  }

  const rangeSeconds = input.maxSeconds - input.minSeconds;
  const insetSeconds = Math.min(3, Math.max(0, rangeSeconds * 0.02));
  const safeMinSeconds = input.minSeconds + insetSeconds;
  const safeMaxSeconds = input.maxSeconds - insetSeconds;
  const natural = candidateForTempoRange(
    voiceSeconds,
    input.fixedGapSeconds,
    safeMinSeconds,
    safeMaxSeconds,
    input.targetSeconds,
    NATURAL_TEMPO_MIN,
    NATURAL_TEMPO_MAX,
  );
  if (natural) {
    return {
      ...natural,
      mode:
        Math.abs(natural.audioTempo - 1) <= 0.001
          ? "UNCHANGED"
          : "NATURAL",
    };
  }

  const recovery = candidateForTempoRange(
    voiceSeconds,
    input.fixedGapSeconds,
    safeMinSeconds,
    safeMaxSeconds,
    input.targetSeconds,
    RECOVERY_TEMPO_MIN,
    RECOVERY_TEMPO_MAX,
  );
  if (recovery) return { ...recovery, mode: "RECOVERY" };

  // Extremely narrow/custom ranges can leave no room after applying the
  // safety inset. Preserve already-valid media rather than failing it.
  if (
    input.rawDurationSeconds >= input.minSeconds &&
    input.rawDurationSeconds <= input.maxSeconds
  ) {
    return {
      audioTempo: 1,
      desiredDurationSeconds: input.rawDurationSeconds,
      mode: "UNCHANGED",
    };
  }

  throw new Error(
    `DURATION_OUT_OF_RANGE: audio thực tế ${input.rawDurationSeconds.toFixed(2)}s, yêu cầu ${input.minSeconds}-${input.maxSeconds}s. Độ lệch quá lớn để hiệu chỉnh tốc độ đọc an toàn.`,
  );
}
