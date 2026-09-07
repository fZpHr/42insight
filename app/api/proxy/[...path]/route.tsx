import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { getUserApi, withCallCount } from "@/lib/forty-two/user-api";

/**
 * The API console: an arbitrary read against the 42 API, chosen by the visitor.
 *
 * This is the one route whose cost nobody can predict, so it prefers the
 * visitor's own key when they have connected one. Without a key it still works,
 * on the site keys, but under the per-user rate limit below -- the console is
 * the only place where one person can aim traffic at any endpoint they like,
 * and that must not be able to drain what every other page depends on.
 *
 * It used to forward the caller's OAuth session token. That token is issued by
 * this site's application and 42 meters per application, so it drew from the
 * same budget as signing in, with none of the accounting.
 */

/** Requests per minute per visitor on the site keys. */
const SHARED_KEY_LIMIT = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = await getToken({ req: request });
  if (!token || !token.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userApi = await getUserApi();

  if (!userApi) {
    const limitResult = await rateLimit(token.id as string, SHARED_KEY_LIMIT);
    if (!limitResult.success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: getRateLimitHeaders(limitResult),
      });
    }
  }

  try {
    const { path } = await params;
    const apiPath = path.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const target = `/${apiPath}${searchParams ? `?${searchParams}` : ""}`;

    const proxyResponse = await (userApi
      ? userApi.fetch(target)
      : apiRateLimiter.fetch(target));

    if (!proxyResponse.ok) {
      return NextResponse.json(
        { error: `42 API error: ${proxyResponse.status}` },
        { status: proxyResponse.status },
      );
    }

    return withCallCount(
      NextResponse.json(await proxyResponse.json()),
      userApi,
    );
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from 42 API" },
      { status: 500 },
    );
  }
}
