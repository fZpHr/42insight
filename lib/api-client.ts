/**
 * Client helpers for talking to this app's API.
 *
 * Data routes answer 428 when the visitor has not connected a 42 key. The
 * site's own credentials are reserved for signing in, so nothing is fetched on
 * them -- pages turn that answer into a prompt rather than an error.
 */

export const KEY_PRESENT_COOKIE = "byok_key_present";

/**
 * Fired on the window once a key has been connected, replaced or forgotten.
 *
 * The cookie only says whether there is a key, not which one, so nothing on
 * screen can notice a swap on its own.
 */
export const KEY_CHANGED_EVENT = "byok:key-changed";

export const announceKeyChange = (): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(KEY_CHANGED_EVENT));
  }
};

export class KeyRequiredError extends Error {
  constructor() {
    super("key_required");
    this.name = "KeyRequiredError";
  }
}

export const isKeyRequired = (error: unknown): boolean =>
  error instanceof KeyRequiredError ||
  (error instanceof Error && error.message === "key_required");

/** Whether the visitor has connected a key, from the readable companion cookie. */
export const hasApiKey = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((entry) => entry.trim().startsWith(`${KEY_PRESENT_COOKIE}=`));
};

/**
 * What a route answers, with a 202, while a campus it needs is still being
 * read from 42. Paris takes over a minute, longer than a request may run, so
 * the server keeps reading after answering and the next request joins in.
 */
export interface Pending {
  pending: true;
  campus: string;
  /** Rows read so far, and 42's count of all of them (0 until it says). */
  loaded: number;
  total: number;
}

/**
 * How many 202s in a row a request sits through before giving up. Each is a
 * server that waited twenty seconds, so this is five minutes -- Paris needs
 * four or so.
 */
export const MAX_PENDING_ANSWERS = 15;

export const fetchJson = async <T>(
  url: string,
  { onPending }: { onPending?: (progress: Pending) => void } = {},
): Promise<T> => {
  for (let answers = 1; ; answers++) {
    const response = await fetch(url);

    if (response.status === 428) throw new KeyRequiredError();
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    if (response.status !== 202) return response.json();

    if (answers >= MAX_PENDING_ANSWERS) {
      throw new Error("Request still pending after several minutes");
    }
    onPending?.(await response.json());
  }
};
