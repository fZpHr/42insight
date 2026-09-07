import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import {
  CAMPUS_IDS,
  currentPool,
  getCampusStudents,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";

const rankByLevel = (
  people: Array<{ name: string; level: number }>,
  login: string,
): number | null => {
  const sorted = [...people].sort((a, b) => b.level - a.level);
  const index = sorted.findIndex((person) => person.name === login);
  return index === -1 ? null : index + 1;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ login: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { api } = await getApi();

  try {
    const { login } = await params;

    // The campus is not part of the request, so look through the cached
    // campuses rather than making the caller supply one.
    for (const campus of Object.keys(CAMPUS_IDS)) {
      const students = await getCampusStudents(campus, api);
      if (students.some((student) => student.name === login)) {
        return NextResponse.json({ rank: rankByLevel(students, login) });
      }
    }

    const pool = currentPool();
    for (const campus of Object.keys(CAMPUS_IDS)) {
      const poolUsers = await getPoolUsers(campus, pool.month, pool.year, api);
      if (poolUsers.some((poolUser) => poolUser.name === login)) {
        return NextResponse.json({ rank: rankByLevel(poolUsers, login) });
      }
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {

    console.error("Error fetching rank", error.message);
    return NextResponse.json({ error: "Failed to fetch rank" }, { status: 500 });
  }
}
