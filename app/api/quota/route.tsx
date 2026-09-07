import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { DOCUMENTED_HOURLY_LIMIT, usageFor } from "@/lib/forty-two/quota";
import { readCredentials } from "@/lib/forty-two/user-api";

/**
 * How much of the hourly budget the visitor's own key has left.
 *
 * The figures are the 42 API's own: it reports x-hourly-ratelimit-remaining on
 * every /v2 response, and meters per application -- confirmed against a live
 * key, including that a fresh token continues the same budget rather than
 * resetting it. `source: "42"` marks a real reading; `"counted"` means the key
 * has not been used yet on this server instance.
 *
 * The site's own key is not reported here, because it never fetches data. It
 * signs people in, and next-auth talks to 42 directly to do that, so there is
 * nothing for this route to observe.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await readCredentials();

  return NextResponse.json({
    limit: DOCUMENTED_HOURLY_LIMIT,
    personal: credentials
      ? {
          present: true,
          ...usageFor(credentials.clientId),
          keyId: "your key",
          expiresAt: credentials.expiresAt ?? null,
        }
      : { present: false },
  });
}
