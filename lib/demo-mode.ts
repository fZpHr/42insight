/**
 * Demo mode: the site, with an invented 42 network behind it.
 *
 * Someone who has never registered a 42 application cannot see anything here
 * -- every page reads the API live, and the API needs their key. That is a
 * hard first visit: the only thing on offer is a form asking for credentials
 * for a site they have not been able to look at. Demo mode is the answer to
 * that, and to nothing else.
 *
 * It is two things together. A session, so the pages and the middleware let
 * the visitor through, and this cookie, which tells getApi() to hand out the
 * demo client instead of refusing for want of a key. Both are set at the same
 * moment, by the button on the sign-in page.
 *
 * The cookie is readable by the page on purpose: it unlocks nothing. Setting
 * it by hand with no session still stops at the middleware, and setting it
 * with a real key changes nothing, because a real key is always preferred.
 *
 * This replaces the old dev_preview cookie, which did the first half only --
 * it skipped the redirects and then sat on pages that answered 428 forever --
 * and which was switched off in production, where it was needed most.
 */
export const DEMO_COOKIE = "demo";

/** A day: long enough to look around, short enough not to linger. */
const DEMO_MAX_AGE = 86400;

export const isDemoEnabled = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").includes(`${DEMO_COOKIE}=1`);
};

export const setDemo = (on: boolean): void => {
  document.cookie = on
    ? `${DEMO_COOKIE}=1; path=/; max-age=${DEMO_MAX_AGE}; samesite=lax`
    : `${DEMO_COOKIE}=; path=/; max-age=0`;
};
