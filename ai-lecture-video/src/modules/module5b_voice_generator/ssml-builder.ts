import type { ScriptArtifact } from "../../core/contracts.js";

type GlossaryEntry = ScriptArtifact["pronunciation_glossary"][number];

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

function applyGlossary(text: string, glossary: GlossaryEntry[]): string {
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
    output += escapeXml(text.slice(cursor, match.start));
    output += `<sub alias="${escapeXml(match.entry.pronunciation)}">${escapeXml(
      text.slice(match.start, match.end),
    )}</sub>`;
    cursor = match.end;
  }
  return output + escapeXml(text.slice(cursor));
}

export function buildSceneSsml(
  narration: string,
  narrationKind: ScriptArtifact["chapters"][number]["narrations"][number]["kind"],
  glossary: GlossaryEntry[],
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
  const spoken = applyGlossary(cleanedText, glossary);
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
