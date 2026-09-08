import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  CAMPUS_IDS,
  currentPool,
  getCampusStudents,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";

// A miss on the first campus (and pool) tried chains several full walks --
// each ten seconds or so cold, past Vercel's default function timeout.
export const maxDuration = 60;

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

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const { login } = await params;

    // Look at the caller's own campus first. Each miss costs a full page walk
    // through a campus -- ten seconds or so on a cold cache -- and the answer
    // is almost always in the first one tried.
    const ordered = Object.keys(CAMPUS_IDS).sort((a, b) =>
      a === session.user.campus ? -1 : b === session.user.campus ? 1 : 0,
    );

    for (const campus of ordered) {
      const students = await getCampusStudents(campus, api);
      if (students.some((student) => student.name === login)) {
        return NextResponse.json({ rank: rankByLevel(students, login) });
      }
    }

    const pool = currentPool();
    for (const campus of ordered) {
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
