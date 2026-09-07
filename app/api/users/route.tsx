import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  getEnrichedCampusStudents,
} from "@/lib/forty-two/live-campus";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const perCampus = await Promise.all(
      Object.keys(CAMPUS_IDS).map((campus) =>
        getEnrichedCampusStudents(campus).catch(() => []),
      ),
    );

    return NextResponse.json(perCampus.flat());
  } catch (error: any) {
    console.error("[users] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 502 },
    );
  }
}
