import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { apiRateLimiter } from "@/lib/api-rate-limiter";
import { Redis } from "@upstash/redis";
import type { Student } from "@/types";

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_PASSWORD!,
});

const campusMapping: { [key: string]: number } = {
  Angouleme: 31,
  Nice: 41,
};

const CURSUS_ID = 21;
const PAGE_SIZE = 100;
const MAX_PAGES = 40;
const CACHE_TTL = 300;

/**
 * The rankings page hides the correction ratio column when it sees this value.
 * OK/KO counts are only computable from a full scale_teams scan, far too
 * expensive to run per request, so a live fetch always flags them unavailable.
 */
const NO_CORRECTION_DATA = 420;

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

    // Only produced by the refresh-42 cron jobs, absent from a live fetch.
    correctionTotal: 0,
    correctionPositive: 0,
    correctionNegative: 0,
    correctionPercentage: NO_CORRECTION_DATA,
    activityData: {} as Student["activityData"],
    relation: null,
    work: 0,
  };
};

const fetchCampusStudents = async (
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campus_name: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campus_name } = await params;
  const campusId = campusMapping[campus_name];
  if (!campusId) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  const cacheKey = `rankings:v1:${campus_name}`;

  try {
    const cached = await redis.get<Student[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
    }
  } catch (error) {
    console.error("[rankings] cache read failed:", error);
  }

  try {
    const students = await fetchCampusStudents(campusId, campus_name);

    if (students.length > 0) {
      try {
        await redis.set(cacheKey, students, { ex: CACHE_TTL });
      } catch (error) {
        console.error("[rankings] cache write failed:", error);
      }
    }

    return NextResponse.json(students, { headers: { "X-Cache": "MISS" } });
  } catch (error: any) {
    console.error(`[rankings] failed to build ${campus_name}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch rankings from the 42 API" },
      { status: 502 },
    );
  }
}
