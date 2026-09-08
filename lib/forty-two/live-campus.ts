import type { Student } from "@/types";
import type { FortyTwoApi } from "@/lib/forty-two/api";
import { cachedOnce } from "@/lib/memory-cache";
import {
  WORK_APPRENTICESHIP,
  WORK_PROJECT_IDS,
  classifyWorkProject,
} from "@/lib/forty-two/work-projects";

/**
 * Live campus data, straight from the 42 API, on the visitor's own key.
 *
 * This replaces the refresh-42 cron jobs: nothing here reads a database.
 *
 * A whole campus arrives in one paginated call -- a dozen or so requests, not
 * one per student -- which is what makes it affordable to fetch on demand and
 * keep in memory for a few minutes. A connected key is required to fetch it,
 * and the server keeps nothing between restarts.
 *
 * The one thing that does not fit that shape is logtime: it needs a request per
 * student, which no page load can afford. It is built by a visitor's own key
 * and stored in their browser, never here.
 *
 * What one visitor pays to load lands in the shared cache, so the next reader
 * gets it without spending anything.
 */

/**
 * Kept as a fast, no-request path for the two campuses this project started
 * on. Anything else resolves through the live directory below -- the site is
 * no longer limited to these two, now that every request runs on the
 * visitor's own key rather than a shared one with a campus-shaped quota.
 */
export const CAMPUS_IDS: { [key: string]: number } = {
  Angouleme: 31,
  Nice: 41,
};

export const CURSUS_ID = 21;
export const POOL_CURSUS_ID = 9;

export interface CampusInfo {
  id: number;
  name: string;
  /**
   * Every account 42 has on record there, as reported on /campus.
   *
   * Not a student count, and not close to one: Paris reports 43225 accounts
   * against 8402 people in the main cursus. It counts piscines, alumni and
   * staff too. What it is good for is relative size -- Paris is genuinely the
   * largest and Nablus, at 2, the smallest -- so the picker shows it as what
   * it is rather than passing it off as a roster.
   */
  usersCount?: number;
}

interface CampusDirectory {
  byName: Map<string, number>;
  list: CampusInfo[];
  expiresAt: number;
}

/** The full campus list barely ever changes, so a day's cache is cheap. */
const CAMPUS_DIRECTORY_TTL_MS = 24 * 60 * 60 * 1000;

let directory: CampusDirectory | null = null;

const loadDirectory = async (api: FortyTwoApi): Promise<CampusDirectory> => {
  if (directory && directory.expiresAt > Date.now()) return directory;

  const seen = new Map<string, CampusInfo>(
    Object.entries(CAMPUS_IDS).map(([name, id]) => [name, { id, name }]),
  );

  try {
    const rows = await api.fetchAllPages(`/campus`, { maxPages: 3 });
    for (const row of rows) {
      if (!row?.name || typeof row.id !== "number") continue;
      seen.set(row.name, {
        id: row.id,
        name: row.name,
        usersCount:
          typeof row.users_count === "number" ? row.users_count : undefined,
      });
    }
  } catch (error: any) {
    // The seed above still covers the two campuses this started on.
    console.error("[live-campus] fetching the campus directory failed:", error.message);
  }

  const list = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));

  directory = {
    byName: new Map(list.map((campus) => [campus.name, campus.id])),
    list,
    expiresAt: Date.now() + CAMPUS_DIRECTORY_TTL_MS,
  };
  return directory;
};

/** Every campus 42 has, id and name, cached for a day. */
export const listCampuses = async (api: FortyTwoApi): Promise<CampusInfo[]> =>
  (await loadDirectory(api)).list;

/** A campus's id from its name, or null when 42 has no such campus. */
export const resolveCampusId = async (
  name: string,
  api: FortyTwoApi,
): Promise<number | null> => (await loadDirectory(api)).byName.get(name) ?? null;

/**
 * How many students a campus has in a cursus, or the whole network when the
 * campus is null.
 *
 * One request: 42 reports the size of a collection in X-Total, so asking for a
 * single row is enough to learn the size of all of them. That is what makes it
 * honest to quote a price before spending it -- the Global confirmation is
 * showing a number 42 gave, not one this file remembers from a measurement
 * that has since gone stale.
 */
