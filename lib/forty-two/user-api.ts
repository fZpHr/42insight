import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Calls the 42 API with the visitor's own application key.
 *
 * The site's own credentials are reserved for OAuth. They have to be: 42 rate
 * limits per application, next-auth reads /v2/me to build the session, and this
 * deployment runs a single registered app -- so every data request made on the
 * site key competes with logging in, and a burst of traffic can lock students
 * out. Data therefore travels on keys students register themselves.
 *
 * The token lives in an httpOnly cookie set by /api/byok/token, so it rides
 * along with every same-origin request without any call site having to pass it,
 * and page scripts cannot read it.
 */

export const TOKEN_COOKIE = "byok_token";
export const KEY_PRESENT_COOKIE = "byok_key_present";

/** 42 allows two requests per second per application. */
const REQUEST_SPACING_MS = 500;

export class MissingUserKeyError extends Error {
  constructor() {
    super("No 42 API key configured for this visitor");
    this.name = "MissingUserKeyError";
  }
}

export const keyRequiredResponse = () =>
  NextResponse.json(
    {
      error: "key_required",
      message:
        "Add your own 42 API key to load this page. The site key is reserved for signing in.",
    },
    { status: 428 },
  );

export const getUserToken = async (): Promise<string | null> => {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A 42 API client bound to one visitor's token, pacing its own requests so a
 * multi-page walk stays inside the per-application rate limit.
 */
export class UserApi {
  private lastRequestAt = 0;

  constructor(private readonly token: string) {}

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < REQUEST_SPACING_MS) {
      await sleep(REQUEST_SPACING_MS - elapsed);
    }
    this.lastRequestAt = Date.now();

    return fetch(`https://api.intra.42.fr/v2${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${this.token}`,
      },
    });
  }

  /**
   * Walks a paginated collection until it runs dry or hits maxPages.
   *
   * onProgress receives the real collection size, which the 42 API reports in
   * the X-Total header, so a caller can show a genuine count rather than a
   * spinner.
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

      if (response.status === 401) throw new MissingUserKeyError();
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
}

/**
 * Resolves the caller's API client, or null when they have not configured a
 * key. Routes turn that null into keyRequiredResponse() so the page can prompt.
 */
export const getUserApi = async (): Promise<UserApi | null> => {
  const token = await getUserToken();
  return token ? new UserApi(token) : null;
};
