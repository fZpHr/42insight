import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { cached } from "@/lib/memory-cache";
import { CAMPUS_IDS } from "@/lib/forty-two/live-campus";

/**
 * The campus event list: one 42 request, and the same answer for everyone on
 * campus, so it is cached campus-wide rather than fetched once per visitor. It
 * travels on whichever key the visitor is browsing with.
 */

const CACHE_TTL = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { api } = await getApi();

  const { campus_name } = await params;

  const campusId = CAMPUS_IDS[campus_name];
  if (!campusId) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const events = await cached(
      `events:v1:${campus_name}`,
      CACHE_TTL,
      async () => {
        const response = await api.fetch(`/campus/${campusId}/events`);

        if (!response.ok) {
          throw new Error(`42 API responded ${response.status}`);
        }

        return response.json();
      },
    );

    return NextResponse.json(events);
  } catch (error: any) {
    console.error(`[events] failed for ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch events from the 42 API" },
      { status: 502 },
    );
  }
}
