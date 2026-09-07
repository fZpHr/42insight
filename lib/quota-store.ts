"use client";

/**
 * A running total of what this visitor's own 42 key has spent this hour.
 *
 * The server counts too, but it counts per instance: a deployment that runs
 * several of them splits the tally, and each one sees a fraction. The browser
 * does not have that problem -- every response says how many 42 requests it
 * spent on the visitor's key, in X-42-Calls, and they all arrive here whichever
 * instance served them.
 *
 * So this is the accurate figure for a personal key, and the server's is the
 * fallback for anyone who has not connected one.
 */

const STORAGE_KEY = "42insight:quota:v1";
const HOUR_MS = 3_600_000;

/** 42's documented default: 1200 requests an hour per application. */
export const HOURLY_LIMIT = 1200;

const readTimestamps = (): number[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const cutoff = Date.now() - HOUR_MS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((at: unknown) => typeof at === "number" && at > cutoff)
      : [];
  } catch {
    return [];
  }
};

const write = (timestamps: number[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // The counter is informational; losing it costs nothing.
  }
};

/** Adds the calls a response reports to the running total. */
export const recordResponse = (response: Response): void => {
  if (typeof window === "undefined") return;

  const calls = Number(response.headers.get("X-42-Calls"));
  if (!Number.isFinite(calls) || calls <= 0) return;

  const now = Date.now();
  write([...readTimestamps(), ...Array(Math.min(calls, 500)).fill(now)]);
};

export interface PersonalQuota {
  used: number;
  remaining: number;
  limit: number;
  /** When the oldest counted request drops out of the window. */
  resetAt: Date | null;
}

export const readPersonalQuota = (): PersonalQuota => {
  const timestamps = readTimestamps();

  return {
    used: timestamps.length,
    remaining: Math.max(0, HOURLY_LIMIT - timestamps.length),
    limit: HOURLY_LIMIT,
    resetAt: timestamps.length ? new Date(timestamps[0] + HOUR_MS) : null,
  };
};

export const clearPersonalQuota = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing depends on it.
  }
};
