import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EncryptJWT, jwtDecrypt } from "jose";
import { recordHeaders, recordRequest } from "@/lib/forty-two/quota";
import { recordCall } from "@/lib/forty-two/activity";

/**
 * Calls the 42 API with the visitor's own application key.
 *
 * 42 meters per application, so everyone browsing on the site's keys shares one
 * queue: at busy moments a page waits behind other people's requests. A visitor
 * who registers their own 42 application gets a lane of their own -- their
 * requests are paced against their budget only, and their browsing no longer
 * competes with anyone else's.
 *
 * A key is optional. Without one the site works exactly as before, on the
 * shared keys.
 *
 * What is stored, and where
 * ------------------------
 * The credentials, encrypted, in an httpOnly cookie. Not the access token: that
 * expires after about two hours, and storing it was why a visitor had to paste
 * their key in again every session. Holding the credentials instead means the
 * server can mint a fresh token whenever the old one lapses, so the key is
 * entered once and keeps working.
 *
 * The cookie is encrypted with JWT_SECRET and httpOnly, so page scripts cannot
 * read it. It is sameSite=lax rather than strict: signing in returns the
 * browser from api.intra.42.fr, and a strict cookie would be withheld on that
 * navigation, so the first page after login would ask for a key already
 * connected. The secret never reaches this server in readable form again, and
 * nothing is written to disk anywhere -- there is no database here.
 *
 * Access tokens are cached in server memory, keyed by a hash of the
 * credentials, so a visitor costs one token exchange every couple of hours
 * rather than one per request.
 */

/** Encrypted {clientId, clientSecret}. */
export const CREDENTIALS_COOKIE = "byok_credentials";
/** Readable by the page, so the interface knows a key is set. */
export const KEY_PRESENT_COOKIE = "byok_key_present";
/** Set by the previous design, which stored the token itself. */
export const LEGACY_TOKEN_COOKIE = "byok_token";

/** Long enough that connecting a key feels permanent. */
export const CREDENTIALS_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * 42 allows two requests per second per application. Pacing at exactly 500ms
 * sits on the limit, and anything that nudges two requests into the same second
 * -- scheduling jitter, a slow event loop -- earns a 429 and a retry that costs
 * more than the wait saved. A little headroom is cheaper.
 */
const REQUEST_SPACING_MS = 600;

export interface Credentials {
  clientId: string;
  clientSecret: string;
}

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
        "This runs on your own 42 API key. Connect one to start it.",
    },
    { status: 428 },
  );

const encryptionKey = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to store a 42 key");
  return new Uint8Array(createHash("sha256").update(secret).digest());
};

export const sealCredentials = async (
  credentials: Credentials,
): Promise<string> =>
  new EncryptJWT({ ...credentials })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${CREDENTIALS_MAX_AGE}s`)
    .encrypt(encryptionKey());

const openCredentials = async (
  sealed: string,
): Promise<Credentials | null> => {
  try {
    const { payload } = await jwtDecrypt(sealed, encryptionKey());
    const clientId = payload.clientId as string;
    const clientSecret = payload.clientSecret as string;
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  } catch {
    // Expired, tampered with, or sealed under a different JWT_SECRET.
    return null;
  }
};

export const readCredentials = async (): Promise<Credentials | null> => {
  const store = await cookies();
  const sealed = store.get(CREDENTIALS_COOKIE)?.value;
  return sealed ? openCredentials(sealed) : null;
};

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache: Map<string, CachedToken> = ((globalThis as any)
  .__42insightUserTokens ??= new Map<string, CachedToken>());

const MAX_CACHED_TOKENS = 500;

const fingerprint = (credentials: Credentials): string =>
  createHash("sha256")
    .update(`${credentials.clientId}:${credentials.clientSecret}`)
    .digest("hex");

/**
 * Exchanges credentials for an access token, reusing the cached one until it is
 * close enough to expiry to be worth replacing.
 */
export const exchangeForToken = async (
  credentials: Credentials,
): Promise<string | null> => {
  const id = fingerprint(credentials);
  const cached = tokenCache.get(id);

  // A minute of headroom, so a token cannot lapse mid page walk.
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

  const response = await fetch("https://api.intra.42.fr/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });

  if (!response.ok) {
    tokenCache.delete(id);
    return null;
  }

  const data = await response.json();
  if (!data.access_token) return null;

  if (tokenCache.size >= MAX_CACHED_TOKENS) {
    const oldest = tokenCache.keys().next();
    if (!oldest.done) tokenCache.delete(oldest.value);
  }

  tokenCache.set(id, {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 7200) * 1000,
  });

  return data.access_token;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * When the next request on a given key may leave, shared across every client
 * built for it.
 *
 * Pacing used to live on the instance, and a page builds several -- the
 * dashboard alone asks four routes at once. Each paced itself to two requests
 * a second, so together they went four times faster than 42 allows and earned
 * 429s. The slot is reserved synchronously, before any await, so two callers
 * cannot claim the same one.
 */
const nextSlotAt: Map<string, number> = ((globalThis as any).__42insightPacing ??=
  new Map<string, number>());

const reserveSlot = async (keyId: string): Promise<void> => {
  const now = Date.now();
  const at = Math.max(now, nextSlotAt.get(keyId) ?? 0);
  nextSlotAt.set(keyId, at + REQUEST_SPACING_MS);
  if (at > now) await sleep(at - now);
};

/**
 * A 42 API client bound to one visitor's key, pacing its own requests so a
 * multi-page walk stays inside the per-application rate limit.
 */
export class UserApi {
  constructor(
    private readonly token: string,
    /** The 42 application being metered, which is what quota is counted per. */
    public readonly keyId: string,
  ) {}

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    await reserveSlot(this.keyId);
    recordRequest(this.keyId);

    const startedAt = Date.now();
    const response = await fetch(`https://api.intra.42.fr/v2${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${this.token}`,
      },
    });

    recordHeaders(this.keyId, response);
    recordCall(this.keyId, path, response.status, Date.now() - startedAt);
    return response;
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
 * The caller's own API client, or null when they have not connected a key.
 *
 * Minting the token is transparent: a visitor whose access token lapsed is not
 * asked for anything, because what is stored is the credentials.
 */
export const getUserApi = async (): Promise<UserApi | null> => {
  const credentials = await readCredentials();
  if (!credentials) return null;

  const token = await exchangeForToken(credentials);
  if (!token) return null;

  return new UserApi(token, credentials.clientId);
};
