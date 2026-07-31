/**
 * Word counts are language-specific. Vietnamese Cloud TTS speaks substantially
 * faster than the old generic 110–125 WPM estimate. A real vi-VN-Neural2-A
 * lecture run measured 213.6 effective spoken words/minute (including the
 * short SSML pauses between scenes), so 210 is a conservative planning value.
 * Using the lower generic estimate produced videos that only filled about half
 * of the duration selected by the learner.
 */
const BASE_WORDS_PER_MINUTE = {
  vi: 210,
  en: 150,
} as const;

// Module 6 can safely correct measured TTS up to 1.35x. Pre-TTS estimates are
// inherently less precise, so script validation must not reject narration that
// still lies inside the composer's proven recovery envelope.
export const MAX_PRE_TTS_DURATION_RATIO = 1.35;

export function preTtsDurationToleranceSeconds(
  plannedDurationSeconds: number,
): number {
  return Math.max(
    12,
    Math.ceil(
      plannedDurationSeconds * (MAX_PRE_TTS_DURATION_RATIO - 1),
    ),
  );
}

export function spokenWordsPerMinute(
  language: string,
  speakingRate = 1,
): number {
  const normalizedLanguage = language.toLowerCase();
  const base =
    normalizedLanguage === "vi" || normalizedLanguage.startsWith("vi-")
      ? BASE_WORDS_PER_MINUTE.vi
      : BASE_WORDS_PER_MINUTE.en;
  return Math.round(base * speakingRate);
}

export function narrationWordBudget(
  durationSeconds: number,
  language: string,
  speakingRate = 1,
): number {
  return Math.max(
    1,
    Math.round(
      (durationSeconds / 60) *
        spokenWordsPerMinute(language, speakingRate),
    ),
  );
}
