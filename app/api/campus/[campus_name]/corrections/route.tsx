import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { resolveCampusId } from "@/lib/forty-two/live-campus";
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
 * It is a page of its own, and asked for rather than automatic, because it is
 * by far the most expensive thing here: Nice has 44867 evaluations on record,
 * some 450 pages, several minutes of a visitor's quota. Anything cheaper is a
 * shorter window, and a shorter window answers a different question than the
 * one the column asks.
 */

const PASS_MARK = 50;
const CACHE_TTL = 3600;
/** Nice has 44867 evaluations on record. Room for them, and for growth. */
const MAX_PAGES = 500;

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
    const ratios = await cachedOnce(
      `corrections:${campus_name}`,
      CACHE_TTL,
      async () => {
        // No date window and no cursus filter, both of which were wrong.
        //
        // A correction ratio is a record of how someone has corrected, not of
        // their last twelve months: one student here has 450 corrections and 7
        // of them fall inside a year, so a windowed figure said 7 and meant
        // nothing. And filter[cursus_id] dropped 40% of the evaluations at this
        // campus, piscine corrections among them, which are corrections too.
        const rows = await api.fetchAllPages(
          `/scale_teams?filter[campus_id]=${campusId}`,
          { maxPages: MAX_PAGES },
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
