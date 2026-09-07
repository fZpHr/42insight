import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { rateLimitCount } from "@/lib/rate-limit";

/**
 * How many requests the caller has made in the current window.
 *
 * It used to read a Redis key that nothing ever wrote, so it always answered
 * zero. It now reports what the in-memory limiter has actually counted for
 * this instance.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(rateLimitCount(session.user.id ?? session.user.name ?? "unknown"));
}
