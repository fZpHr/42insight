import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_PASSWORD!,
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limiter using sliding window algorithm
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param limit - Maximum number of requests
 * @param window - Time window in seconds
 */
export async function rateLimit(
  identifier: string,
  limit: number = 30,
  window: number = 60
): Promise<RateLimitResult> {
  try {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - window * 1000;

    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const requestCount = await redis.zcard(key);

    if (requestCount >= limit) {
      // Get the oldest request timestamp to calculate reset time
      const oldestRequest = await redis.zrange(key, 0, 0, { withScores: true });
      const resetTime = oldestRequest[1] 
        ? Math.ceil((Number(oldestRequest[1]) + window * 1000) / 1000)
        : Math.ceil((now + window * 1000) / 1000);

      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Add current request
    await redis.zadd(key, { score: now, member: `${now}` });

    // Set expiration on the key
    await redis.expire(key, window);

    return {
      success: true,
      limit,
      remaining: limit - (requestCount + 1),
      reset: Math.ceil((now + window * 1000) / 1000),
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open - allow the request if rate limiting fails
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Math.ceil((Date.now() + window * 1000) / 1000),
    };
  }
}

/**
 * Get the client IP address from the request
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}
