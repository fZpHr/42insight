import type { Student } from "@/types";
import type { FortyTwoApi } from "@/lib/forty-two/api";
import { cachedOnce } from "@/lib/memory-cache";
import {
  WORK_APPRENTICESHIP,
  WORK_PROJECT_IDS,
  classifyWorkProject,
} from "@/lib/forty-two/work-projects";

/**
 * Live campus data, straight from the 42 API, on the site's own keys.
 *
 * This replaces the refresh-42 cron jobs: nothing here reads a database.
 *
 * A whole campus arrives in one paginated call -- a dozen or so requests, not
 * one per student -- which is what makes it affordable to fetch on demand and
 * keep in memory for a few minutes. No visitor needs a key of their own to
 * read it, and the server keeps nothing between restarts.
 *
 * The one thing that does not fit that shape is logtime: it needs a request per
 * student, which no page load can afford. It is built by a visitor's own key
 * and stored in their browser, never here.
 *
 * The fetching runs on the visitor's own key -- the site's credentials are for
 * signing in and nothing else. What one visitor pays to load lands in the
 * shared cache, so the next reader gets it without spending anything.
 */

export const CAMPUS_IDS: { [key: string]: number } = {
  Angouleme: 31,
  Nice: 41,
};

export const CURSUS_ID = 21;
export const POOL_CURSUS_ID = 9;

/**
 * The rankings page hides the correction ratio column when it sees this value.
 * OK/KO counts need a full scale_teams scan, which no live request can afford.
 */
export const NO_CORRECTION_DATA = 420;

const STUDENTS_TTL = 300;
const POOL_TTL = 900;

const studentsCacheKey = (campus: string) => `students:${campus}`;

/**
 * The piscine promotion, which pool-data.js carried as a hardcoded line edited
 * by hand every year.
 */
export const currentPool = () => ({
  month: (process.env.POOL_MONTH ?? "september").toLowerCase(),
  year: process.env.POOL_YEAR ?? String(new Date().getFullYear()),
});

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
  const campusId = CAMPUS_IDS[campusName];
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

export const getPoolUsers = async (
  campusName: string,
  month: string,
  year: string,
  api: FortyTwoApi,
): Promise<any[]> => {
  const campusId = CAMPUS_IDS[campusName];
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  const cacheKey = `pool:${campusName}:${month}:${year}`;

  return cachedOnce(cacheKey, POOL_TTL, async () => {
  const cursusUsers = await api.fetchAllPages(
    `/cursus_users?filter[campus_id]=${campusId}&filter[cursus_id]=${POOL_CURSUS_ID}`,
  );

  const poolUsers = cursusUsers
    .filter((cursusUser) => {
      const user = cursusUser.user;
      if (!user || user["staff?"]) return false;
      if ((user.pool_month ?? "").toLowerCase() !== month) return false;
      return String(user.pool_year) === year;
    })
    .map((cursusUser) => {
      const user = cursusUser.user;
      return {
        id: user.id,
        name: user.login,
        firstName: user.first_name ?? "",
        level: cursusUser.level ?? 0,
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
      };
    });

    return poolUsers;
  });
};
