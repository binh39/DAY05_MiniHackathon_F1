export const TARGET_SPEECH_WORDS_PER_MINUTE = 175;
export const MINIMUM_SCRIPT_WORDS_PER_MINUTE = 160;
export const MAXIMUM_SCRIPT_WORDS_PER_MINUTE = 183;
export const SCRIPT_WORD_BUDGET_TOLERANCE_RATE = 0.15;
export const SCRIPT_DURATION_TOLERANCE_RATE = 0.25;

export function countSpokenWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function chapterWordBudget(durationSeconds: number): {
  minimum: number;
  target: number;
  maximum: number;
} {
  const minutes = durationSeconds / 60;
  return {
    minimum: Math.max(
      1,
      Math.floor(minutes * MINIMUM_SCRIPT_WORDS_PER_MINUTE),
    ),
    target: Math.max(
      1,
      Math.round(minutes * TARGET_SPEECH_WORDS_PER_MINUTE),
    ),
    maximum: Math.max(
      1,
      Math.ceil(minutes * MAXIMUM_SCRIPT_WORDS_PER_MINUTE),
    ),
  };
}

export function tolerantChapterWordBudget(durationSeconds: number): {
  minimum: number;
  target: number;
  maximum: number;
} {
  const budget = chapterWordBudget(durationSeconds);
  return {
    minimum: Math.max(
      1,
      Math.floor(
        budget.minimum * (1 - SCRIPT_WORD_BUDGET_TOLERANCE_RATE),
      ),
    ),
    target: budget.target,
    maximum: Math.ceil(
      budget.maximum * (1 + SCRIPT_WORD_BUDGET_TOLERANCE_RATE),
    ),
  };
}

export function estimateSpokenDurationSeconds(text: string): number {
  return Math.max(
    3,
    Math.ceil(
      (countSpokenWords(text) / TARGET_SPEECH_WORDS_PER_MINUTE) * 60,
    ),
  );
}
