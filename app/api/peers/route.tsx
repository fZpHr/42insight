import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { cachedOnce } from "@/lib/memory-cache";
import { listCampuses, CURSUS_ID, getCampusStudents } from "@/lib/forty-two/live-campus";
import { PEER_PROJECT_IDS } from "@/lib/forty-two/peer-projects";
import type { Project, ProjectSubscriber } from "@/types";

/**
 * Who is currently on which project, live.
 *
 * This replaces the refresh_peers cron: one paginated projects_users call per
 * campus filtered on in-progress teams, grouped by project. Avatars are filled
 * from the cached campus list, since the nested user of projects_users carries
 * only an id and a login.
 */

// A cold campus roster walk plus the projects_users page walk can run past
// Vercel's default function timeout.
export const maxDuration = 60;

const CACHE_TTL = 600;

/**
 * How far back a registration still counts as someone to pair with.
 *
 * 42's "in_progress" means registered and never closed, not being worked on:
 * one student on this campus has Born2beroot open since May 2021, alongside
 * fourteen other projects. Without a window the page lists five-year-old
 * abandonments as peers. Six months keeps anyone plausibly still at it --
 * 2329 open registrations at Nice, 635 of them touched since.
 */
const ACTIVE_WINDOW_DAYS = 180;
const CACHE_KEY = "peers";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  // One campus, not every campus. The page filters on the selected one
  // anyway, so walking the others threw away half of a very expensive fetch.
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("campus");
  const allCampuses = await listCampuses(api);
  const campuses = allCampuses
    .filter((campus) => !requested || campus.name === requested)
    .map((campus): [string, number] => [campus.name, campus.id]);

  if (campuses.length === 0) {
    return NextResponse.json({ error: "Campus not found" }, { status: 404 });
  }

  // Everyone in progress on every listed project is the expensive default --
  // nine pages a campus. A visitor who wants one project (to pair with a
  // group they can already see, say) should not pay for the other 819 rows.
  const requestedProject = searchParams.get("project");
  if (requestedProject && !PEER_PROJECT_IDS.includes(Number(requestedProject))) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }
  const projectIds = requestedProject
    ? [Number(requestedProject)]
    : PEER_PROJECT_IDS;

  try {
    const result = await cachedOnce(
      `${CACHE_KEY}:${requested ?? "all"}:${requestedProject ?? "all"}`,
      CACHE_TTL,
      async () => {
    const projects = new Map<number, Project>();
    const photos = new Map<number, string>();

    for (const [campusName, campusId] of campuses) {
      const students = await getCampusStudents(campusName, api).catch(() => []);
      for (const student of students) photos.set(student.id, student.photoUrl);

      // filter[campus], not filter[campus_id]: the latter is not a filterable
      // attribute on projects_users and 42 answers 400. Written without the
      // filter[] wrapper it is accepted and silently ignored, which returns
      // every in-progress project on the network -- worse than the error.
      //
      // filter[project_id] takes a list, and narrowing it to the projects this
      // page actually lists takes Nice from 2329 rows to 820: nine pages
      // instead of twenty-four, for exactly the same screen.
      const since = new Date(
        Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000,
      ).toISOString();

      const projectUsers = await api.fetchAllPages(
        `/projects_users?filter[campus]=${campusId}&filter[cursus]=${CURSUS_ID}` +
          `&filter[status]=in_progress&filter[project_id]=${projectIds.join(",")}` +
          `&range[updated_at]=${since},${new Date().toISOString()}`,
        { maxPages: 15 },
      );

      for (const projectUser of projectUsers) {
        const project = projectUser.project;
        const user = projectUser.user;
        if (!project || !user) continue;

        if (!projects.has(project.id)) {
          projects.set(project.id, {
            id: project.id,
            name: project.name,
            subscribers: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        const subscriber: ProjectSubscriber = {
          userId: user.id,
          login: user.login,
          photoUrl: photos.get(user.id) ?? null,
          validated: projectUser["validated?"] ?? null,
          status: projectUser.status,
          campus: campusName,
          updatedAt: projectUser.updated_at ?? null,
        };

        projects.get(project.id)!.subscribers.push(subscriber);
      }
    }

      return [...projects.values()];
      },
    );

    return NextResponse.json(result);
  } catch (error: any) {

    console.error("[peers] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch peers from the 42 API" },
      { status: 502 },
    );
  }
}
