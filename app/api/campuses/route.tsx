import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { listCampuses } from "@/lib/forty-two/live-campus";
import { cachedOnce } from "@/lib/memory-cache";

/** Every campus 42 has, for the pages that let a visitor pick one. */

const CACHE_TTL = 24 * 60 * 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const campuses = await cachedOnce("campuses", CACHE_TTL, () => listCampuses(api));
    return NextResponse.json(campuses);
  } catch (error: any) {
    console.error("[campuses] failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch campuses from the 42 API" },
      { status: 502 },
    );
  }
}
