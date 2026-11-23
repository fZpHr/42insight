import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { getServerSession } from "next-auth";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * One student's profile and projects: one 42 request, on the visitor's key.
 *
 * Cached in the server's own memory, which is per instance, not shared across
 * them -- a serverless deployment runs many instances of this route, and a Map
 * in each one means the same profile is refetched once per instance.
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

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    // cachedOnce: the dashboard and the intra view ask for the same profile
    // at the same moment, and they should share one 42 request.
    const user = await cachedOnce(api, `intra:v2:${login.toLowerCase()}`, CACHE_TTL, async () => {
      const response = await api.fetch(`/users/${encodeURIComponent(login)}`);

      // The intra view searches arbitrary logins, so a typo has to read as
      // "no such student" rather than as 42 being down.
      if (response.status === 404) throw new Error("not_found");
      if (!response.ok) {
        throw new Error(`42 API responded ${response.status}`);
      }

      const profile = await response.json();

      // /users/:login already carries every projects_users row (checked
      // against X-Total: 74 of 74, 143 of 143), minus the teams nothing here
      // reads. Walking the paginated list again cost one to five more paced
      // requests per profile; it is only the fallback now.
      if (!Array.isArray(profile.projects_users)) {
        profile.projects_users = await api.fetchAllPages(
          `/users/${profile.id}/projects_users`,
          { maxPages: 5 },
        );
      }

      return profile;
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.message === "not_found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error(`[intra] failed for ${login}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch user from the 42 API" },
      { status: 502 },
    );
  }
}
