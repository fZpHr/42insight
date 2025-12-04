import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

// In-memory cache for coalition data
const coalitionCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET(
  request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const params = await context.params;
  const login = params.login;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check cache first
  const cached = coalitionCache.get(login);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return NextResponse.json(cached.data);
  }

  try {
    // First get user ID
    const userResponse = await apiRateLimiter.fetch(`/users/${login}`);
    if (!userResponse.ok) {
      if (userResponse.status === 429 && cached) {
        console.warn(`[WARN] Rate limited fetching user ${login}. Serving stale cache.`);
        return NextResponse.json(cached.data);
      }
      return NextResponse.json(
        { error: `Failed to fetch user from 42 API: ${userResponse.statusText}` },
        { status: userResponse.status },
      );
    }

    const user = await userResponse.json();

    // Fetch coalition data
    const coalitionResponse = await apiRateLimiter.fetch(`/users/${user.id}/coalitions`);

    if (!coalitionResponse.ok) {
      if (coalitionResponse.status === 429 && cached) {
        console.warn(`[WARN] Rate limited fetching coalition for ${login}. Serving stale cache.`);
        return NextResponse.json(cached.data);
      }
      return NextResponse.json(
        { error: `Failed to fetch coalition from 42 API: ${coalitionResponse.statusText}` },
        { status: coalitionResponse.status },
      );
    }

    const coalitions = await coalitionResponse.json();

    // Store in cache before returning
    coalitionCache.set(login, { data: coalitions, timestamp: Date.now() });

    return NextResponse.json(coalitions);
  } catch (error: any) {
    console.error(`[FATAL ERROR] in /api/users/${login}/coalitions:`, error.message);
    return NextResponse.json(
      {
        error: "Failed to fetch coalition due to an internal server error.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
