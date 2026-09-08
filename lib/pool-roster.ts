import { fetchJson } from "@/lib/api-client";
import type { PoolUser, Student } from "@/types";

/**
 * The piscine roster, shaped like the 42cursus one.
 *
 * The piscine is a different cursus, so a different roster and a different
 * request. Its rows come back nearly identical to a student's already: what a
 * pisciner cannot have is a blackhole to time, an internship to be on, or a
 * validated 42cursus, so those are filled in here rather than teaching every
 * page's sorts, columns and filters about a second type.
 *
 * Shared by the rankings and the trombinoscope, which both offer the switch.
 */

/** Which roster a page is showing. */
export type Cursus = "cursus" | "piscine";

/**
 * Stands in for a month, a year, or both, to rank across promotions rather
 * than within one. The route reads it the same way.
 */
export const ALL_PROMOTIONS = "all";

/** One piscine a campus ran, as /api/pool-promotions reports it. */
export interface PoolPromotion {
  month: string;
  year: string;
  count: number;
  /** null when the sample could not agree on one. */
  cursusName: string | null;
  /** False for a Discovery Piscine, which is a different cursus entirely. */
  isCPiscine: boolean;
  /** The one to open on when nobody has chosen. */
  isCurrent?: boolean;
}

/**
 * A promotion when one has been picked; otherwise the route works out the
 * campus's current one, which is not something the client can assume.
 */
export const fetchPoolStudents = async (
  campus: string,
  promotion?: { month: string | null; year: string } | null,
): Promise<Student[]> => {
  const query = new URLSearchParams({ campus });
  if (promotion?.month) {
    query.set("month", promotion.month);
    query.set("year", promotion.year);
  }

  const pool = await fetchJson<PoolUser[]>(`/api/users/pool?${query}`);

  return pool.map((user) => ({
    ...user,
    blackholeTimer: 0,
    relation: null,
    work: 0,
    has_validated: user.has_succeeded ?? false,
    campus,
  }));
};
