import type { FortyTwoApi } from "@/lib/forty-two/api";
import { cachedOnce } from "@/lib/memory-cache";
import { resolveCampusId, CURSUS_ID } from "@/lib/forty-two/live-campus";

/**
 * Which coalitions belong to a campus.
 *
 * This used to be a table written down for the two campuses the site started
 * on, with a Paris-shaped default for everywhere else. It was wrong in both
 * directions. Angouleme's read "Analyst", "Architect", "Seeker" while 42 calls
 * them "Analysts", "Architects", "Seekers", so nothing ever matched and the
 * route fell back to the last coalition on the list -- for a student of two
 * campuses that is the other campus's. And no table can hold 54 campuses:
 * Lyon's are Earth, Air, Water and Fire, which the default never mentions.
 *
 * 42 answers the question itself. A campus's blocs carry its coalitions, one
 * request, and they change about as often as a campus is founded.
 */
const COALITIONS_TTL = 24 * 60 * 60;

export const campusCoalitionIds = async (
  campusName: string,
  api: FortyTwoApi,
): Promise<Set<number>> =>
  cachedOnce(`coalitions:campus:${campusName}`, COALITIONS_TTL, async () => {
    const campusId = await resolveCampusId(campusName, api);
    if (!campusId) return new Set<number>();

    const response = await api.fetch(
      `/blocs?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS_ID}&page[size]=100`,
    );
    if (!response.ok) {
      throw new Error(`42 API responded ${response.status} listing blocs`);
    }

    const blocs = await response.json();
    const ids = new Set<number>();

    for (const bloc of Array.isArray(blocs) ? blocs : []) {
      for (const coalition of bloc?.coalitions ?? []) {
        if (typeof coalition?.id === "number") ids.add(coalition.id);
      }
    }

    return ids;
  });
