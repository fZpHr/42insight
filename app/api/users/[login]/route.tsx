import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  CAMPUS_IDS,
  getEnrichedCampusStudents,
} from "@/lib/forty-two/live-campus";

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

    for (const campus of Object.keys(CAMPUS_IDS)) {
      const students = await getEnrichedCampusStudents(campus, api);
      const student = students.find((candidate) => candidate.name === login);
      if (student) return NextResponse.json(student);
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {

    console.error("Error fetching user", error.message);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
