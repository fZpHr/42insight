import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { cached } from "@/lib/memory-cache";
import { CAMPUS_IDS } from "@/lib/forty-two/live-campus";

/** One 42 request per event, shared by everyone who opens that event. */

const CACHE_TTL = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string; event_id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { api } = await getApi();

  const { campus_name, event_id } = await params;

  if (!CAMPUS_IDS[campus_name]) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const subscribers = await cached(
      `event-subscribers:v1:${event_id}`,
      CACHE_TTL,
      async () => {
        const response = await api.fetch(
          `/events/${event_id}/events_users?page[size]=100&page[number]=1`,
        );

        if (!response.ok) {
          throw new Error(`42 API responded ${response.status}`);
        }

        return response.json();
      },
    );

    return NextResponse.json(subscribers);
  } catch (error: any) {
    console.error(`[events] subscribers failed for ${event_id}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch subscribers from the 42 API" },
      { status: 502 },
    );
  }
}
