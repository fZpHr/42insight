import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { CAMPUS_IDS, getCampusStudents } from "@/lib/forty-two/live-campus";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * Live exam results.
 *
 * This used to read a Redis key that the retired cron filled, and has answered
 * an empty list ever since. It turns out to be recoverable in two calls: the
 * campus's exams name the projects they are sat on, and those project ids give
 * everyone's mark.
 *
 *   GET /v2/campus/:id/exams        -> "Exam stud 3h", projects 1320..2712
 *   GET /v2/projects_users?...      -> login, final_mark, updated_at
 *
 * Both were checked against a live key before being relied on, which is how
 * the project ids were found rather than guessed.
 *
 * Avatars come from the campus list already in memory, since projects_users
 * carries only an id and a login.
 */

const CACHE_TTL = 120;
/** An exam sat today, give or take the day either side of midnight. */
const WINDOW_DAYS = 1;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  const requested = new URL(request.url).searchParams.get("campus");
  const campuses = Object.entries(CAMPUS_IDS).filter(
    ([name]) => !requested || name === requested,
  );

  try {
    const results = await cachedOnce(
      `current-exam:${requested ?? "all"}`,
      CACHE_TTL,
      async () => {
        const now = new Date();
        const from = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
        const to = new Date(now.getTime() + WINDOW_DAYS * 86_400_000);
        const students: any[] = [];

        for (const [campusName, campusId] of campuses) {
          const exams = await api.fetchAllPages(
            `/campus/${campusId}/exams?range[begin_at]=${from.toISOString()},${to.toISOString()}`,
            { maxPages: 2 },
          );
          if (exams.length === 0) continue;

          const projectIds = [
            ...new Set(
              exams.flatMap((exam: any) =>
                (exam.projects ?? []).map((project: any) => project.id),
              ),
            ),
          ];
          if (projectIds.length === 0) continue;

          const photos = new Map<number, string>();
          for (const student of await getCampusStudents(campusName, api).catch(
            () => [],
          )) {
            photos.set(student.id, student.photoUrl);
          }

          const rows = await api.fetchAllPages(
            `/projects_users?filter[campus]=${campusId}` +
              `&filter[project_id]=${projectIds.join(",")}` +
              `&range[updated_at]=${from.toISOString()},${to.toISOString()}`,
            { maxPages: 5 },
          );

          for (const row of rows) {
            if (!row.user?.id) continue;

            students.push({
              id: row.user.id,
              name: row.user.login,
              photo: photos.get(row.user.id) ?? "",
              grade: row.final_mark ?? 0,
              lastUpdate: row.updated_at,
              examId: String(row.project?.id ?? ""),
              examName: row.project?.name ?? "",
              occurence: row.occurrence ?? 0,
              isToday: row.updated_at
                ? isSameDay(new Date(row.updated_at), now)
                : false,
              campus: campusName,
            });
          }
        }

        return students;
      },
    );

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("[current_exam] failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch exam results from the 42 API" },
      { status: 502 },
    );
  }
}
