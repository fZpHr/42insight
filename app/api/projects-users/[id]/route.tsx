import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { getServerSession } from "next-auth";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * One attempt history at one project, for the intra view's project dialog:
 * every team the student was in for it (one per retry) with its members and
 * mark, and every evaluation those teams went through. Two 42 requests, on
 * the visitor's key -- the evaluations of all the teams come back in one.
 */

const CACHE_TTL = 600;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  try {
    const details = await cachedOnce(api, `projects-user:v1:${id}`, CACHE_TTL, async (partial) => {
      const response = await api.fetch(`/projects_users/${id}`);
      if (response.status === 404) throw new Error("not_found");
      if (!response.ok) throw new Error(`42 API responded ${response.status}`);
      const projectsUser = await response.json();

      const teamIds = (projectsUser.teams ?? []).map((team: any) => team.id);
      let evaluations: any[] = [];
      if (teamIds.length) {
        const evalResponse = await api.fetch(
          `/scale_teams?filter[team_id]=${teamIds.join(",")}&sort=-begin_at&page[size]=100`,
        );
        if (evalResponse.ok) {
          evaluations = await evalResponse.json();
        } else {
          // The teams are still worth showing without their evaluations.
          console.error(`[projects-user] ${id}: evaluations answered ${evalResponse.status}`);
          partial();
        }
      }

      return { ...projectsUser, evaluations };
    });

    return NextResponse.json(details);
  } catch (error: any) {
    if (error.message === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(`[projects-user] failed for ${id}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch project from the 42 API" },
      { status: 502 },
    );
  }
}