export const countCursusStudents = async (
  campusId: number | null,
  api: FortyTwoApi,
): Promise<number> => {
  const scope = campusId ? `&filter[campus_id]=${campusId}` : "";
  const response = await api.fetch(
    `/cursus_users?filter[cursus_id]=${CURSUS_ID}${scope}&page[size]=1`,
  );

  if (!response.ok) {
    throw new Error(`42 API responded ${response.status} counting students`);
  }

  return Number(response.headers.get("X-Total")) || 0;
};

/**
 * The rankings page hides the correction ratio column when it sees this value.
 * OK/KO counts need a full scale_teams scan, which no live request can afford.
 */
export const NO_CORRECTION_DATA = 420;

// Longer than the pages' own staleTime, so a client refetch lands on a warm
// cache instead of starting another page walk.
const STUDENTS_TTL = 900;
const POOL_TTL = 900;

const studentsCacheKey = (campus: string) => `students:${campus}`;


const daysUntil = (date: string | null): number => {
  if (!date) return 0;
  const remaining = new Date(date).getTime() - Date.now();
  return remaining <= 0 ? 0 : Math.ceil(remaining / 86_400_000);
};

const toStudent = (cursusUser: any, campusName: string): Student => {
  const user = cursusUser.user ?? {};

  return {
    id: user.id,
    name: user.login,
    level: cursusUser.level ?? 0,
    photoUrl: user.image?.versions?.medium || user.image?.link || "",
    location: user.location ?? "",
    correctionPoints: user.correction_point ?? 0,
    year: parseInt(user.pool_year) || new Date().getFullYear(),
    wallet: user.wallet ?? 0,
    blackholeTimer: daysUntil(cursusUser.blackholed_at),
    campus: campusName,
    has_validated:
      cursusUser.grade === "Transcender" || (cursusUser.level ?? 0) >= 21,

    // Needs a scale_teams scan; no live request can afford it.
    correctionTotal: 0,
    correctionPositive: 0,
    correctionNegative: 0,
    correctionPercentage: NO_CORRECTION_DATA,
    // Needs projects_users per student.
    work: 0,
    // Filled from the shared logtime index when it has been built.
    activityData: {} as Student["activityData"],
    relation: null,
  };
};

/**
 * The whole campus from one paginated call. Served from the shared cache when
 * it is warm; building it cold requires the visitor to have a key.
 */
export const getCampusStudents = async (
  campusName: string,
  api: FortyTwoApi,
): Promise<Student[]> => {
  const campusId = await resolveCampusId(campusName, api);
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  return cachedOnce(studentsCacheKey(campusName), STUDENTS_TTL, async () => {
    const [cursusUsers, work] = await Promise.all([
      api.fetchAllPages(
        `/cursus_users?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS_ID}`,
      ),
      getWorkStatus(campusId, api),
    ]);

    return cursusUsers
      .filter((cursusUser) => cursusUser.user && !cursusUser.user["staff?"])
      .map((cursusUser) => {
        const student = toStudent(cursusUser, campusName);
        student.work = work.get(student.id) ?? 0;
        return student;
      });
  });
};

/**
 * Who is on an internship or an apprenticeship, as a student id -> work code.
 *
 * Four pages for a whole campus, so it rides along with the campus build
 * rather than being a page of its own. A failure here costs the two sorts that
 * depend on it, not the rankings.
 */
const getWorkStatus = async (
  campusId: number,
  api: FortyTwoApi,
): Promise<Map<number, number>> => {
  const work = new Map<number, number>();

  try {
    const rows = await api.fetchAllPages(
      `/projects_users?filter[campus]=${campusId}&filter[cursus]=${CURSUS_ID}` +
        `&filter[status]=in_progress&filter[project_id]=${WORK_PROJECT_IDS.join(",")}`,
      { maxPages: 8 },
    );

    for (const row of rows) {
      const kind = classifyWorkProject(row.project?.name ?? "");
      if (!kind || !row.user?.id) continue;
      // Apprenticeship wins: its company evaluations are separate projects, so
      // one student legitimately shows up under several of these.
      const existing = work.get(row.user.id) ?? 0;
      work.set(row.user.id, Math.max(existing, kind === WORK_APPRENTICESHIP ? 2 : 1));
    }
  } catch (error: any) {
    console.error("[live-campus] work status failed:", error.message);
  }

  return work;
};

