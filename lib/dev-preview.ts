/**
 * Shared with middleware.ts, which reads the same cookie server-side to skip
 * the sign-in/key redirects. Kept here so every client-side check (the
 * toggle button, the login page, the pages that otherwise wait forever on a
 * session that will never arrive) reads it the same way.
 */
export const DEV_PREVIEW_COOKIE = "dev_preview";

export const isDevPreviewEnabled = (): boolean => {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").includes(`${DEV_PREVIEW_COOKIE}=1`);
};

export const setDevPreview = (on: boolean): void => {
  document.cookie = on
    ? `${DEV_PREVIEW_COOKIE}=1; path=/; max-age=86400`
    : `${DEV_PREVIEW_COOKIE}=; path=/; max-age=0`;
};
