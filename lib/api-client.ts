/**
 * Client helpers for talking to this app's API.
 *
 * Data routes answer 428 when the visitor has not connected a 42 key. The
 * site's own credentials are reserved for signing in, so nothing is fetched on
 * them -- pages turn that answer into a prompt rather than an error.
 */

export const KEY_PRESENT_COOKIE = "byok_key_present";

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

export const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (response.status === 428) throw new KeyRequiredError();
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};
