/**
 * Client helpers for talking to this app's API.
 *
 * Data routes answer 428 when the visitor has not configured a 42 key, since
 * the site's own credentials are reserved for signing in. Pages turn that into
 * a prompt rather than an error toast.
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

/** Whether a key is set, from the readable companion cookie. */
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
