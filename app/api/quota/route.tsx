import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

/**
 * What the site keys have left this hour, as 42 last reported it.
 *
 * Whether a page is affordable on the shared keys is a question with a real
 * answer, and 42 puts it in the headers of every response. This reads back what
 * the limiter recorded, so the tiering can be checked against traffic instead
 * of estimated.
 *
 * Each serverless instance holds its own keys and its own counters, so a single
 * call shows one instance's view. Trends matter here, not a single reading.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "staff") {
    return NextResponse.json(
      { error: "Staff or Admin access required" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    keys: apiRateLimiter.getQuotas(),
    queued: apiRateLimiter.getQueueSize(),
  });
}
