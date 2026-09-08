import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  campusForRequest,
  campusRequiredResponse,
} from "@/lib/forty-two/campus-scope";
import { getEnrichedCampusStudents } from "@/lib/forty-two/live-campus";

// One campus is a paginated walk paced at two requests a second, roughly ten
// seconds cold, past Vercel's default function timeout.
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  // This walked every campus in the static two-campus seed. With the live
  // directory that would be 54 rosters in one request, so it now answers for
  // one campus: the one asked for, or the caller's own.
  const campus = campusForRequest(request, session);
  if (!campus) return campusRequiredResponse();

  try {
    return NextResponse.json(await getEnrichedCampusStudents(campus, api));
  } catch (error: any) {
    console.error("[users] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 502 },
    );
  }
}
