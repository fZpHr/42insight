/**
 * The site's own 42 API keys, shared by every visitor.
 *
 * This is tier 1: requests whose cost does not grow with the number of students
 * on campus. One campus-wide page walk, one event list, a handful of calls for
 * a dashboard -- work that a few application keys can serve for everybody, and
 * that stays affordable however many people are browsing, because the answers
 * are cached and shared.
 *
 * Anything that needs one request per student lives in tier 2 instead, on a key
 * the visitor registers themselves (see lib/forty-two/user-api.ts).
 *
 * 42 meters per application: 2 requests/second and 1200/hour for each
 * client_id (https://api.intra.42.fr/apidoc/guides/getting_started).
 * CLIENT_ID1 is what next-auth signs people in with, so it is left out of the
 * data pool as soon as a second key exists -- a burst of browsing must never be
 * able to lock anyone out of logging in.
 *
 * Only the per-second half is enforced here. The hourly half is counted rather
 * than enforced, in lib/forty-two/quota.ts, and reported by /api/quota.
 */

import { recordHeaders, recordRequest, usageFor } from "@/lib/forty-two/quota";
import type { KeyUsage } from "@/lib/forty-two/quota";

/** next-auth signs people in with CLIENT_ID1. */
const OAUTH_KEY_INDEX = 1;

interface QueuedRequest {
  execute: () => Promise<Response>;
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
  retries: number;
}

class ApiRateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay = 500;
  private maxRetries = 3;
  private retryDelay = 1000;

  private tokens: string[] = [];
  private tokenLabels: number[] = [];
  /** The client_id each token belongs to: what 42 actually meters. */
  private clientIds: string[] = [];
  private currentTokenIndex = 0;
  private initPromise: Promise<void> | null = null;

  async initTokens() {
    if (this.tokens.length > 0) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const available: number[] = [];

      for (let i = 1; i <= 6; i++) {
        if (process.env[`CLIENT_ID${i}`] && process.env[`CLIENT_SECRET${i}`]) {
          available.push(i);
        }
      }

      if (available.length === 0) {
        throw new Error("No CLIENT_ID/CLIENT_SECRET pair is configured");
      }

      // Keep the login key out of the data pool when there is anything else to
      // use. With a single key configured there is no choice but to share it.
      const dataKeys =
        available.length > 1
          ? available.filter((i) => i !== OAUTH_KEY_INDEX)
          : available;

      const results = await Promise.all(
        dataKeys.map((i) =>
          this.getToken(
            process.env[`CLIENT_ID${i}`]!,
            process.env[`CLIENT_SECRET${i}`]!,
          )
            .then((token) => ({ i, token }))
            .catch((error) => {
              console.warn(`Failed to get token ${i}:`, error.message);
              return { i, token: null };
            }),
        ),
      );

      for (const { i, token } of results) {
        if (!token) continue;
        this.tokens.push(token);
        this.tokenLabels.push(i);
        this.clientIds.push(process.env[`CLIENT_ID${i}`]!);
      }

      if (this.tokens.length === 0) {
        throw new Error("Failed to obtain any API tokens");
      }

      const totalRatePerSecond = 2 * this.tokens.length;
      this.minDelay = 1000 / totalRatePerSecond;

      console.log(
        `[API Rate Limiter] Initialized with ${this.tokens.length} data key(s) ` +
          `(${this.tokenLabels.join(", ")}). Rate limit: ${totalRatePerSecond} req/s ` +
          `(delay: ${this.minDelay.toFixed(2)}ms)`,
      );
    })();
    return this.initPromise;
  }

  private async getToken(
    clientId: string,
    clientSecret: string,
  ): Promise<string | null> {
    const response = await fetch("https://api.intra.42.fr/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  private nextTokenSlot(): number {
    if (this.tokens.length === 0) {
      throw new Error("No tokens available");
    }
    const slot = this.currentTokenIndex;
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    return slot;
  }

  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    await this.initTokens();

    return new Promise((resolve, reject) => {
      const execute = async (): Promise<Response> => {
        const slot = this.nextTokenSlot();
        const clientId = this.clientIds[slot];

        recordRequest(clientId);

        const response = await fetch(`https://api.intra.42.fr/v2${path}`, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${this.tokens[slot]}`,
          },
        });

        recordHeaders(clientId, response);
        return response;
      };

      this.queue.push({
        execute,
        resolve,
        reject,
        retries: 0,
      });

      this.processQueue();
    });
  }

  /**
   * Walks a paginated collection until it runs dry or hits maxPages.
   *
   * The cost of a call like this is bounded by the collection size, not by how
   * many people are looking at it, which is what keeps it in tier 1: one walk
   * every few minutes feeds every visitor through the cache.
   */
  async fetchAllPages(
    path: string,
    {
      pageSize = 100,
      maxPages = 40,
      onProgress,
    }: {
      pageSize?: number;
      maxPages?: number;
      onProgress?: (done: number, total: number) => void | Promise<void>;
    } = {},
  ): Promise<any[]> {
    const separator = path.includes("?") ? "&" : "?";
    const collected: any[] = [];
    let total = 0;

    for (let page = 1; page <= maxPages; page++) {
      const response = await this.fetch(
        `${path}${separator}page[size]=${pageSize}&page[number]=${page}`,
      );

      if (!response.ok) {
        throw new Error(`42 API responded ${response.status} on page ${page}`);
      }

      const pageData = await response.json();
      if (!Array.isArray(pageData) || pageData.length === 0) break;

      collected.push(...pageData);

      if (total === 0) {
        total = Number(response.headers.get("X-Total")) || 0;
      }
      await onProgress?.(collected.length, total || collected.length);

      if (pageData.length < pageSize) break;
    }

    return collected;
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;


      if (timeSinceLastRequest < this.minDelay) {
        await this.sleep(this.minDelay - timeSinceLastRequest);
      }

      const request = this.queue.shift()!;
      this.lastRequestTime = Date.now();

      try {
        const response = await request.execute();


        if (response.status === 429) {
          console.warn('[API Rate Limiter] Rate limited, retrying...');

          if (request.retries < this.maxRetries) {

            const delay = this.retryDelay * Math.pow(2, request.retries);
            await this.sleep(delay);

            request.retries++;
            this.queue.unshift(request);
            continue;
          } else {
            console.error('[API Rate Limiter] Max retries reached for request');
            request.resolve(response);
            continue;
          }
        }

        request.resolve(response);
      } catch (error) {
        console.error('[API Rate Limiter] Request failed:', error);
        request.reject(error);
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * What each data key has spent this hour, as counted by this instance.
   *
   * The client_id is not returned: it is a credential, and the label is enough
   * to tell the keys apart.
   */
  async getQuotas(): Promise<Array<KeyUsage & { label: number }>> {
    await this.initTokens();

    return this.clientIds.map((clientId, slot) => ({
      ...usageFor(clientId),
      keyId: `key ${this.tokenLabels[slot]}`,
      label: this.tokenLabels[slot],
    }));
  }


  clearQueue() {
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

export const apiRateLimiter = new ApiRateLimiter();
