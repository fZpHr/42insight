import { redis } from "@/lib/redis";

/**
 * Read-through cache for answers the site key fetches on everyone's behalf.
 *
 * A campus event list is the same for every visitor, so fetching it once per
 * visit spends the shared quota on identical data. Going through here makes the
 * cost of a page a function of its refresh interval rather than of how many
 * people opened it.
 *
 * A cache that is down must not take the page down with it: both a failed read
 * and a failed write fall through to the live value.
 */
export const cached = async <T>(
  key: string,
  ttlSeconds: number,
  build: () => Promise<T>,
): Promise<T> => {
  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch (error) {
    console.error(`[cache] read failed for ${key}:`, error);
  }

  const value = await build();

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[cache] write failed for ${key}:`, error);
  }

  return value;
};
