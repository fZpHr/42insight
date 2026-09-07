import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  CAMPUS_IDS,
  getCampusStudents,
  redis,
} from "@/lib/forty-two/live-campus";
import {
  getUserApi,
  keyRequiredResponse,
  MissingUserKeyError,
} from "@/lib/forty-two/user-api";
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
const CACHE_KEY = "peers:v2";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cached = await redis.get<Project[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  } catch (error) {
    console.error("[peers] cache read failed:", error);
  }

  try {
    const api = await getUserApi();
    if (!api) throw new MissingUserKeyError();

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

    const result = [...projects.values()];

    if (result.length > 0) {
      try {
        await redis.set(CACHE_KEY, result, { ex: CACHE_TTL });
      } catch (error) {
        console.error("[peers] cache write failed:", error);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof MissingUserKeyError) return keyRequiredResponse();

    console.error("[peers] failed to build:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch peers from the 42 API" },
      { status: 502 },
    );
  }
}
