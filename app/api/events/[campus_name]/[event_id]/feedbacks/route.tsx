import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { cached } from "@/lib/memory-cache";
import { CAMPUS_IDS } from "@/lib/forty-two/live-campus";

/** One 42 request per event, shared by everyone who opens that event. */

const CACHE_TTL = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string; event_id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campus_name, event_id } = await params;

  if (!CAMPUS_IDS[campus_name]) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const feedbacks = await cached(
      `event-feedbacks:v1:${event_id}`,
      CACHE_TTL,
      async () => {
        const response = await apiRateLimiter.fetch(
          `/events/${event_id}/feedbacks?page[size]=100&page[number]=1`,
        );

        if (!response.ok) {
          throw new Error(`42 API responded ${response.status}`);
        }

        return response.json();
      },
    );

    return NextResponse.json(feedbacks);
  } catch (error: any) {
    console.error(`[events] feedbacks failed for ${event_id}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch feedbacks from the 42 API" },
      { status: 502 },
    );
  }
}
