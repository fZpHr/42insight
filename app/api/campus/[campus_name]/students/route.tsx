import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  getEnrichedCampusStudents,
  getLogtimeMeta,
} from "@/lib/forty-two/live-campus";
import {
  getUserApi,
  keyRequiredResponse,
  MissingUserKeyError,
} from "@/lib/forty-two/user-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campus_name } = await params;
  if (!CAMPUS_IDS[campus_name]) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const api = await getUserApi();
    const [students, logtimeMeta] = await Promise.all([
      getEnrichedCampusStudents(campus_name, api),
      getLogtimeMeta(campus_name),
    ]);

    return NextResponse.json(students, {
      headers: logtimeMeta
        ? { "X-Logtime-Index-Updated": logtimeMeta.updatedAt }
        : undefined,
    });
  } catch (error: any) {
    if (error instanceof MissingUserKeyError) return keyRequiredResponse();

    console.error(`[campus] failed to build ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch students from the 42 API" },
      { status: 502 },
    );
  }
}
