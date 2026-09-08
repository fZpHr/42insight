import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  CAMPUS_IDS,
  getEnrichedCampusStudents,
} from "@/lib/forty-two/live-campus";

// Walks every campus in turn on a cold cache -- roughly ten seconds each,
// past Vercel's default function timeout, which would otherwise kill the
// request before the client sees a response.
export const maxDuration = 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const perCampus: Awaited<ReturnType<typeof getEnrichedCampusStudents>>[] = [];

    for (const campus of Object.keys(CAMPUS_IDS)) {
      perCampus.push(await getEnrichedCampusStudents(campus, api));
    }

    return NextResponse.json(perCampus.flat());
  } catch (error: any) {

    console.error("[users] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 502 },
    );
  }
}
