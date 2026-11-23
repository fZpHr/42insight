import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getApi, type FortyTwoApi } from "@/lib/forty-two/api";
import { keyRequiredResponse } from "@/lib/forty-two/user-api";
import { getServerSession } from "next-auth";
import { cachedOnce } from "@/lib/memory-cache";

/**
 * What the intra view shows beside the profile itself, one part per request
 * (?part=coalition|logtime|evaluations) so each block of the page fills in
 * as soon as its own answer is back rather than when the slowest one is.
 *
 * Requests on a key are paced 600ms apart, so the count is what the visitor
 * waits on: one request per part, plus one for a coalition nobody has looked
 * at today.
 */

const CACHE_TTL = 600;

/** A coalition's name, colours and cover barely change; its score does not matter here. */
const COALITION_TTL = 60 * 60 * 24;

/** Before any student's first day: the whole logtime history, not a window. */
const LOGTIME_SINCE = "2013-01-01";

const PARTS = ["coalition", "logtime", "evaluations"] as const;
type Part = (typeof PARTS)[number];

const piece = async (api: FortyTwoApi, path: string) => {
  const response = await api.fetch(path);
  if (!response.ok) throw new Error(`42 API responded ${response.status} on ${path}`);
  return response.json();
};

const build: Record<Part, (api: FortyTwoApi, user: string) => Promise<any>> = {
  // The coalition the student scores for now: piscine and former-campus ones
  // stay on the account with nothing on them. Their memberships say which one
  // is live; the coalition itself is shared by everyone in it, so it is cached
  // once for all of them.
  coalition: async (api, user) => {
    const memberships: any[] = await piece(api, `/users/${user}/coalitions_users`);
    const live = [...memberships].sort((a, b) => b.score - a.score || b.id - a.id)[0];
    if (!live) return null;
    return cachedOnce(api, `coalition:v1:${live.coalition_id}`, COALITION_TTL, () =>
      piece(api, `/coalitions/${live.coalition_id}`),
    );
  },
  // Without begin_at 42 answers the last ten weeks or so; with one it answers
  // everything since, still in a single request (a few KB). An object of
  // { "YYYY-MM-DD": "HH:MM:SS.sss" }; demo mode answers [].
  logtime: (api, user) => piece(api, `/users/${user}/locations_stats?begin_at=${LOGTIME_SINCE}`),
  evaluations: (api, user) => piece(api, `/users/${user}/scale_teams?sort=-begin_at&page[size]=10`),
};

export async function GET(
  request: Request,
  context: { params: Promise<{ login: string }> },
) {
  const { login } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const part = new URL(request.url).searchParams.get("part") as Part;
  if (!PARTS.includes(part)) {
    return NextResponse.json({ error: "Unknown part" }, { status: 400 });
  }

  const api = await getApi();
  if (!api) return keyRequiredResponse();

  const user = encodeURIComponent(login.toLowerCase());

  try {
    const data = await cachedOnce(api, `intra-extras:v3:${part}:${user}`, CACHE_TTL, () =>
      build[part](api, user),
    );
    return NextResponse.json(data);
  } catch (error: any) {
    // Not cached on either side, so a 429 is retried rather than remembered;
    // the view shows that one block as empty meanwhile.
    console.error(`[intra-extras] ${part} failed for ${login}:`, error.message);
    return NextResponse.json({ error: `Failed to fetch ${part}` }, { status: 502 });
  }
}
