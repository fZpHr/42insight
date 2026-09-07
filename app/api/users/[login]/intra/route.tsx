import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { cached } from "@/lib/forty-two/cache";

/**
 * One student's profile and projects: two or three 42 requests, on the site
 * keys.
 *
 * The cache is shared rather than per-instance -- a serverless deployment runs
 * many instances of this route, and a Map in each one means the same profile is
 * refetched once per instance.
 */

const CACHE_TTL = 600;

export async function GET(
  _request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const { login } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await cached(`intra:v1:${login}`, CACHE_TTL, async () => {
      const response = await apiRateLimiter.fetch(`/users/${login}`);

      if (!response.ok) {
        throw new Error(`42 API responded ${response.status}`);
      }

      const profile = await response.json();

      profile.projects_users = await apiRateLimiter.fetchAllPages(
        `/users/${profile.id}/projects_users`,
        { maxPages: 5 },
      );

      return profile;
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error(`[intra] failed for ${login}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch user from the 42 API" },
      { status: 502 },
    );
  }
}
