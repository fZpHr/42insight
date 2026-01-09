import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

const coalitionCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; 

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

  const cached = coalitionCache.get(login);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return NextResponse.json(cached.data);
  }

  try {
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

    const coalitionResponse = await apiRateLimiter.fetch(`/users/${user.id}/coalitions`);

    if (!coalitionResponse.ok) {
      if (coalitionResponse.status === 429 && cached) {
        return NextResponse.json(cached.data);
      }
      return NextResponse.json(
        { error: `Failed to fetch coalition from 42 API: ${coalitionResponse.statusText}` },
        { status: coalitionResponse.status },
      );
    }

    const coalitions = await coalitionResponse.json();
    
    const niceCoalitions = ['Corrino', 'Atreides', 'Harkonnen'];
    const angoulemeCoalitions = ['Analyst', 'Architect', 'Seeker'];
    const parisCoalitions = ['Alliance', 'Assembly', 'Federation', 'Order'];
    
    const campus = session.user?.campus || "";
    let selectedCoalition;
    
    if (campus === "Nice") {
      selectedCoalition = coalitions.find((c: any) => niceCoalitions.includes(c.name));
    } else if (campus === "Angouleme") {
      selectedCoalition = coalitions.find((c: any) => angoulemeCoalitions.includes(c.name));
    } else {
      selectedCoalition = coalitions.find((c: any) => parisCoalitions.includes(c.name));
    }
    
    if (!selectedCoalition && coalitions.length > 0) {
      selectedCoalition = coalitions[coalitions.length - 1];
    }

    const result = selectedCoalition ? [selectedCoalition] : [];
    coalitionCache.set(login, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
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