/**
 * Kept as the name the routes read through. Logtime used to be merged in here
 * from a shared index; it now lives in the visitor's browser, so the merge
 * happens there and this is the campus as the 42 API gives it.
 */
export const getEnrichedCampusStudents = getCampusStudents;

/**
 * The piscines a campus actually ran in a given year, and which kind each was.
 *
 * There is no guessing the months. Angouleme ran six promotions in 2026 --
 * February, April, June, July, August and September -- and a different six in
 * 2025. Paris runs neither July nor September, but May and June. A school
 * changes its months from one year to the next, so the only honest answer
 * comes from asking.
 *
 * Nor are they the same thing. Angouleme's February 2026 is a Discovery
 * Piscine: cursus 3, "Web Programming Essentials", seven days, and not one of
 * its 22 people is in the C Piscine cursus at all. September is the real one:
 * cursus 9, twenty-five days. Listed together they would be a ranking in which
 * a third of the promotions have everybody on level zero, because the level
 * being read is for a cursus they never took.
 *
 * Cost: twelve requests, one per month, each asking for five rows -- the
 * X-Total header for the size, the rows themselves for sample ids -- then one
 * request that asks which cursus those samples are in. Thirteen, fixed,
 * whatever the size of the campus. Cached a day, since a piscine that has
 * happened does not un-happen.
 */

export const POOL_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

export interface PoolPromotion {
  month: string;
  year: string;
  /** How many people 42 has on it -- an order of size, not a roster. */
  count: number;
  /** The cursus its members actually sat, when the sample agreed on one. */
  cursusId: number | null;
  cursusName: string | null;
  /** Whether that cursus is the C Piscine, as opposed to a Discovery one. */
  isCPiscine: boolean;
  /** The one a page opens on when nobody has chosen. */
  isCurrent?: boolean;
}

const PROMOTIONS_TTL = 24 * 60 * 60;

/**
 * How far back "all years" reaches. Four covers anyone still at the school;
 * further is a lot of requests for people who have long since left.
 */
export const YEARS_BACK = 4;

/** Enough of a promotion to tell which cursus it was, without reading it all. */
const SAMPLE_PER_MONTH = 5;

export const listPoolPromotions = async (
  campusName: string,
  year: string,
  api: FortyTwoApi,
): Promise<PoolPromotion[]> => {
  const campusId = await resolveCampusId(campusName, api);
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  return cachedOnce(
    `pool-promotions:v2:${campusName}:${year}`,
    PROMOTIONS_TTL,
    async () => {
      const found: { month: string; count: number; samples: number[] }[] = [];

      for (const month of POOL_MONTHS) {
        const response = await api.fetch(
          `/campus/${campusId}/users` +
            `?filter[pool_month]=${month}&filter[pool_year]=${encodeURIComponent(year)}` +
            `&page[size]=${SAMPLE_PER_MONTH}`,
        );
        if (!response.ok) continue;

        const count = Number(response.headers.get("X-Total")) || 0;
        if (count === 0) continue;

        const rows = await response.json();
        found.push({
          month,
          count,
          samples: (Array.isArray(rows) ? rows : [])
            .map((row: any) => row?.id)
            .filter((id: unknown): id is number => typeof id === "number"),
        });
      }

      const cursusBySample = await getSampleCursus(
        found.flatMap((promotion) => promotion.samples),
        api,
      );

      const classified = found.map(({ month, count, samples }) => {
        const cursus = dominantCursus(samples, cursusBySample);

        return {
          month,
          year,
          count,
          cursusId: cursus?.id ?? null,
          cursusName: cursus?.name ?? null,
          // Unclassifiable is treated as the real thing rather than hidden: a
          // promotion nobody can name is still better shown than dropped.
          isCPiscine: cursus === null || cursus.id === POOL_CURSUS_ID,
        };
      });

      // Marked here rather than worked out again in the browser, so the page
      // opens on the same promotion the roster route would have chosen.
      const current = currentPoolPromotion(classified);

      return classified.map((promotion) => ({
        ...promotion,
        isCurrent:
          promotion.month === current?.month && promotion.year === current?.year,
      }));
    },
  );
};

