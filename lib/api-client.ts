/**
 * Client helpers for talking to this app's API.
 */

export const KEY_PRESENT_COOKIE = "byok_key_present";

/**
 * Whether the visitor has connected a 42 key, from the readable companion
 * cookie. Nothing on the site requires one; this only decides whether to offer
 * the work that needs it.
 */
export const hasApiKey = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((entry) => entry.trim().startsWith(`${KEY_PRESENT_COOKIE}=`));
};

export const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};
