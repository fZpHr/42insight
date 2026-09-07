import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  getEnrichedCampusStudents,
} from "@/lib/forty-two/live-campus";
import {
  getUserApi,
  keyRequiredResponse,
  MissingUserKeyError,
} from "@/lib/forty-two/user-api";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const api = await getUserApi();
    const perCampus: Awaited<ReturnType<typeof getEnrichedCampusStudents>>[] = [];

    for (const campus of Object.keys(CAMPUS_IDS)) {
      perCampus.push(await getEnrichedCampusStudents(campus, api));
    }

    return NextResponse.json(perCampus.flat());
  } catch (error: any) {
    if (error instanceof MissingUserKeyError) return keyRequiredResponse();

    console.error("[users] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 502 },
    );
  }
}
