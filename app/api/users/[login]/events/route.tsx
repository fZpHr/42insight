import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { cached } from "@/lib/memory-cache";

/** The events one student attended: two 42 requests, on the site keys. */

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
    const events = await cached(
      `user-events:v1:${login}`,
      CACHE_TTL,
      async () => {
        const userResponse = await api.fetch(`/users/${encodeURIComponent(login)}`);

        if (!userResponse.ok) {
          throw new Error(`42 API responded ${userResponse.status}`);
        }

        const user = await userResponse.json();

        return api.fetchAllPages(`/users/${user.id}/events`, {
          maxPages: 5,
        });
      },
    );

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error(`[user-events] failed for ${login}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch events from the 42 API" },
      { status: 502 },
    );
  }
}
