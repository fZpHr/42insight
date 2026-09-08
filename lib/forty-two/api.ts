import { UserApi, getUserApi } from "@/lib/forty-two/user-api";

/**
 * Which key a request travels on: the visitor's, or none at all.
 *
 * The site's own credentials do one thing, and only that thing: sign people in.
 * They have to. 42 meters per application, next-auth reads the profile on every
 * sign-in, and a deployment runs one registered app -- so any data request made
 * on the site key competes with logging in, and a busy afternoon of browsing can
 * lock students out of the site entirely.
 *
 * Data therefore travels on keys students register themselves. A visitor
 * without one is not served stale or partial data, and nothing is fetched on
 * their behalf: the route answers 428 and the page asks for a key.
 */

/** What the 42 API clients answer to. */
export interface FortyTwoApi {
  fetch(path: string, init?: RequestInit): Promise<Response>;
  fetchAllPages(
    path: string,
    options?: {
      pageSize?: number;
      maxPages?: number;
      onProgress?: (done: number, total: number) => void | Promise<void>;
    },
  ): Promise<any[]>;
}

/**
 * The caller's own API client, or null when they have not connected a key.
 *
 * Routes turn null into keyRequiredResponse(). There is deliberately no
 * fallback: falling back to the site key is the exact failure this design
 * exists to prevent.
 */
export const getApi = async (): Promise<UserApi | null> => getUserApi();
