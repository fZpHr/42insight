import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { withCallCount } from "@/lib/forty-two/user-api";
import {
  CAMPUS_IDS,
  getEnrichedCampusStudents,
} from "@/lib/forty-two/live-campus";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { api, personal } = await getApi();

  const { campus_name } = await params;
  if (!CAMPUS_IDS[campus_name]) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    return withCallCount(
      NextResponse.json(await getEnrichedCampusStudents(campus_name, api)),
      personal,
    );
  } catch (error: any) {

    console.error(`[campus] failed to build ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch students from the 42 API" },
      { status: 502 },
    );
  }
}
