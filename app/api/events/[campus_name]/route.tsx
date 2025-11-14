import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

export async function GET(
  request: Request,
  { params }: { params: { campus_name: string } },
) {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

  try {
    const campusMapping: { [key: string]: number } = {
      Angouleme: 31,
      Nice: 41,
    };

    const campusId = campusMapping[params.campus_name];
    if (!campusId) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    const response = await apiRateLimiter.fetch(`/campus/${campusId}/events `);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from 42 API: ${response.statusText}` },
        { status: response.status },
      );
    }

    const events = await response.json();
    return NextResponse.json(events);
  } catch (error: any) {
    console.error(
      `[FATAL ERROR] in /api/campus/${params.campus_name}/intra:`,
      error.message,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch events due to an internal server error.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
