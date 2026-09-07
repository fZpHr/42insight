import type { Student } from "@/types";
import { redis } from "@/lib/redis";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { clearProgress, setProgress } from "@/lib/forty-two/progress";

/**
 * Live campus data, straight from the 42 API, on the site's own keys.
 *
 * This replaces the refresh-42 cron jobs: nothing here reads a database.
 *
 * A whole campus arrives in one paginated call -- a dozen or so requests, not
 * one per student -- which is what keeps it in tier 1. The result is cached and
 * shared, so the cost is a page walk every few minutes however many people are
 * looking, and no visitor needs a key of their own to read it.
 *
 * The one thing that does not fit that shape is logtime: it needs a request per
 * student, so it is built in tier 2 by visitors who bring their own key, and
 * merged in here from the shared index.
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

export const studentsCacheKey = (campus: string) => `rankings:v2:${campus}`;
export const logtimeIndexKey = (campus: string) => `logtime:v1:${campus}`;
export const logtimeMetaKey = (campus: string) => `logtime:v1:${campus}:meta`;

export interface LogtimeIndexMeta {
  updatedAt: string;
  builtBy: string;
  covered: number;
}

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
): Promise<Student[]> => {
  const campusId = CAMPUS_IDS[campusName];
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  const cacheKey = studentsCacheKey(campusName);

  try {
    const cached = await redis.get<Student[]>(cacheKey);
    if (cached) return cached;
  } catch (error) {
    console.error("[live-campus] cache read failed:", error);
  }

  const cursusUsers = await apiRateLimiter.fetchAllPages(
    `/cursus_users?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS_ID}`,
    {
      onProgress: (done, total) =>
        setProgress(`campus:${campusName}`, {
          phase: `Fetching ${campusName} students from the 42 API`,
          done,
          total,
        }),
    },
  );

  await clearProgress(`campus:${campusName}`);

  const students = cursusUsers
    .filter((cursusUser) => cursusUser.user && !cursusUser.user["staff?"])
    .map((cursusUser) => toStudent(cursusUser, campusName));

  if (students.length > 0) {
    try {
      await redis.set(cacheKey, students, { ex: STUDENTS_TTL });
    } catch (error) {
      console.error("[live-campus] cache write failed:", error);
    }
  }

  return students;
};

export const getLogtimeIndex = async (
  campusName: string,
): Promise<Record<string, any>> => {
  try {
    // A hash rather than one JSON blob, so chunks of a build append to the
    // index instead of racing each other through a read-modify-write.
    const index = await redis.hgetall<Record<string, any>>(
      logtimeIndexKey(campusName),
    );
    return index ?? {};
  } catch (error) {
    console.error("[live-campus] logtime index read failed:", error);
    return {};
  }
};

export const getLogtimeMeta = async (
  campusName: string,
): Promise<LogtimeIndexMeta | null> => {
  try {
    return await redis.get<LogtimeIndexMeta>(logtimeMetaKey(campusName));
  } catch (error) {
    console.error("[live-campus] logtime meta read failed:", error);
    return null;
  }
};

export const getEnrichedCampusStudents = async (
  campusName: string,
): Promise<Student[]> => {
  const [students, logtimeIndex] = await Promise.all([
    getCampusStudents(campusName),
    getLogtimeIndex(campusName),
  ]);

  if (Object.keys(logtimeIndex).length === 0) return students;

  return students.map((student) => {
    const logtime = logtimeIndex[String(student.id)];
    if (!logtime) return student;

    return {
      ...student,
      activityData: { logtime } as unknown as Student["activityData"],
    };
  });
};

export const getPoolUsers = async (
  campusName: string,
  month: string,
  year: string,
): Promise<any[]> => {
  const campusId = CAMPUS_IDS[campusName];
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  const cacheKey = `pool:v2:${campusName}:${month}:${year}`;

  try {
    const cached = await redis.get<any[]>(cacheKey);
    if (cached) return cached;
  } catch (error) {
    console.error("[live-campus] pool cache read failed:", error);
  }

  const cursusUsers = await apiRateLimiter.fetchAllPages(
    `/cursus_users?filter[campus_id]=${campusId}&filter[cursus_id]=${POOL_CURSUS_ID}`,
    {
      onProgress: (done, total) =>
        setProgress(`pool:${campusName}`, {
          phase: `Fetching the ${campusName} piscine from the 42 API`,
          done,
          total,
        }),
    },
  );

  await clearProgress(`pool:${campusName}`);

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

  if (poolUsers.length > 0) {
    try {
      await redis.set(cacheKey, poolUsers, { ex: POOL_TTL });
    } catch (error) {
      console.error("[live-campus] pool cache write failed:", error);
    }
  }

  return poolUsers;
};

export { redis };
