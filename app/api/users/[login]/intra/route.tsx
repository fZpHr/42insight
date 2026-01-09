import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { apiRateLimiter } from "@/lib/api-rate-limiter";


const intraCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; 

export async function GET(
  request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const params = await context.params;
  const login = params.login;
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
      return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
      )
  }


  const cached = intraCache.get(login);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await apiRateLimiter.fetch(`/users/${login}`);

    if (!response.ok) {

      if (response.status === 429 && cached) {
        console.warn(`[WARN] Rate limited fetching user ${login}. Serving stale cache.`);
        return NextResponse.json(cached.data);
      }
      return NextResponse.json(
        { error: `Failed to fetch from 42 API: ${response.statusText}` },
        { status: response.status },
      );
    }

    const user = await response.json();


    let allProjects: any[] = [];
    let page = 1;
    const perPage = 100;
    let projectsPage;

    do {
      const projectsResponse = await apiRateLimiter.fetch(`/users/${user.id}/projects_users?per_page=${perPage}&page=${page}`);
      if (!projectsResponse.ok) {
        if (projectsResponse.status === 429 && cached) {
          console.warn(`[WARN] Rate limited fetching projects for ${login}. Serving stale cache.`);
          return NextResponse.json(cached.data);
        }
        console.error(`Failed to fetch projects page ${page} for user ${login}: ${projectsResponse.statusText}`);
        break;
      }
      projectsPage = await projectsResponse.json();
      allProjects = allProjects.concat(projectsPage);
      page++;
    } while (projectsPage && projectsPage.length === perPage);

    user.projects_users = allProjects;


    intraCache.set(login, { data: user, timestamp: Date.now() });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error(`[FATAL ERROR] in /api/users/${login}/intra:`, error.message);
    return NextResponse.json(
      {
        error: "Failed to fetch user due to an internal server error.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
