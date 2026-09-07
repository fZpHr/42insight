import { Redis } from "@upstash/redis";

/**
 * The shared Upstash client.
 *
 * It lives on its own so the live-campus layer and the progress channel can
 * both use it without importing each other.
 */
export const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_PASSWORD!,
});
