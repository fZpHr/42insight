import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { getEnrichedCampusStudents } from "@/lib/forty-two/live-campus";

// A cold campus walk runs ten seconds or so, past Vercel's default function
// timeout.
export const maxDuration = 60;

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

    // One request names the student's own campus, rather than guessing by
    // walking every campus 42 has looking for a match.
    const userResponse = await api.fetch(`/users/${encodeURIComponent(login)}`);
    if (userResponse.status === 404) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!userResponse.ok) {
      throw new Error(`42 API responded ${userResponse.status}`);
    }

    const profile = await userResponse.json();
    const campusName =
      profile.campus?.find((c: any) => c.is_primary)?.name ??
      profile.campus?.[0]?.name;
    if (!campusName) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const students = await getEnrichedCampusStudents(campusName, api);
    const student = students.find((candidate) => candidate.name === login);
    if (student) return NextResponse.json(student);

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {

    console.error("Error fetching user", error.message);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
