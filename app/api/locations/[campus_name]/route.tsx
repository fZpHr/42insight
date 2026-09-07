import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { cached } from "@/lib/forty-two/cache";
import { CAMPUS_IDS } from "@/lib/forty-two/live-campus";

/**
 * Who is logged in on campus right now.
 *
 * Only active sessions come back, so this is one or two pages whatever the size
 * of the campus -- tier 1 work. The cluster map used to walk those pages from
 * the browser through /api/proxy, which meant every open tab paid for its own
 * copy of the same answer; one short-lived shared cache serves them all.
 */

const CACHE_TTL = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campus_name } = await params;
  const campusId = CAMPUS_IDS[campus_name];
  if (!campusId) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const locations = await cached(
      `locations:v1:${campus_name}`,
      CACHE_TTL,
      () =>
        apiRateLimiter.fetchAllPages(
          `/campus/${campusId}/locations?filter[active]=true`,
          { maxPages: 10 },
        ),
    );

    return NextResponse.json(locations);
  } catch (error: any) {
    console.error(`[locations] failed for ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch locations from the 42 API" },
      { status: 502 },
    );
  }
}
