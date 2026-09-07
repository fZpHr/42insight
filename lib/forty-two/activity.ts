/**
 * The last few 42 API calls made on a key, so the header can say what it is
 * doing rather than only how many.
 *
 * "3 requests to 42" tells you the site is busy; it does not tell you that it
 * is walking a campus, or that one call came back 429, or that the slow page
 * is slow because it is on its ninth page of projects_users. A short log of
 * what actually went out turns a spinner into something you can read.
 *
 * Kept in memory, bounded, and per key -- so a visitor sees their own traffic
 * and nobody else's. It is a diagnostic, not a record: a restart clears it, and
 * nothing depends on it surviving.
 */

const MAX_PER_KEY = 40;
const MAX_KEYS = 500;

export interface ApiCall {
  /** The path as sent, minus the /v2 prefix. */
  path: string;
  status: number;
  durationMs: number;
  at: string;
}

const log: Map<string, ApiCall[]> = ((globalThis as any).__42insightActivity ??=
  new Map<string, ApiCall[]>());

export const recordCall = (
  keyId: string,
  path: string,
  status: number,
  durationMs: number,
): void => {
  if (log.size >= MAX_KEYS && !log.has(keyId)) {
    const oldest = log.keys().next();
    if (!oldest.done) log.delete(oldest.value);
  }

  const calls = log.get(keyId) ?? [];
  calls.unshift({
    path,
    status,
    durationMs: Math.round(durationMs),
    at: new Date().toISOString(),
  });
  log.set(keyId, calls.slice(0, MAX_PER_KEY));
};

export const recentCalls = (keyId: string): ApiCall[] => [
  ...(log.get(keyId) ?? []),
];
