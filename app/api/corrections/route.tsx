import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import {
  getCorrectionRatio,
  type CorrectionRatio,
} from "@/lib/forty-two/corrections";

/**
 * Correction ratios for the students actually on screen.
 *
 * Two requests each and nothing read row by row, so a page of twenty costs
 * forty requests rather than the eighteen-minute campus scan this replaces.
 * The page asks for what it is showing and the column fills in behind it.
 */

// Twenty students is forty paced requests, some twenty-five seconds cold.
export const maxDuration = 60;

/** A screenful. More than this is a page walk wearing a different hat. */
const MAX_IDS = 30;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `at most ${MAX_IDS} ids at a time` },
      { status: 400 },
    );
  }

  const ratios: Record<number, CorrectionRatio> = {};

  for (const id of [...new Set(ids)]) {
    try {
      ratios[id] = await getCorrectionRatio(id, api);
    } catch (error: any) {
      // One student 42 will not answer for should not cost the other
      // nineteen: the column shows a dash for them and the rest fill in.
      console.error(`[corrections] ${id} failed:`, error.message);
    }
  }

  return NextResponse.json(ratios);
}
