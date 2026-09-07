/**
 * How much of a key's hourly budget has been spent.
 *
 * 42 meters each application at 2 requests/second and 1200/hour
 * (https://api.intra.42.fr/apidoc/guides/getting_started). The per-second half
 * is enforced by pacing; the hourly half is the one that runs out quietly, so
 * it is counted here.
 *
 * Two sources, in order of trust:
 *
 * 1. Whatever the 42 API says in its response headers. If it reports what is
 *    left, that is the answer, and no counting can beat it. The public apidoc
 *    documents no such header, so nothing here assumes one exists -- anything
 *    that looks like a rate-limit header is captured under its real name and
 *    surfaced, and the shape can be pinned down once it has been seen in the
 *    wild.
 * 2. Our own count of requests sent in the last hour. Always available, and
 *    accurate as far as this server instance goes.
 *
 * The honest caveat on (2): a platform running several instances gives each one
 * its own counter, so the server's view undercounts. For a visitor's personal
 * key the browser closes that gap -- it accumulates the per-response call count
 * across instances (see lib/quota-store.ts). For the shared site keys it cannot,
 * so the shared figure is a floor, not a total, and says so.
 */

const HOUR_MS = 3_600_000;

/** The documented default. Certified applications are granted more. */
export const DOCUMENTED_HOURLY_LIMIT = 1200;

export interface KeyUsage {
  keyId: string;
  used: number;
  remaining: number;
  limit: number;
  /** When the oldest counted request falls out of the window. */
  resetAt: string | null;
  /** Rate-limit headers the 42 API actually answered with, verbatim. */
  headers: Record<string, string>;
}

interface KeyRecord {
  timestamps: number[];
  headers: Record<string, string>;
}

const records: Map<string, KeyRecord> = ((globalThis as any).__42insightQuota ??=
  new Map<string, KeyRecord>());

const MAX_KEYS = 2000;

const recordFor = (keyId: string): KeyRecord => {
  let record = records.get(keyId);
  if (!record) {
    if (records.size >= MAX_KEYS) {
      const oldest = records.keys().next();
      if (!oldest.done) records.delete(oldest.value);
    }
    record = { timestamps: [], headers: {} };
    records.set(keyId, record);
  }
  return record;
};

const prune = (record: KeyRecord, now: number) => {
  const cutoff = now - HOUR_MS;
  if (record.timestamps.length && record.timestamps[0] <= cutoff) {
    record.timestamps = record.timestamps.filter((at) => at > cutoff);
  }
};

/** Counts one request against a key. */
export const recordRequest = (keyId: string): void => {
  const now = Date.now();
  const record = recordFor(keyId);
  prune(record, now);
  record.timestamps.push(now);
};

/**
 * Keeps whatever the API said about the budget, without assuming what it is
 * called.
 */
export const recordHeaders = (keyId: string, response: Response): void => {
  const record = recordFor(keyId);

  response.headers.forEach((value, name) => {
    if (/(ratelimit|rate-limit|quota|retry-after)/i.test(name)) {
      record.headers[name] = value;
    }
  });
};

export const usageFor = (keyId: string): KeyUsage => {
  const now = Date.now();
  const record = recordFor(keyId);
  prune(record, now);

  const used = record.timestamps.length;

  return {
    keyId,
    used,
    remaining: Math.max(0, DOCUMENTED_HOURLY_LIMIT - used),
    limit: DOCUMENTED_HOURLY_LIMIT,
    resetAt: record.timestamps.length
      ? new Date(record.timestamps[0] + HOUR_MS).toISOString()
      : null,
    headers: { ...record.headers },
  };
};
