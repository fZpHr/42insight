import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Peer relations were precomputed by the refresh-42 crons over the whole
 * campus history. Nothing derives them from a live request, so the route
 * reports the data as absent and callers fall back to their empty state.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ login: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await params;
  return NextResponse.json({ relation: null, available: false });
}
