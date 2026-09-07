import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { CAMPUS_IDS, CURSUS_ID } from "@/lib/forty-two/live-campus";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * How often each student's corrections end in a pass.
 *
 * The rankings page has always shown this -- "Ratio of corrections validated
 * vs KO'd", by its own tooltip -- from a field the retired cron jobs filled.
 * A scale_teams row names its corrector and carries the mark they gave, so it
 * is recoverable: group by corrector, count the marks at or above the 42 pass
 * threshold against those below, and ignore evaluations not yet graded.
 *
 * It is a page of its own because it is the most expensive thing here: a year
 * of Nice is 10283 evaluations, a hundred pages, near a minute of a visitor's
 * quota. The rankings page loads it in the background and fills the column in
 * when it lands, rather than making everyone wait on a column most sorts do
 * not use.
 */

/** A shorter window leaves too few corrections each to say anything. */
const WINDOW_DAYS = 365;
const PASS_MARK = 50;
const CACHE_TTL = 3600;

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
  const campusId = CAMPUS_IDS[campus_name];
  if (!campusId) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  try {
    const ratios = await cachedOnce(
      `corrections:${campus_name}`,
      CACHE_TTL,
      async () => {
        const since = new Date(
          Date.now() - WINDOW_DAYS * 86_400_000,
        ).toISOString();

        const rows = await api.fetchAllPages(
          `/scale_teams?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS_ID}` +
            `&range[created_at]=${since},${new Date().toISOString()}`,
          { maxPages: 120 },
        );

        const tally: Record<
          string,
          { positive: number; negative: number; percentage: number }
        > = {};

        for (const row of rows) {
          const correctorId = row.corrector?.id;
          // A mark of null is an evaluation booked or under way, not a verdict.
          if (!correctorId || row.final_mark === null) continue;

          const entry = (tally[correctorId] ??= {
            positive: 0,
            negative: 0,
            percentage: 0,
          });
          if (row.final_mark >= PASS_MARK) entry.positive++;
          else entry.negative++;
        }

        for (const entry of Object.values(tally)) {
          const total = entry.positive + entry.negative;
          entry.percentage = total
            ? Math.round((entry.positive / total) * 100)
            : 0;
        }

        return tally;
      },
    );

    return NextResponse.json(ratios);
  } catch (error: any) {
    console.error(`[corrections] failed for ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch corrections from the 42 API" },
      { status: 502 },
    );
  }
}
