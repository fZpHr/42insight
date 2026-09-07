import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { DOCUMENTED_HOURLY_LIMIT, usageFor } from "@/lib/forty-two/quota";
import { readCredentials } from "@/lib/forty-two/user-api";

/** The site keys as one line, for visitors who are not staff. */
const sharedSummary = async () => {
  const quotas = await apiRateLimiter.getQuotas();
  const includesSignInKey = quotas.some((quota) => quota.isSignInKey);
  const reported = quotas.filter((quota) => quota.source === "42");

  return [
    {
      keyId: includesSignInKey
        ? "site key, also used to sign in"
        : `${quotas.length} site key${quotas.length === 1 ? "" : "s"}`,
      // A key nobody has used yet reports its full budget rather than zero.
      source: reported.length === quotas.length ? "42" : "counted",
      used: quotas.reduce((sum, quota) => sum + quota.used, 0),
      remaining: quotas.reduce((sum, quota) => sum + quota.remaining, 0),
      limit: quotas.reduce((sum, quota) => sum + quota.limit, 0),
      observedAt:
        reported
          .map((quota) => quota.observedAt)
          .filter(Boolean)
          .sort()
          .pop() ?? null,
      includesSignInKey,
    },
  ];
};

/**
 * How much of the hourly budget is left, on the visitor's key and the site's.
 *
 * The figures come from the 42 API's own headers, which it sends on every /v2
 * response and which meter per application -- confirmed against a live key,
 * including that a fresh token continues the same budget rather than resetting
 * it. `source: "42"` marks a real reading; `"counted"` means that key has not
 * been used yet on this server instance and the number is our own tally.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await readCredentials();
  const isStaff =
    session.user.role === "admin" || session.user.role === "staff";
  const siteKeys = await apiRateLimiter.getQuotas();

  return NextResponse.json({
    limit: DOCUMENTED_HOURLY_LIMIT,
    personal: credentials
      ? { present: true, ...usageFor(credentials.clientId), keyId: "your key" }
      : { present: false },
    shared: isStaff ? siteKeys : await sharedSummary(),
    signInKeyShared: siteKeys.some((quota) => quota.isSignInKey),
  });
}
