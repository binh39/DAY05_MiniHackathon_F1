import type { ScriptArtifact } from "../../core/contracts.js";

type GlossaryEntry = ScriptArtifact["pronunciation_glossary"][number];

type SupportedNarrationLanguage = "vi" | "en";

const WORD_PATTERN = /[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*/gu;
const JOINER_PATTERN = /^[\s/&+–—-]+$/u;

// These Vietnamese words are valid ASCII even in correctly accented prose.
// Keeping them out of English spans prevents short Vietnamese connectors from
// being pronounced with an English accent.
const VIETNAMESE_ASCII_WORDS = new Set([
  "ai",
  "anh",
  "ban",
  "bao",
  "ben",
  "bo",
  "can",
  "cho",
  "con",
  "co",
  "da",
  "dang",
  "day",
  "de",
  "den",
  "do",
  "duoc",
  "gi",
  "hay",
  "hien",
  "ho",
  "hoc",
  "hon",
  "khi",
  "khong",
  "la",
  "lai",
  "lam",
  "len",
  "mot",
  "nay",
  "neu",
  "nhu",
  "nhung",
  "noi",
  "qua",
  "rang",
  "rat",
  "sau",
  "se",
  "theo",
  "thi",
  "thong",
  "tin",
  "toi",
  "trong",
  "tu",
  "va",
  "van",
  "ve",
  "vi",
  "voi",
  "xu",
  "ly",
]);

const ENGLISH_FUNCTION_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cleanNarration(text: string): string {
  return text
    .replace(/\bp\d+_e\d+\b/giu, "")
    .replace(/\[(?:source|nguồn)[^\]]*\]/giu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function narrationLanguage(language: string): SupportedNarrationLanguage {
  return language.toLowerCase().startsWith("en") ? "en" : "vi";
}

function hasNonAsciiLetter(value: string): boolean {
  return /[^\u0000-\u007f]/u.test(value);
}

function isForeignWord(
  word: string,
  primaryLanguage: SupportedNarrationLanguage,
): boolean {
  if (primaryLanguage === "en") return hasNonAsciiLetter(word);
  if (hasNonAsciiLetter(word)) return false;

  const lettersOnly = word.replace(/[^A-Za-z]/gu, "");
  if (!lettersOnly) return false;
  if (/^[A-Z]{2,}[A-Z0-9-]*$/u.test(word)) return true;
  if (/[a-z][A-Z]/u.test(word) || /[A-Za-z]\d|\d[A-Za-z]/u.test(word)) {
    return true;
  }

  const normalized = lettersOnly.toLowerCase();
  return normalized.length >= 3 && !VIETNAMESE_ASCII_WORDS.has(normalized);
}

function markVietnameseNameNeighbors(
  words: Array<{ start: number; end: number; text: string; foreign: boolean }>,
  text: string,
): void {
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    if (word.foreign || !/^[A-Z][a-z]+$/u.test(word.text)) continue;

    const normalized = word.text.toLowerCase();
    if (ENGLISH_FUNCTION_WORDS.has(normalized)) continue;
    const previous = words[index - 1];
    const next = words[index + 1];
    const touchesVietnameseBefore =
      previous?.foreign === true &&
      JOINER_PATTERN.test(text.slice(previous.end, word.start));
    const touchesVietnameseAfter =
      next?.foreign === true &&
      JOINER_PATTERN.test(text.slice(word.end, next.start));
    if (touchesVietnameseBefore || touchesVietnameseAfter) word.foreign = true;
  }
}

function preserveVietnameseNameNeighbors(
  words: Array<{ start: number; end: number; text: string; foreign: boolean }>,
  text: string,
): void {
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    if (!word.foreign || !/^\p{Lu}[\p{L}\p{M}]+$/u.test(word.text)) continue;

    const previous = words[index - 1];
    const next = words[index + 1];
    const touchesVietnameseNameBefore =
      previous?.foreign === false &&
      hasNonAsciiLetter(previous.text) &&
      /^\p{Lu}/u.test(previous.text) &&
      JOINER_PATTERN.test(text.slice(previous.end, word.start));
    const touchesVietnameseNameAfter =
      next?.foreign === false &&
      hasNonAsciiLetter(next.text) &&
      /^\p{Lu}/u.test(next.text) &&
      JOINER_PATTERN.test(text.slice(word.end, next.start));
    if (touchesVietnameseNameBefore || touchesVietnameseNameAfter) {
      word.foreign = false;
    }
  }
}

