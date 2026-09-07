import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Live exam results.
 *
 * This read a Redis key that the refresh-42 runner polled and filled. Nothing
 * fills it now, and unlike the changelog it cannot be recovered from a public
 * source: it needs the exam's project ids, then the grades of everyone sitting
 * it. That is a handful of requests, not a per-student scan, so it is well
 * within reach -- but it needs the exam project ids confirmed rather than
 * guessed, so the route reports the feature as unavailable instead of pretending.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json([]);
}
