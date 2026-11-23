import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { getServerSession } from "next-auth";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * Logins starting with what the visitor has typed so far, across every
 * campus: one 42 request on the visitor's key, for the intra view's search box.
 *
 * 42 has no prefix filter, but range[login]=ki,kizzz… is one -- logins are
 * lowercase letters, digits and dashes, all of which sort before "z".
 */

const CACHE_TTL = 600;
// Matched by SEARCH_LIMIT on the dashboard, which narrows short answers locally.
const LIMIT = 8;
const PREFIX = /^[a-z0-9_-]{2,32}$/;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefix = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (!PREFIX.test(prefix)) return NextResponse.json([]);

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const users = await cachedOnce(api, `login-search:v1:${prefix}`, CACHE_TTL, async () => {
      const upper = prefix.padEnd(32, "z");
      const response = await api.fetch(
        `/users?range[login]=${encodeURIComponent(prefix)},${encodeURIComponent(upper)}&sort=login&page[size]=${LIMIT}`,
      );
      if (!response.ok) throw new Error(`42 API responded ${response.status}`);

      const rows = await response.json();
      return (Array.isArray(rows) ? rows : []).map((user: any) => ({
        login: user.login,
        displayname: user.usual_full_name ?? user.displayname,
        image: user.image?.versions?.micro ?? user.image?.link ?? null,
        location: user.location ?? null,
      }));
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error(`[login-search] failed for "${prefix}":`, error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
