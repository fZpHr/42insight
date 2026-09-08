import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { cachedOnce } from "@/lib/memory-cache";
import { resolveCampusId } from "@/lib/forty-two/live-campus";
import { resolveFloorPlan } from "@/lib/forty-two/cluster-plans";

/**
 * A floor plan for a campus nobody drew one for.
 *
 * A real layout where one exists and still describes the building, and one
 * worked out from the workstation names everywhere else. See
 * lib/forty-two/cluster-plans.ts, and vendor/42-cluster-maps for the layouts.
 *
 * A room does not move, so this is cached for a day: at worst a couple of dozen
 * pages once, which is less than the campus roster every page already pays for.
 */

const CACHE_TTL = 24 * 60 * 60;

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
  const campusId = await resolveCampusId(campus_name, api);
  if (!campusId) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    return NextResponse.json(
      await cachedOnce(`cluster-plan:${campus_name}`, CACHE_TTL, () =>
        resolveFloorPlan(campusId, api),
      ),
    );
  } catch (error: any) {
    console.error(`[cluster-map] failed for ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to work out the campus layout" },
      { status: 502 },
    );
  }
}
