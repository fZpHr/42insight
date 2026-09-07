import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { recentCalls } from "@/lib/forty-two/activity";
import { readCredentials } from "@/lib/forty-two/user-api";

/**
 * What this visitor's key has just been asked to fetch.
 *
 * Read when the header's counter is opened, not polled: it exists to answer
 * "what is it doing right now", and nobody needs that on a timer.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await readCredentials();
  if (!credentials) return NextResponse.json({ calls: [] });

  return NextResponse.json({ calls: recentCalls(credentials.clientId) });
}
