/**
 * Per-visitor throttling, in the server's own memory.
 *
 * It used to be a Redis sorted set, shared across instances. Nothing here is
 * shared any more: the site runs on the 42 credentials alone, so a platform
 * running several instances throttles per instance, and a determined caller
 * gets roughly one budget per instance rather than one overall.
 *
 * That is weaker, and it is enough, because it is not what protects the 42
 * quota. The key pool does that: every outbound request is paced server-side
 * whoever asked for it. This only stops one visitor from making the site
 * pointlessly busy.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/** identifier -> request timestamps inside the current window. */
const hits: Map<string, number[]> = ((globalThis as any).__42insightRateLimit ??=
  new Map<string, number[]>());

const MAX_IDENTIFIERS = 5000;

export async function rateLimit(
  identifier: string,
  limit: number = 30,
  window: number = 60,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - window * 1000;

  // Bounded: an instance that has seen a lot of visitors drops the oldest
  // rather than growing forever. Map iterates in insertion order.
  if (hits.size > MAX_IDENTIFIERS) {
    const oldest = hits.keys().next();
    if (!oldest.done) hits.delete(oldest.value);
  }

  const recent = (hits.get(identifier) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (recent.length >= limit) {
    hits.set(identifier, recent);
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil((recent[0] + window * 1000) / 1000),
    };
  }

  recent.push(now);
  hits.set(identifier, recent);

  return {
    success: true,
    limit,
    remaining: limit - recent.length,
    reset: Math.ceil((now + window * 1000) / 1000),
  };
}

/** How many requests an identifier has made in the current window. */
export function rateLimitCount(identifier: string, window: number = 60): number {
  const windowStart = Date.now() - window * 1000;
  return (hits.get(identifier) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  ).length;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}
