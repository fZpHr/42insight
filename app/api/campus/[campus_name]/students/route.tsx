import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  resolveCampusId,
  getEnrichedCampusStudents,
} from "@/lib/forty-two/live-campus";

// A cold cache walks the whole campus in paginated 42 API calls, roughly ten
// seconds per campus paced at two requests a second -- past Vercel's default
// function timeout, which kills the request before the client ever sees a
// response (and the visitor has to reload to hit the now-warm cache).
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  const { campus_name } = await params;
  if (!(await resolveCampusId(campus_name, api))) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    return NextResponse.json(await getEnrichedCampusStudents(campus_name, api));
  } catch (error: any) {

    console.error(`[campus] failed to build ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch students from the 42 API" },
      { status: 502 },
    );
  }
}
