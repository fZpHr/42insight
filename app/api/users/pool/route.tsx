import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  currentPool,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";
import {
  getUserApi,
  keyRequiredResponse,
  MissingUserKeyError,
} from "@/lib/forty-two/user-api";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pool = currentPool();
    const month = (searchParams.get("month") ?? pool.month).toLowerCase();
    const year = searchParams.get("year") ?? pool.year;

    const api = await getUserApi();
    const poolUsers: any[] = [];

    for (const campus of Object.keys(CAMPUS_IDS)) {
      poolUsers.push(...(await getPoolUsers(campus, month, year, api)));
    }

    return NextResponse.json(poolUsers);
  } catch (error: any) {
    if (error instanceof MissingUserKeyError) return keyRequiredResponse();

    console.error("[pool] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch pool users" },
      { status: 502 },
    );
  }
}
