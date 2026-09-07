/**
 * What a 42 application has left this hour.
 *
 * The API answers every /v2 request with its own accounting, and it is
 * authoritative, so nothing here estimates:
 *
 *   x-hourly-ratelimit-limit: 1200     x-secondly-ratelimit-limit: 2
 *   x-hourly-ratelimit-remaining: 1199 x-secondly-ratelimit-remaining: 1
 *
 * Verified against a live key rather than assumed: the counter is per
 * *application*, not per token. Minting a fresh token from the same
 * credentials continues the same budget instead of resetting it, so there is no
 * way to duck the limit and no reason to track tokens separately.
 *
 * A reading is a fact at the moment it was taken, from whichever server
 * instance took it. Several instances therefore hold readings of differing
 * freshness -- but each is a true figure, not a floor, which is the difference
 * between reporting and guessing.
 *
 * Counting requests ourselves remains, only as a fallback for a key that has
 * not been used yet on this instance, and it says so.
 */

const HOUR_MS = 3_600_000;

/** 42's documented default; the live header confirms it. */
export const DOCUMENTED_HOURLY_LIMIT = 1200;

export interface KeyUsage {
  keyId: string;
  /** "42" when the API told us, "counted" when we are falling back. */
  source: "42" | "counted";
  used: number;
  remaining: number;
  limit: number;
  secondlyRemaining: number | null;
  secondlyLimit: number | null;
  /** The application 42 says the key belongs to. */
  applicationName: string | null;
  /** When the reading was taken. */
  observedAt: string | null;
}

interface KeyRecord {
  timestamps: number[];
  hourlyRemaining: number | null;
  hourlyLimit: number | null;
  secondlyRemaining: number | null;
  secondlyLimit: number | null;
  applicationName: string | null;
  observedAt: number | null;
}

const records: Map<string, KeyRecord> = ((globalThis as any).__42insightQuota ??=
  new Map<string, KeyRecord>());

const MAX_KEYS = 2000;

const blank = (): KeyRecord => ({
  timestamps: [],
  hourlyRemaining: null,
  hourlyLimit: null,
  secondlyRemaining: null,
  secondlyLimit: null,
  applicationName: null,
  observedAt: null,
});

const recordFor = (keyId: string): KeyRecord => {
  let record = records.get(keyId);
  if (!record) {
    if (records.size >= MAX_KEYS) {
      const oldest = records.keys().next();
      if (!oldest.done) records.delete(oldest.value);
    }
    record = blank();
    records.set(keyId, record);
  }
  return record;
};

const numberOr = (value: string | null, fallback: number | null) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Counts one request, for the case where 42 tells us nothing. */
export const recordRequest = (keyId: string): void => {
  const now = Date.now();
  const record = recordFor(keyId);
  const cutoff = now - HOUR_MS;
  if (record.timestamps.length && record.timestamps[0] <= cutoff) {
    record.timestamps = record.timestamps.filter((at) => at > cutoff);
  }
  record.timestamps.push(now);
};

/** Takes 42's own accounting from a response. */
export const recordHeaders = (keyId: string, response: Response): void => {
  const hourlyRemaining = response.headers.get("x-hourly-ratelimit-remaining");
  const record = recordFor(keyId);

  // The token endpoint answers without these; only /v2 responses carry them.
  if (hourlyRemaining === null) return;

  record.hourlyRemaining = numberOr(hourlyRemaining, record.hourlyRemaining);
  record.hourlyLimit = numberOr(
    response.headers.get("x-hourly-ratelimit-limit"),
    record.hourlyLimit,
  );
  record.secondlyRemaining = numberOr(
    response.headers.get("x-secondly-ratelimit-remaining"),
    record.secondlyRemaining,
  );
  record.secondlyLimit = numberOr(
    response.headers.get("x-secondly-ratelimit-limit"),
    record.secondlyLimit,
  );
  record.applicationName =
    response.headers.get("x-application-name") ?? record.applicationName;
  record.observedAt = Date.now();

  if (record.hourlyRemaining !== null && record.hourlyRemaining < 100) {
    console.warn(
      `[quota] ${record.applicationName ?? keyId}: ${record.hourlyRemaining} requests left this hour`,
    );
  }
};

export const usageFor = (keyId: string): KeyUsage => {
  const record = recordFor(keyId);

  if (record.hourlyRemaining !== null) {
    const limit = record.hourlyLimit ?? DOCUMENTED_HOURLY_LIMIT;
    return {
      keyId,
      source: "42",
      used: Math.max(0, limit - record.hourlyRemaining),
      remaining: record.hourlyRemaining,
      limit,
      secondlyRemaining: record.secondlyRemaining,
      secondlyLimit: record.secondlyLimit,
      applicationName: record.applicationName,
      observedAt: record.observedAt
        ? new Date(record.observedAt).toISOString()
        : null,
    };
  }

  const cutoff = Date.now() - HOUR_MS;
  const used = record.timestamps.filter((at) => at > cutoff).length;

  return {
    keyId,
    source: "counted",
    used,
    remaining: Math.max(0, DOCUMENTED_HOURLY_LIMIT - used),
    limit: DOCUMENTED_HOURLY_LIMIT,
    secondlyRemaining: null,
    secondlyLimit: null,
    applicationName: null,
    observedAt: null,
  };
};