/** Which cursus each sampled student is in, in one request. */
const getSampleCursus = async (
  ids: number[],
  api: FortyTwoApi,
): Promise<Map<number, { id: number; name: string }[]>> => {
  const bySample = new Map<number, { id: number; name: string }[]>();
  if (ids.length === 0) return bySample;

  try {
    const rows = await api.fetchAllPages(
      `/cursus_users?filter[user_id]=${ids.join(",")}`,
      { maxPages: 3 },
    );

    for (const row of rows) {
      const userId = row?.user?.id;
      if (typeof userId !== "number" || typeof row.cursus_id !== "number") continue;

      const seen = bySample.get(userId) ?? [];
      seen.push({ id: row.cursus_id, name: row.cursus?.name ?? `Cursus ${row.cursus_id}` });
      bySample.set(userId, seen);
    }
  } catch (error: any) {
    console.error("[live-campus] classifying piscines failed:", error.message);
  }

  return bySample;
};

/**
 * The cursus a promotion's samples have in common.
 *
 * A student can be in several -- somebody who did a Discovery Piscine and came
 * back for the real one is in both -- so this counts across the samples and
 * takes the most common, which is the one that promotion was.
 */
const dominantCursus = (
  samples: number[],
  cursusBySample: Map<number, { id: number; name: string }[]>,
): { id: number; name: string } | null => {
  const tally = new Map<number, { name: string; n: number }>();

  for (const sample of samples) {
    for (const cursus of cursusBySample.get(sample) ?? []) {
      const seen = tally.get(cursus.id) ?? { name: cursus.name, n: 0 };
      seen.n++;
      tally.set(cursus.id, seen);
    }
  }

  const best = [...tally.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  return best ? { id: best[0], name: best[1].name } : null;
};

/**
 * The promotion to show when nobody has picked one: the most recent that has
 * begun. A campus with a piscine starting next month should not open on it and
 * report an empty ranking.
 */
export const currentPoolPromotion = (
  promotions: PoolPromotion[],
  now = new Date(),
): PoolPromotion | null => {
  // The C Piscine is what "the piscine" means unqualified. A Discovery week is
  // only shown when it is picked, or when a campus runs nothing else.
  const real = promotions.filter((promotion) => promotion.isCPiscine);
  const candidates = real.length > 0 ? real : promotions;

  const started = candidates.filter((promotion) => {
    const year = Number(promotion.year);
    if (year < now.getFullYear()) return true;
    if (year > now.getFullYear()) return false;
    return POOL_MONTHS.indexOf(promotion.month as any) <= now.getMonth();
  });

  const pool = started.length > 0 ? started : candidates;

  return (
    [...pool].sort(
      (a, b) =>
        Number(b.year) - Number(a.year) ||
        POOL_MONTHS.indexOf(b.month as any) - POOL_MONTHS.indexOf(a.month as any),
    )[0] ?? null
  );
};

/**
 * Which piscine a request is about: the one asked for, else the current one.
 *
 * Replaces a currentPool() that read POOL_MONTH/POOL_YEAR from the environment
 * and fell back to the literal string "september". Nobody had set those, so
 * every piscine page assumed September -- right at Nice by luck, wrong at
 * Angouleme five months out of six, and wrong at Paris always.
 */
export const resolvePoolPromotion = async (
  campusName: string,
  api: FortyTwoApi,
  asked: { month?: string | null; year?: string | null } = {},
): Promise<PoolPromotion | null> => {
  const month = asked.month?.toLowerCase();
  const year = asked.year ?? String(new Date().getFullYear());

  const promotions = await listPoolPromotions(campusName, year, api);

  // Even a promotion named outright is looked up rather than taken at face
  // value: which cursus it was decides which levels to read, and a Discovery
  // Piscine's members have none in the C Piscine.
  if (month) {
    return (
      promotions.find((promotion) => promotion.month === month) ?? {
        month,
        year,
        count: 0,
        cursusId: null,
        cursusName: null,
        isCPiscine: true,
      }
    );
  }

  return currentPoolPromotion(promotions);
};

/**
 * The piscine roster for one campus and one promotion.
 *
 * This used to walk every cursus_users row the campus has ever had for the
 * piscine cursus and then keep the ones whose pool_month matched -- 12 pages at
 * Nice, 81 at Paris, to end up with a hundred people. Worse, fetchAllPages
 * stops at 40 pages, so Paris's 8087 rows were read half way and the promotion
 * being asked for could sit entirely in the half never read.
 *
 * /campus/:id/users filters on pool_month and pool_year directly, which is
 * exact -- checked against the live API, every row it returns conforms, and
 * Paris correctly answers zero for a promotion it never ran. What it does not
 * carry is the cursus level, so the ids come back in a second request that asks
 * cursus_users for exactly those users. Nice: four requests rather than twelve
 * pages.
 */
export const getPoolUsers = async (
  campusName: string,
  month: string,
  year: string,
  api: FortyTwoApi,
  /** The cursus this promotion sat, when it is known to not be the C Piscine. */
  cursusId: number = POOL_CURSUS_ID,
): Promise<any[]> => {
  const campusId = await resolveCampusId(campusName, api);
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  const cacheKey = `pool:${campusName}:${month}:${year}:${cursusId}`;

  return cachedOnce(cacheKey, POOL_TTL, async () => {
    const users = await api.fetchAllPages(
      `/campus/${campusId}/users` +
        `?filter[pool_month]=${encodeURIComponent(month)}` +
        `&filter[pool_year]=${encodeURIComponent(year)}`,
    );

    const pisciners = users.filter((user) => user && !user["staff?"]);
    if (pisciners.length === 0) return [];

    const levels = await getPoolLevels(
      pisciners.map((user) => user.id),
      cursusId,
      api,
    );

    return pisciners.map((user) => ({
      id: user.id,
      name: user.login,
      firstName: user.first_name ?? "",
      level: levels.get(user.id) ?? 0,
      photoUrl: user.image?.versions?.medium || user.image?.link || "",
      location: user.location ?? "",
      correctionPoints: user.correction_point ?? 0,
      year: parseInt(user.pool_year) || new Date().getFullYear(),
      wallet: user.wallet ?? 0,
      isPoolUser: true,

      // Exam grades and project state came from the exam crons.
      correctionTotal: 0,
      correctionPositive: 0,
      correctionNegative: 0,
      correctionPercentage: NO_CORRECTION_DATA,
      activityData: { activities: [] },
      examGrades: {},
      currentProjects: "",
      has_succeeded: false,
    }));
  });
};

/**
 * Several promotions at once, for a ranking across a year or across the lot.
 *
 * Only C Piscine promotions are gathered. A Discovery week is a different
 * cursus over seven days rather than twenty-five, so its levels do not belong
 * on the same scale -- it is worth looking at, but on its own.
 *
 * Somebody who sat July and came back in September appears in both, so they
 * are folded together on the higher level, which is the one that says how far
 * they got.
 */
export const getPoolUsersAcross = async (
  campusName: string,
  promotions: PoolPromotion[],
  api: FortyTwoApi,
): Promise<any[]> => {
  const byStudent = new Map<number, any>();

  for (const promotion of promotions) {
    if (!promotion.isCPiscine) continue;

    const roster = await getPoolUsers(
      campusName,
      promotion.month,
      promotion.year,
      api,
      promotion.cursusId ?? undefined,
    ).catch(() => []);

    for (const student of roster) {
      const seen = byStudent.get(student.id);
      if (!seen || (student.level ?? 0) > (seen.level ?? 0)) {
        byStudent.set(student.id, student);
      }
    }
  }

  return [...byStudent.values()];
};

/**
 * Piscine levels, by student id.
 *
 * A hundred ids to a request: filter[user_id] takes a comma list, and a
 * hundred of them is a URL of some 770 characters. A failure here costs the
 * level column, not the roster.
 */
const getPoolLevels = async (
  ids: number[],
  cursusId: number,
  api: FortyTwoApi,
): Promise<Map<number, number>> => {
  const levels = new Map<number, number>();
  const CHUNK = 100;

  for (let start = 0; start < ids.length; start += CHUNK) {
    const chunk = ids.slice(start, start + CHUNK);

    try {
      const rows = await api.fetchAllPages(
        `/cursus_users?filter[cursus_id]=${cursusId}` +
          `&filter[user_id]=${chunk.join(",")}`,
        { maxPages: 2 },
      );

      for (const row of rows) {
        if (row?.user?.id) levels.set(row.user.id, row.level ?? 0);
      }
    } catch (error: any) {
      console.error("[live-campus] pool levels failed:", error.message);
    }
  }

  return levels;
};
