import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import {
  keyRequiredResponse,
  REQUEST_SPACING_MS,
} from "@/lib/forty-two/user-api";
import { countCursusStudents, listCampuses } from "@/lib/forty-two/live-campus";
import { DOCUMENTED_HOURLY_LIMIT } from "@/lib/forty-two/quota";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * What a Global fetch would cost, before anyone spends it.
 *
 * Reading every school at once is the one thing on this site big enough to
 * matter: it is most of an hour's quota and several minutes of waiting, on the
 * visitor's own key. So it is asked for, never automatic, and the confirmation
 * quotes a real price rather than a warning.
 *
 * The price itself is two requests -- the campus directory, which is cached for
 * a day anyway, and one counting request whose only purpose is to read X-Total.
 */

const CACHE_TTL = 60 * 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const cost = await cachedOnce("global-cost", CACHE_TTL, async () => {
      const [campuses, students] = await Promise.all([
        listCampuses(api),
        countCursusStudents(null, api),
      ]);

      // The roster walk is a hundred students a page, and each campus costs one
      // more request for who is on an internship. A floor, not a promise: a
      // campus large enough to paginate that second call costs a little more.
      const requests = Math.ceil(students / 100) + campuses.length;

      return {
        campuses: campuses.length,
        students,
        requests,
        seconds: Math.round((requests * REQUEST_SPACING_MS) / 1000),
        hourlyLimit: DOCUMENTED_HOURLY_LIMIT,
      };
    });

    return NextResponse.json(cost);
  } catch (error: any) {
    console.error("[campuses/cost] failed:", error.message);
    return NextResponse.json(
      { error: "Failed to price a global fetch" },
      { status: 502 },
    );
  }
}
