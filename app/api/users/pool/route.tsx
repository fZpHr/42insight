import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  currentPool,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";

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

    const perCampus = await Promise.all(
      Object.keys(CAMPUS_IDS).map((campus) =>
        getPoolUsers(campus, month, year).catch(() => []),
      ),
    );

    return NextResponse.json(perCampus.flat());
  } catch (error: any) {
    console.error("[pool] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch pool users" },
      { status: 502 },
    );
  }
}
