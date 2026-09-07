import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";

/**
 * Whatever 42 says about the budget on each site key.
 *
 * The documented limits are 2 requests/second and 1200/hour per application,
 * but the public apidoc does not say which headers report what is *left*. So
 * this reports the rate-limit headers the API actually answered with, under
 * their real names, rather than a number invented from a guessed header.
 *
 * Read it once against a live key to find out what 42 sends; the limiter can
 * then act on it instead of only pacing at two requests a second.
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
