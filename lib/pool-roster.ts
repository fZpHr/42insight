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

export const fetchPoolStudents = async (campus: string): Promise<Student[]> => {
  const pool = await fetchJson<PoolUser[]>(
    `/api/users/pool?campus=${encodeURIComponent(campus)}`,
  );

  return pool.map((user) => ({
    ...user,
    blackholeTimer: 0,
    relation: null,
    work: 0,
    has_validated: user.has_succeeded ?? false,
    campus,
  }));
};
