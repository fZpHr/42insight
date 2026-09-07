import { redis } from "@/lib/redis";

/**
 * Progress for fetches that take long enough to need a status.
 *
 * A cold campus build walks several pages at two requests per second, so the
 * page would otherwise sit on a spinner with nothing to show. The server posts
 * how far it has got, the browser reads it back, and the count is real rather
 * than an animation: the 42 API returns the collection size in X-Total, so the
 * total is known from the first page onwards.
 */

const PROGRESS_TTL = 120;

export interface FetchProgress {
  phase: string;
  done: number;
  total: number;
  updatedAt: number;
}

export const progressKey = (scope: string) => `progress:v1:${scope}`;

export const setProgress = async (
  scope: string,
  progress: Omit<FetchProgress, "updatedAt">,
): Promise<void> => {
  try {
    await redis.set(
      progressKey(scope),
      { ...progress, updatedAt: Date.now() },
      { ex: PROGRESS_TTL },
    );
  } catch (error) {
    // Progress is cosmetic; never fail a fetch over it.
    console.error("[progress] write failed:", error);
  }
};

export const clearProgress = async (scope: string): Promise<void> => {
  try {
    await redis.del(progressKey(scope));
  } catch (error) {
    console.error("[progress] clear failed:", error);
  }
};

export const getProgress = async (
  scope: string,
): Promise<FetchProgress | null> => {
  try {
    return await redis.get<FetchProgress>(progressKey(scope));
  } catch (error) {
    console.error("[progress] read failed:", error);
    return null;
  }
};
