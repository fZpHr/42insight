import type { FortyTwoApi } from "@/lib/forty-two/api";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * How often a student's own corrections end in a pass.
 *
 * This used to mean reading every evaluation the campus had on record and
 * grouping by corrector, because scale_teams can be filtered by user_id -- the
 * person corrected -- and not by corrector. Nice has 108813 of them: 1089
 * pages, eighteen minutes on one visitor's key, and the route's 500-page cap
 * silently cut it in half anyway. It was switched off for good reason.
 *
 * /v2/users/:id/scale_teams/as_corrector is the way round it. It answers for
 * one corrector, and X-Total means the count never has to be read row by row:
 * two requests, one for the passes and one for the fails, and no rows come
 * back at all.
 *
 * The bounds are the part to get right. 42 marks run from -42 to 125 at this
 * campus, because bonuses push past 100 and a mark can be negative, so the
 * obvious range of 50,100 quietly loses every bonus grade -- it read 261
 * passes where there are 372, and turned an 83% ratio into 77%. Checked
 * against a full read of all 450 rows: 372 and 78 either way.
 */

const PASS_MARK = 50;

/** Wide enough for any mark 42 allows, at both ends. */
const ABOVE_ANY_MARK = 10000;
const BELOW_ANY_MARK = -10000;

/** A ratio moves by one evaluation at a time, so it does not need to be fresh. */
const CACHE_TTL = 6 * 60 * 60;

export interface CorrectionRatio {
  positive: number;
  negative: number;
  percentage: number;
}

const countMarks = async (
  userId: number,
  range: string,
  api: FortyTwoApi,
): Promise<number> => {
  const response = await api.fetch(
    `/users/${userId}/scale_teams/as_corrector` +
      `?range[final_mark]=${range}&page[size]=1`,
  );

  if (!response.ok) {
    throw new Error(`42 API responded ${response.status} counting corrections`);
  }

  return Number(response.headers.get("X-Total")) || 0;
};

export const getCorrectionRatio = async (
  userId: number,
  api: FortyTwoApi,
): Promise<CorrectionRatio> =>
  cachedOnce(`correction-ratio:${userId}`, CACHE_TTL, async () => {
    // Sequential, not parallel: both go through the same paced lane anyway,
    // and firing them together only makes the second wait in a different place.
    const positive = await countMarks(
      userId,
      `${PASS_MARK},${ABOVE_ANY_MARK}`,
      api,
    );
    const negative = await countMarks(
      userId,
      `${BELOW_ANY_MARK},${PASS_MARK - 1}`,
      api,
    );

    const total = positive + negative;

    return {
      positive,
      negative,
      percentage: total ? Math.round((positive / total) * 100) : 0,
    };
  });
