"use client";

import type { CorrectionRatio } from "@/lib/forty-two/corrections";

/**
 * The campus correction ratios, kept in the visitor's own browser.
 *
 * Same bargain as the logtime index next door, and for a sharper reason. A
 * ratio is two requests per student -- one counting the passes, one the fails
 * -- so a campus of 739 is 1478 requests against an hourly budget of 1200. It
 * cannot be produced per page load, and the server has nowhere to keep it
 * between them.
 *
 * A browser has both. Whoever wants the column spends their own quota once and
 * keeps the answer here, where it survives reloads and costs the site nothing.
 */

const KEY_PREFIX = "42insight:corrections:v1:";

export interface CorrectionIndex {
  campus: string;
  builtAt: string;
  /** Student id -> ratio. */
  entries: Record<string, CorrectionRatio>;
}

const keyFor = (campus: string) => `${KEY_PREFIX}${campus}`;

export const readCorrectionIndex = (campus: string): CorrectionIndex | null => {
  if (typeof window === "undefined" || !campus) return null;

  try {
    const raw = window.localStorage.getItem(keyFor(campus));
    return raw ? (JSON.parse(raw) as CorrectionIndex) : null;
  } catch {
    // Private browsing, cleared storage, or something that is no longer JSON.
    return null;
  }
};

/**
 * Merges a chunk into what is stored, so an interrupted build keeps its work.
 * Returns false when the browser refuses the write.
 */
export const mergeCorrectionChunk = (
  campus: string,
  entries: Record<string, CorrectionRatio>,
): boolean => {
  if (typeof window === "undefined" || !campus) return false;

  const existing = readCorrectionIndex(campus);
  const merged: CorrectionIndex = {
    campus,
    builtAt: new Date().toISOString(),
    entries: { ...(existing?.entries ?? {}), ...entries },
  };

  try {
    window.localStorage.setItem(keyFor(campus), JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
};

/** Puts the stored ratios onto the roster, leaving students without one alone. */
export const withCorrections = <T extends { id: number | string }>(
  students: T[],
  index: CorrectionIndex | null,
): T[] => {
  if (!index) return students;

  return students.map((student) => {
    const ratio = index.entries[String(student.id)];
    if (!ratio) return student;

    return {
      ...student,
      correctionPositive: ratio.positive,
      correctionNegative: ratio.negative,
      correctionTotal: ratio.positive + ratio.negative,
      correctionPercentage: ratio.percentage,
    };
  });
};
