import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  resolveCampusId,
  currentPool,
  getCampusStudents,
  getPoolUsers,
} from "@/lib/forty-two/live-campus";

// A cold campus walk runs ten seconds or so, past Vercel's default function
// timeout.
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  const user = session.user;
  if (user.role != "admin" && user.role != "staff") {
    return NextResponse.json(
      { error: "Staff or Admin access required" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const campus = searchParams.get("campus") || user.campus;

  if (!campus || !(await resolveCampusId(campus, api))) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const pool = currentPool();

    const [students, poolUsers] = await Promise.all([
      getCampusStudents(campus, api),
      getPoolUsers(campus, pool.month, pool.year, api).catch(() => []),
    ]);

    const totalStudents = students.length;
    const activePoolUsers = poolUsers.length;

    const averageLevel =
      totalStudents > 0
        ? students.reduce((sum, student) => sum + student.level, 0) /
          totalStudents
        : 0;

    // blackholeTimer is days remaining, and 0 means no blackhole at all
    // (validated or alumni), so those must not count as at risk.
    const studentsAtRisk = students.filter(
      (student) => student.blackholeTimer > 0 && student.blackholeTimer <= 30,
    ).length;

    const topPerformers = [...students]
      .sort((a, b) => b.level - a.level)
      .slice(0, 10)
      .map((student) => ({
        name: student.name,
        level: student.level,
        campus: student.campus,
      }));

    return NextResponse.json({
      totalStudents,
      activePoolUsers,
      averageLevel,
      studentsAtRisk,
      topPerformers,
      blackHoleSoon: studentsAtRisk,
      inactiveStudents: totalStudents - activePoolUsers,
    });
  } catch (error: any) {

    console.error("Error fetching campus stats:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
