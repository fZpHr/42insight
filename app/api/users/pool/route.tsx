import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  CAMPUS_IDS,
  currentPool,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";

// Walks every campus's pool roster in turn on a cold cache -- past Vercel's
// default function timeout.
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const { searchParams } = new URL(request.url);
    const pool = currentPool();
    const month = (searchParams.get("month") ?? pool.month).toLowerCase();
    const year = searchParams.get("year") ?? pool.year;

    const poolUsers: any[] = [];

    for (const campus of Object.keys(CAMPUS_IDS)) {
      poolUsers.push(...(await getPoolUsers(campus, month, year, api)));
    }

    return NextResponse.json(poolUsers);
  } catch (error: any) {

    console.error("[pool] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch pool users" },
      { status: 502 },
    );
  }
}
