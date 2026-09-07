import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { UserApi, getUserApi } from "@/lib/forty-two/user-api";

/**
 * Picking which key a request travels on.
 *
 * 42 meters per application, so every visitor browsing on the site's keys
 * shares one paced queue: when several people load a page at once, each waits
 * behind the others. A visitor who has connected their own 42 application gets
 * their own lane instead -- their requests are paced only against their own
 * budget, and nobody else's browsing slows them down.
 *
 * Their key also feeds the shared cache, so a page they pay to load is then
 * free for everyone. That is deliberate: it means connecting a key helps the
 * campus rather than only the person who connected it.
 */

/** What both clients answer to, so call sites do not care which they hold. */
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

export interface ResolvedApi {
  api: FortyTwoApi;
  /**
   * The visitor's own client when they have one, so the route can report back
   * how much of their budget the response spent. Null means the shared keys.
   */
  personal: UserApi | null;
}

export const getApi = async (): Promise<ResolvedApi> => {
  const personal = await getUserApi();
  return { api: personal ?? apiRateLimiter, personal };
};
