import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

// In-memory cache for events
const eventsCache = new Map<string, { events: any[], timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(
  request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const params = await context.params;
  const login = params.login;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check cache first
  const cached = eventsCache.get(login);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return NextResponse.json({ events: cached.events });
  }

  try {
    // Récupérer l'utilisateur pour obtenir son id
    const userRes = await apiRateLimiter.fetch(`/users/${login}`);
    if (!userRes.ok) {
      if (userRes.status === 429 && cached) {
        console.warn(`[WARN] Rate limited fetching user for events ${login}. Serving stale cache.`);
        return NextResponse.json({ events: cached.events });
      }
      console.error("[DEBUG] User not found for login:", login);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = await userRes.json();
    let allEvents: any[] = [];
    let page = 1;
    const perPage = 100;
    let eventsPage;
    do {
      const eventsRes = await apiRateLimiter.fetch(`/users/${user.id}/events?per_page=${perPage}&page=${page}`);
      if (!eventsRes.ok) {
        // If we get rate limited, return the stale cache if it exists, otherwise fail
        if (eventsRes.status === 429 && cached) {
          console.warn(`[WARN] Rate limited fetching events for ${login}. Serving stale cache.`);
          return NextResponse.json({ events: cached.events });
        }
        console.error(`[DEBUG] Failed to fetch events page ${page} for user ${login}:`, eventsRes.statusText);
        // Don't cache partial results, just break and return what we have (which is none)
        return NextResponse.json({ error: `Failed to fetch events: ${eventsRes.statusText}` }, { status: eventsRes.status });
      }
      eventsPage = await eventsRes.json();
      allEvents = allEvents.concat(eventsPage);
      page++;
    } while (eventsPage && eventsPage.length === perPage);

    // Store in cache before returning
    eventsCache.set(login, { events: allEvents, timestamp: Date.now() });

    return NextResponse.json({ events: allEvents });
  } catch (error: any) {
    console.error("[ERROR] /api/users/[login]/events:", error.message);
    return NextResponse.json({ error: "Failed to fetch events", details: error.message }, { status: 500 });
  }
}
