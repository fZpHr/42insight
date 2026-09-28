/**
 * The cache, in the server's own memory.
 *
 * There is no Redis, no database and no cron behind this site: it holds the 42
 * credentials and nothing else. A campus-wide answer is fetched when it is
 * asked for, kept for a few minutes, and re-fetched when it goes stale. That is
 * the whole storage layer.
 *
 * What that costs: each server instance keeps its own copy, so a platform that
 * runs several of them fetches the same campus once per instance rather than
 * once. With the key pool pacing requests that is affordable, and it buys the
 * property that matters here -- the site has no moving part to provision, run
 * or repair.
 *
 * What it rules out: anything that has to be accumulated rather than fetched.
 * A campus arrives in one page walk, so rankings work; logtime needs one
 * request per student, which no page load can afford and nothing here can carry
 * over, so it is built by the visitor's browser instead (see LogtimeStore).
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * Whose data an entry is.
 *
 * Demo mode answers the same questions as 42, under the same keys --
 * "students:Nice" either way -- with invented rows. In one namespace,
 * whichever answer landed first was served to everyone for its whole TTL:
 * made-up students in a real visitor's rankings, and real ones to a demo
 * visitor who has no key at all. So every entry names its source, and two
 * sources never share one. A 42 client is its own source (FortyTwoApi.source).
 */
export interface CacheSource {
  readonly source: string;
}

const entryKey = (from: CacheSource, key: string) => `${from.source}:${key}`;

/**
 * Held on globalThis so that a hot reload in development, and module
 * re-evaluation in general, does not silently start from an empty cache.
 */
const store: Map<string, Entry> = ((globalThis as any).__42insightCache ??=
  new Map<string, Entry>());

/** Bounded so a long-running instance cannot grow without limit. */
const MAX_ENTRIES = 500;

const evictExpired = (now: number) => {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
};

const cacheGet = <T>(key: string): T | null => {
  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return entry.value as T;
};

const cacheSet = <T>(key: string, value: T, ttlSeconds: number): void => {
  const now = Date.now();

  if (store.size >= MAX_ENTRIES) {
    evictExpired(now);
    // Still full: drop the oldest insertion, which Map iterates first.
    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next();
      if (!oldest.done) store.delete(oldest.value);
    }
  }

  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
};

/**
 * Read-through cache. A build that throws is not cached, so a 42 API blip is
 * retried on the next request rather than remembered for the whole TTL.
 */
export const cached = async <T>(
  from: CacheSource,
  key: string,
  ttlSeconds: number,
  build: () => Promise<T>,
): Promise<T> => {
  const fullKey = entryKey(from, key);
  const hit = cacheGet<T>(fullKey);
  if (hit !== null) return hit;

  const value = await build();
  cacheSet(fullKey, value, ttlSeconds);
  return value;
};

/**
 * De-duplicates concurrent builds of the same key.
 *
 * Without this, every request arriving while a cold campus walk is in flight
 * starts its own -- ten visitors on an empty cache would mean ten walks, and
 * ten times the 42 quota spent on identical data. They now wait on the first.
 */
const inFlight: Map<string, Promise<unknown>> = ((globalThis as any)
  .__42insightInFlight ??= new Map<string, Promise<unknown>>());

export const cachedOnce = async <T>(
  from: CacheSource,
  key: string,
  ttlSeconds: number,
  build: () => Promise<T>,
): Promise<T> => {
  const fullKey = entryKey(from, key);
  const hit = cacheGet<T>(fullKey);
  if (hit !== null) return hit;

  const existing = inFlight.get(fullKey) as Promise<T> | undefined;
  if (existing) return existing;

  const pending = build()
    .then((value) => {
      cacheSet(fullKey, value, ttlSeconds);
      return value;
    })
    .finally(() => {
      inFlight.delete(fullKey);
    });

  inFlight.set(fullKey, pending);
  return pending;
};
