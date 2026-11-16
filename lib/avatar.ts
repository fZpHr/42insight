/**
 * A profile-picture URL the browser can actually load.
 *
 * 42's CDN (cdn.intra.42.fr) now refuses anonymous requests with a 403, so an
 * avatar can no longer be loaded straight from its URL. Pictures on that CDN
 * are routed through /api/avatar, which re-fetches them on the visitor's key.
 * Anything else -- a local placeholder, demo mode's inlined data: faces -- is
 * left exactly as it is.
 */
export const avatarSrc = (url?: string | null): string => {
  if (!url) return "/placeholder.svg";
  try {
    if (new URL(url).hostname === "cdn.intra.42.fr") {
      return `/api/avatar?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // Relative or malformed -- nothing to proxy, hand it back untouched.
  }
  return url;
};