function classifyWords(
  text: string,
  primaryLanguage: SupportedNarrationLanguage,
): Array<{ start: number; end: number; text: string; foreign: boolean }> {
  const words = [...text.matchAll(WORD_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    text: match[0],
    foreign: isForeignWord(match[0], primaryLanguage),
  }));
  if (primaryLanguage === "en") {
    markVietnameseNameNeighbors(words, text);
  } else {
    preserveVietnameseNameNeighbors(words, text);
  }
  return words;
}

function applyLanguageTags(
  text: string,
  primaryLanguage: SupportedNarrationLanguage,
): string {
  const words = classifyWords(text, primaryLanguage);

  const foreignLocale = primaryLanguage === "vi" ? "en-US" : "vi-VN";
  let output = "";
  let cursor = 0;
  for (let index = 0; index < words.length; index += 1) {
    const first = words[index]!;
    if (!first.foreign) continue;

    let last = first;
    while (index + 1 < words.length) {
      const candidate = words[index + 1]!;
      const joiner = text.slice(last.end, candidate.start);
      if (!candidate.foreign || !JOINER_PATTERN.test(joiner)) break;
      last = candidate;
      index += 1;
    }

    output += escapeXml(text.slice(cursor, first.start));
    output += `<lang xml:lang="${foreignLocale}">${escapeXml(
      text.slice(first.start, last.end),
    )}</lang>`;
    cursor = last.end;
  }
  return output + escapeXml(text.slice(cursor));
}

function isForeignTerm(
  term: string,
  primaryLanguage: SupportedNarrationLanguage,
): boolean {
  return classifyWords(term, primaryLanguage).some((word) => word.foreign);
}

function applyGlossary(
  text: string,
  glossary: GlossaryEntry[],
  primaryLanguage: SupportedNarrationLanguage,
): string {
  const entries = glossary
    .filter(
      (entry) =>
        entry.term.trim().length > 1 &&
        entry.pronunciation.trim().length > 0,
    )
    .sort((left, right) => right.term.length - left.term.length);
  const lowered = text.toLocaleLowerCase("vi");
  const matches: Array<{
    start: number;
    end: number;
    entry: GlossaryEntry;
  }> = [];

  for (let index = 0; index < text.length; ) {
    const entry = entries.find((candidate) =>
      lowered.startsWith(
        candidate.term.toLocaleLowerCase("vi"),
        index,
      ),
    );
    if (!entry) {
      index += 1;
      continue;
    }
    const before = index === 0 ? "" : text[index - 1]!;
    const end = index + entry.term.length;
    const after = end >= text.length ? "" : text[end]!;
    const wordLike = /[\p{L}\p{N}_]/u;
    if (
      (before && wordLike.test(before)) ||
      (after && wordLike.test(after))
    ) {
      index += 1;
      continue;
    }
    matches.push({ start: index, end, entry });
    index = end;
  }

  let output = "";
  let cursor = 0;
  for (const match of matches) {
    output += applyLanguageTags(
      text.slice(cursor, match.start),
      primaryLanguage,
    );
    const matchedText = text.slice(match.start, match.end);
    if (isForeignTerm(matchedText, primaryLanguage)) {
      const foreignLocale = primaryLanguage === "vi" ? "en-US" : "vi-VN";
      output += `<lang xml:lang="${foreignLocale}">${escapeXml(matchedText)}</lang>`;
    } else {
      output += `<sub alias="${escapeXml(match.entry.pronunciation)}">${escapeXml(
        matchedText,
      )}</sub>`;
    }
    cursor = match.end;
  }
  return output + applyLanguageTags(text.slice(cursor), primaryLanguage);
}

export function buildSceneSsml(
  narration: string,
  narrationKind: ScriptArtifact["chapters"][number]["narrations"][number]["kind"],
  glossary: GlossaryEntry[],
  language = "vi",
): { ssml: string; appliedTerms: string[]; cleanedText: string } {
  const cleanedText = cleanNarration(narration);
  if (!cleanedText) {
    throw new Error("Narration rỗng sau khi loại citation/source ID.");
  }
  const appliedTerms = glossary
    .filter((entry) =>
      cleanedText
        .toLocaleLowerCase("vi")
        .includes(entry.term.toLocaleLowerCase("vi")),
    )
    .map((entry) => entry.term);
  const spoken = applyGlossary(
    cleanedText,
    glossary,
    narrationLanguage(language),
  );
  const pause =
    narrationKind === "LEARNING_CHECK"
      ? "700ms"
      : narrationKind === "TRANSITION"
        ? "300ms"
        : narrationKind === "GROUNDED_CLAIM"
          ? "220ms"
          : "180ms";
  return {
    ssml: `<speak><s>${spoken}</s><break time="${pause}"/></speak>`,
    appliedTerms,
    cleanedText,
  };
}
