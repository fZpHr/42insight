import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";

/**
 * A profile picture, re-fetched on the visitor's own key.
 *
 * 42's picture CDN (cdn.intra.42.fr) began answering anonymous requests with
 * 403, so the browser can no longer load an avatar straight from its URL. The
 * bearer the API already runs on does unlock it, so the image is fetched here,
 * server-side, and streamed back -- which keeps the token off the page and
 * leaves every <img> pointing at this site rather than the CDN.
 */

// Only 42's own CDN is proxied. This route must never become an open proxy
// that fetches arbitrary URLs on the server's behalf.
const ALLOWED_HOST = "cdn.intra.42.fr";

// The picture at a given URL does not change -- a new photo gets a new path --
// so the browser may hold it for a day.
const CACHE_TTL = 60 * 60 * 24;

// Whatever comes back is served from this site's origin, so a CDN file that is
// HTML -- or an SVG opened directly rather than through an <img> -- would run
// its scripts with this site's rights. Only images get through, and the
// sandboxing CSP for this path in next.config.ts stops a script in the one
// allowed type that can carry one. It lives there because next.config's
// headers replace a Content-Security-Policy set here.
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
]);

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const target = new URL(request.url).searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST) {
    return new Response("Forbidden host", { status: 403 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const upstream = await api.fetchAsset(parsed.toString());
    if (!upstream.ok || !upstream.body) {
      return new Response(null, { status: upstream.status || 502 });
    }

    const type = upstream.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (!type || !IMAGE_TYPES.has(type)) {
      // Read, not cancelled: Next's fetch hands back half of a tee(), and
      // cancelling that half waits forever on the other (see UserApi.fetch).
      await upstream.arrayBuffer().catch(() => {});
      return new Response(null, { status: 415 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": `private, max-age=${CACHE_TTL}`,
      },
    });
  } catch (error: any) {
    console.error(`[avatar] failed for ${parsed.toString()}:`, error?.message);
    return new Response(null, { status: 502 });
  }
}
