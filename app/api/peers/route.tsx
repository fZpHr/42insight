import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { cachedOnce } from "@/lib/memory-cache";
import { CAMPUS_IDS, getCampusStudents } from "@/lib/forty-two/live-campus";
import type { Project, ProjectSubscriber } from "@/types";

/**
 * Who is currently on which project, live.
 *
 * This replaces the refresh_peers cron: one paginated projects_users call per
 * campus filtered on in-progress teams, grouped by project. Avatars are filled
 * from the cached campus list, since the nested user of projects_users carries
 * only an id and a login.
 */

const CACHE_TTL = 600;
const CACHE_KEY = "peers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { api } = await getApi();

  try {
    const result = await cachedOnce(CACHE_KEY, CACHE_TTL, async () => {
    const projects = new Map<number, Project>();
    const photos = new Map<number, string>();

    for (const [campusName, campusId] of Object.entries(CAMPUS_IDS)) {
      const students = await getCampusStudents(campusName, api).catch(() => []);
      for (const student of students) photos.set(student.id, student.photoUrl);

      const projectUsers = await api.fetchAllPages(
        `/projects_users?filter[campus_id]=${campusId}&filter[status]=in_progress`,
        { maxPages: 30 },
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
        };

        projects.get(project.id)!.subscribers.push(subscriber);
      }
    }

      return [...projects.values()];
    });

    return NextResponse.json(result);
  } catch (error: any) {

    console.error("[peers] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch peers from the 42 API" },
      { status: 502 },
    );
  }
}
