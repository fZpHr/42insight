import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { DOCUMENTED_HOURLY_LIMIT, usageFor } from "@/lib/forty-two/quota";
import { readCredentials } from "@/lib/forty-two/user-api";

/** One line for the site keys taken together, for visitors who are not staff. */
const sharedSummary = async () => {
  const quotas = await apiRateLimiter.getQuotas();

  return [
    {
      keyId: `${quotas.length} shared key${quotas.length === 1 ? "" : "s"}`,
      used: quotas.reduce((sum, quota) => sum + quota.used, 0),
      remaining: quotas.reduce((sum, quota) => sum + quota.remaining, 0),
      limit: quotas.length * DOCUMENTED_HOURLY_LIMIT,
      resetAt: null,
      headers: {},
    },
  ];
};

/**
 * How much of the hourly budget is left, on the visitor's key and on the
 * site's.
 *
 * 42 allows 1200 requests an hour per application. Both figures are this
 * server instance's own count, so on a platform running several instances they
 * are a floor rather than a total. The browser keeps the accurate number for a
 * visitor's personal key by adding up the per-response call counts, which the
 * instances cannot see between them.
 *
 * `headers` carries any rate-limit header the 42 API actually answered with.
 * The public apidoc documents none, so nothing is assumed -- but if something
 * shows up there it beats counting, and this is where it will appear.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await readCredentials();
  const isStaff =
    session.user.role === "admin" || session.user.role === "staff";

  return NextResponse.json({
    limit: DOCUMENTED_HOURLY_LIMIT,
    personal: credentials
      ? { present: true, ...usageFor(credentials.clientId), keyId: "your key" }
      : { present: false },
    // Everyone sees how loaded the shared keys are: it is the reason to
    // connect a key of your own. Only staff see them broken down per key.
    shared: isStaff
      ? await apiRateLimiter.getQuotas()
      : await sharedSummary(),
  });
}
