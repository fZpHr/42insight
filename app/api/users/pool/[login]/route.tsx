import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  currentPool,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ login: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { login } = await params;
    const pool = currentPool();

    for (const campus of Object.keys(CAMPUS_IDS)) {
      const poolUsers = await getPoolUsers(campus, pool.month, pool.year).catch(
        () => [],
      );
      const poolUser = poolUsers.find((candidate) => candidate.name === login);
      if (poolUser) return NextResponse.json(poolUser);
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[pool] failed to fetch user:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 502 },
    );
  }
}
