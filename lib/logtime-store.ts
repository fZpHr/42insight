"use client";

import type { Logtime } from "@/lib/forty-two/logtime";

/**
 * The campus logtime index, kept in the visitor's own browser.
 *
 * The server has nowhere to put this. It runs on the 42 credentials alone --
 * no database, no Redis, no cron -- so the only thing it can do is fetch on
 * demand, and logtime costs one request per student against an hourly budget
 * smaller than the campus. It cannot be produced per page load and it cannot be
 * carried over between them.
 *
 * A browser can do both. A student who wants the logtime sorts registers their
 * own 42 application, spends a few minutes of their own quota once, and keeps
 * the result here. It survives reloads, it is theirs, and it costs the site
 * nothing.
 *
 * The trade against a shared index is honest and worth stating: each student
 * who wants this builds it themselves, rather than one person building it for
 * the campus.
 */

const KEY_PREFIX = "42insight:logtime:v1:";

export interface LogtimeIndex {
  campus: string;
  builtAt: string;
  /** Student id -> logtime. */
  entries: Record<string, Logtime>;
}

const keyFor = (campus: string) => `${KEY_PREFIX}${campus}`;

export const readLogtimeIndex = (campus: string): LogtimeIndex | null => {
  if (typeof window === "undefined" || !campus) return null;

  try {
    const raw = window.localStorage.getItem(keyFor(campus));
    return raw ? (JSON.parse(raw) as LogtimeIndex) : null;
  } catch {
    // Private browsing, cleared storage, or something that is no longer JSON.
    return null;
  }
};

/**
 * Merges a freshly computed chunk into what is already stored.
 *
 * Returns false when the browser refuses the write -- a campus index runs to
 * roughly a megabyte, which is inside the usual five megabyte allowance but not
 * guaranteed. The caller says so rather than failing silently.
 */
export const mergeLogtimeChunk = (
  campus: string,
  entries: Record<string, Logtime>,
): boolean => {
  if (typeof window === "undefined" || !campus) return false;

  const existing = readLogtimeIndex(campus);
  const merged: LogtimeIndex = {
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

export const clearLogtimeIndex = (campus: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(campus));
  } catch {
    // Nothing to do: the index is a convenience, not state anyone depends on.
  }
};

/** Folds a stored index into the campus list the API returned. */
export const withLogtime = <T extends { id: number; activityData?: any }>(
  students: T[],
  index: LogtimeIndex | null,
): T[] => {
  if (!index || Object.keys(index.entries).length === 0) return students;

  return students.map((student) => {
    const logtime = index.entries[String(student.id)];
    if (!logtime) return student;

    return {
      ...student,
      activityData: { ...(student.activityData ?? {}), logtime },
    };
  });
};
