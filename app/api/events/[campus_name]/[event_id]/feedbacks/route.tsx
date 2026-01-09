import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campus_name: string; event_id: string }> },
) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }
  try {
    const { campus_name, event_id } = await params

    const campusMapping: { [key: string]: number } = {
      Angouleme: 31,
      Nice: 41,
    };

    const campusId = campusMapping[campus_name];
    if (!campusId) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    const response = await apiRateLimiter.fetch(
      `/events/${event_id}/feedbacks?page[size]=100&page[number]=1`,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from 42 API: ${response.statusText}` },
        { status: response.status },
      );
    }

    const feedbacks = await response.json();
    return NextResponse.json(feedbacks);
  } catch (error: any) {
    const { campus_name } = await params
    console.error(
      `[FATAL ERROR] in /api/campus/${campus_name}/intra:`,
      error.message,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch feedbacks due to an internal server error.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
