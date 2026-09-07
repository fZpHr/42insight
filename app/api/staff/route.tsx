import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  currentPool,
  getCampusStudents,
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

  const user = session.user;
  if (user.role != "admin" && user.role != "staff") {
    return NextResponse.json(
      { error: "Staff or Admin access required" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const campus = searchParams.get("campus") || user.campus;

  if (!campus || !CAMPUS_IDS[campus]) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const api = await getUserApi();
    const pool = currentPool();

    const students = await getCampusStudents(campus, api);
    const poolUsers = await getPoolUsers(
      campus,
      pool.month,
      pool.year,
      api,
    ).catch(() => []);

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
    if (error instanceof MissingUserKeyError) return keyRequiredResponse();

    console.error("Error fetching campus stats:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
