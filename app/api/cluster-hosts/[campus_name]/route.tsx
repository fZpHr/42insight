import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

/**
 * Historical hours per workstation.
 *
 * This one genuinely cannot be rebuilt live. It needs every location row of
 * every student -- which host, for how long -- where the logtime index only
 * needs daily totals from locations_stats. There is no cheap endpoint for it,
 * so the overlay reports no data and the cluster map renders without it.
 */
export async function GET(_request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({});
}
