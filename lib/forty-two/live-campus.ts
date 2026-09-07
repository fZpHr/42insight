import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { Redis } from "@upstash/redis";
import type { Student } from "@/types";

/**
 * Live campus data, straight from the 42 API.
 *
 * This replaces the refresh-42 cron jobs: nothing here reads a database. What a
 * single campus-wide call can produce is served to everyone through the
 * application tokens (tier 1). What needs one call per student -- logtime above
 * all -- is built by students who bring their own API keys and lands in the
 * shared index below, so the whole campus benefits from it (tier 2).
 */

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_PASSWORD!,
});

export const CAMPUS_IDS: { [key: string]: number } = {
  Angouleme: 31,
  Nice: 41,
};

export const CURSUS_ID = 21;

/**
 * The rankings page hides the correction ratio column when it sees this value.
 * OK/KO counts need a full scale_teams scan, which no live request can afford.
 */
export const NO_CORRECTION_DATA = 420;

const PAGE_SIZE = 100;
const MAX_PAGES = 40;
const STUDENTS_TTL = 300;

export const studentsCacheKey = (campus: string) => `rankings:v1:${campus}`;
export const logtimeIndexKey = (campus: string) => `logtime:v1:${campus}`;
export const logtimeMetaKey = (campus: string) => `logtime:v1:${campus}:meta`;

export interface LogtimeIndexMeta {
  updatedAt: string;
  builtBy: string;
  covered: number;
}

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
    // Filled from the tier 2 index when a student has built it.
    activityData: {} as Student["activityData"],
    relation: null,
  };
};

const fetchCampusFromApi = async (
  campusId: number,
  campusName: string,
): Promise<Student[]> => {
  const students: Student[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await apiRateLimiter.fetch(
      `/cursus_users?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS_ID}&page[size]=${PAGE_SIZE}&page[number]=${page}`,
    );

    if (!response.ok) {
      throw new Error(`42 API responded ${response.status} on page ${page}`);
    }

    const pageData = await response.json();
    if (!Array.isArray(pageData) || pageData.length === 0) break;

    for (const cursusUser of pageData) {
      if (!cursusUser.user || cursusUser.user["staff?"]) continue;
      students.push(toStudent(cursusUser, campusName));
    }

    if (pageData.length < PAGE_SIZE) break;
  }

  return students;
};

/**
 * Tier 1: the whole campus from one paginated call, cached so that a campus
 * opening the page costs one build rather than one per visitor.
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

  const students = await fetchCampusFromApi(campusId, campusName);

  if (students.length > 0) {
    try {
      await redis.set(cacheKey, students, { ex: STUDENTS_TTL });
    } catch (error) {
      console.error("[live-campus] cache write failed:", error);
    }
  }

  return students;
};

/**
 * Tier 2: the logtime index built by students who brought their own keys.
 * Absent until someone builds it, which the pages handle by hiding the sorts
 * that depend on it.
 */
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

/**
 * Tier 1 + tier 2: the campus with whatever enriched data currently exists.
 */
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

/**
 * The piscine cursus. pool-data.js carried the promotion as a hardcoded line
 * edited by hand every year; it lives in POOL_MONTH / POOL_YEAR now so that
 * moving to the next piscine is an environment change rather than a code one.
 */
export const POOL_CURSUS_ID = 9;

const POOL_TTL = 900;

export const currentPool = () => ({
  month: (process.env.POOL_MONTH ?? "september").toLowerCase(),
  year: process.env.POOL_YEAR ?? String(new Date().getFullYear()),
});

export const getPoolUsers = async (
  campusName: string,
  month: string,
  year: string,
): Promise<any[]> => {
  const campusId = CAMPUS_IDS[campusName];
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  const cacheKey = `pool:v1:${campusName}:${month}:${year}`;

  try {
    const cached = await redis.get<any[]>(cacheKey);
    if (cached) return cached;
  } catch (error) {
    console.error("[live-campus] pool cache read failed:", error);
  }

  const poolUsers: any[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await apiRateLimiter.fetch(
      `/cursus_users?filter[campus_id]=${campusId}&filter[cursus_id]=${POOL_CURSUS_ID}&page[size]=${PAGE_SIZE}&page[number]=${page}`,
    );

    if (!response.ok) {
      throw new Error(`42 API responded ${response.status} on pool page ${page}`);
    }

    const pageData = await response.json();
    if (!Array.isArray(pageData) || pageData.length === 0) break;

    for (const cursusUser of pageData) {
      const user = cursusUser.user;
      if (!user || user["staff?"]) continue;
      if ((user.pool_month ?? "").toLowerCase() !== month) continue;
      if (String(user.pool_year) !== year) continue;

      poolUsers.push({
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
      });
    }

    if (pageData.length < PAGE_SIZE) break;
  }

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
