import type {
  LecturePlanArtifact,
  ScriptArtifact,
} from "../../core/contracts.js";
import type {
  ChapterScriptDecision,
  SemanticReview,
} from "./script-types.js";

const DEFAULT_WORDS_PER_MINUTE = 125;

function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function durationSeconds(text: string, wordsPerMinute: number): number {
  // Keep the speech estimate continuous. Rounding every short narration up to
  // three seconds inflated a chapter by one or two seconds per scene and could
  // reject an otherwise correctly-sized script (for example 113s vs a 97s
  // plan). The final timeline is based on measured WAV durations in module 6.
  return Math.max(
    0.1,
    Number(((countWords(text) / wordsPerMinute) * 60).toFixed(3)),
  );
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildScriptArtifact(
  title: string,
  language: string,
  lecturePlan: LecturePlanArtifact,
  decisions: Map<string, ChapterScriptDecision>,
  semanticReview?: SemanticReview,
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
): ScriptArtifact {
  const chapters = lecturePlan.chapters.map((plannedChapter) => {
    const decision = decisions.get(plannedChapter.chapter_id);
    if (!decision) {
      throw new Error(
        `Thiếu script decision cho chapter ${plannedChapter.chapter_id}.`,
      );
    }
    const narrations = decision.narrations.map((narration) => ({
      ...narration,
      source_ids: unique(narration.source_ids),
      objective_indices: unique(narration.objective_indices).sort(
        (left, right) => left - right,
      ),
      estimated_duration_seconds: durationSeconds(
        narration.text,
        wordsPerMinute,
      ),
    }));
    const objectiveCoverage = plannedChapter.learning_objectives.map(
      (objective, objectiveIndex) => ({
        objective_index: objectiveIndex,
        objective,
        narration_ids: narrations
          .filter((narration) =>
            narration.objective_indices.includes(objectiveIndex),
          )
          .map((narration) => narration.narration_id),
      }),
    );
    return {
      chapter_id: plannedChapter.chapter_id,
      title: plannedChapter.title,
      estimated_duration_seconds: narrations.reduce(
        (total, narration) =>
          total + narration.estimated_duration_seconds,
        0,
      ),
      learning_objectives: plannedChapter.learning_objectives,
      objective_coverage: objectiveCoverage,
      narrations,
    };
  });

  const glossaryByTerm = new Map<
    string,
    ScriptArtifact["pronunciation_glossary"][number]
  >();
  for (const decision of decisions.values()) {
    for (const entry of decision.pronunciation_glossary) {
      const key = entry.term.trim().toLocaleLowerCase();
      const existing = glossaryByTerm.get(key);
      if (existing) {
        existing.source_ids = unique([
          ...existing.source_ids,
          ...entry.source_ids,
        ]);
      } else {
        glossaryByTerm.set(key, {
          ...entry,
          source_ids: unique(entry.source_ids),
        });
      }
    }
  }

  const missingObjectives = chapters.flatMap((chapter) =>
    chapter.objective_coverage
      .filter((coverage) => coverage.narration_ids.length === 0)
      .map(
        (coverage) =>
          `${chapter.chapter_id}:${coverage.objective_index}:${coverage.objective}`,
      ),
  );
  const groundedClaims = chapters
    .flatMap((chapter) => chapter.narrations)
    .filter((narration) => narration.kind === "GROUNDED_CLAIM");

  return {
    schema_version: "1.0",
    title,
    language,
    estimated_duration_seconds: chapters.reduce(
      (total, chapter) =>
        total + chapter.estimated_duration_seconds,
      0,
    ),
    chapters,
    pronunciation_glossary: [...glossaryByTerm.values()].sort((left, right) =>
      left.term.localeCompare(right.term),
    ),
    validation: {
      grounded_claims: groundedClaims.length,
      ungrounded_claims: groundedClaims
        .filter((narration) => narration.source_ids.length === 0)
        .map((narration) => narration.narration_id),
      missing_objectives: missingObjectives,
      semantic_reviewed:
        semanticReview !== undefined && semanticReview.issues.length === 0,
      semantic_issues: semanticReview?.issues ?? [],
    },
  };
}
