/**
 * The 42 API, answered from the invented network next door.
 *
 * This is the whole of demo mode on the server. Every route in the site asks
 * getApi() for a client and then talks to it as if it were the intra, so
 * standing in here means the caches, the transforms, the rankings, the RNCP
 * simulator and the cluster map all run their real code paths against made-up
 * rows. No route knows the difference, and none of them had to be touched.
 *
 * It answers the endpoints this site actually calls and 404s the rest, which
 * is deliberate: a page reaching for something not covered should look broken
 * in development rather than quietly show an empty list forever.
 */
import type { FortyTwoApi } from "@/lib/forty-two/api";
import {
  DEMO_CAMPUSES,
  demoCampusById,
  demoCampusPayload,
  demoCursusUserPayload,
  demoEveryone,
  demoLocations,
  demoRoster,
  demoStudentById,
  demoStudentByLogin,
  demoUserPayload,
  demoUserSummary,
  type DemoStudent,
} from "@/lib/forty-two/demo/world";

const json = (body: unknown, total?: number): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...(total === undefined ? {} : { "X-Total": String(total) }),
      // The demo network has no quota to spend, and the status bar reads these.
      "X-Hourly-Ratelimit-Limit": "3600",
      "X-Hourly-Ratelimit-Remaining": "3600",
    },
  });

const notFound = () =>
  new Response(JSON.stringify({ error: "not covered by demo mode" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });

/** One page of a list, the way 42 pages one. */
const paged = <T>(rows: T[], params: URLSearchParams): Response => {
  const size = Number(params.get("page[size]")) || 30;
  const number = Number(params.get("page[number]")) || 1;
  const from = (number - 1) * size;
  return json(rows.slice(from, from + size), rows.length);
};

const idsFrom = (raw: string | null): number[] =>
  (raw ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

const sortRows = (rows: DemoStudent[], sort: string | null): DemoStudent[] => {
  if (!sort) return rows;
  const descending = sort.startsWith("-");
  const key = descending ? sort.slice(1) : sort;
  if (key !== "level") return rows;
  const ordered = [...rows].sort((a, b) => a.level - b.level);
  return descending ? ordered.reverse() : ordered;
};

const route = (path: string, params: URLSearchParams): Response => {
  /* ----------------------------------------------------------- cursus_users */
  if (path === "/cursus_users") {
    const campusId = Number(params.get("filter[campus_id]"));
    const userIds = idsFrom(params.get("filter[user_id]"));

    let rows: DemoStudent[];
    if (userIds.length > 0) {
      rows = userIds
        .map((id) => demoStudentById(id))
        .filter((student): student is DemoStudent => Boolean(student));
    } else if (campusId) {
      const campus = demoCampusById(campusId);
      rows = campus ? demoRoster(campus) : [];
    } else {
      rows = demoEveryone();
    }

    return paged(
      sortRows(rows, params.get("sort")).map((student) =>
        demoCursusUserPayload(student),
      ),
      params,
    );
  }

  /* ------------------------------------------------------------------ users */
  if (path === "/users") {
    const ids = idsFrom(params.get("filter[id]"));
    const rows = ids
      .map((id) => demoStudentById(id))
      .filter((student): student is DemoStudent => Boolean(student))
      .map((student) => demoUserSummary(student));
    return paged(rows, params);
  }

  const user = path.match(/^\/users\/([^/]+)$/);
  if (user) {
    const student =
      demoStudentByLogin(decodeURIComponent(user[1])) ??
      demoStudentById(Number(user[1]));
    return student ? json(demoUserPayload(student)) : notFound();
  }

  const userSub = path.match(/^\/users\/([^/]+)\/(.+)$/);
  if (userSub) {
    const student =
      demoStudentByLogin(decodeURIComponent(userSub[1])) ??
      demoStudentById(Number(userSub[1]));
    if (!student) return notFound();

    switch (userSub[2]) {
      case "projects_users":
        return paged(demoUserPayload(student).projects_users, params);
      // A demo has no correction history to replay, and every page that reads
      // these treats an empty list as "not enough to say", which is true here.
      case "scale_teams/as_corrector":
      case "events":
      case "locations_stats":
      case "coalitions":
        return paged([], params);
      default:
        return notFound();
    }
  }

  /* ---------------------------------------------------------------- campus */
  if (path === "/campus") {
    return paged(DEMO_CAMPUSES.map(demoCampusPayload), params);
  }

  const campusSub = path.match(/^\/campus\/(\d+)\/(.+)$/);
  if (campusSub) {
    const campus = demoCampusById(Number(campusSub[1]));
    if (!campus) return notFound();

    switch (campusSub[2]) {
      case "locations":
        return paged(demoLocations(campus), params);
      case "users":
        return paged(demoRoster(campus).map(demoUserSummary), params);
      case "events":
        return paged([], params);
      default:
        return notFound();
    }
  }

  /* -------------------------------------------------------- everything else */
  // Groups and blocs exist to filter accounts out and to name coalitions. An
  // invented network has neither, but the caller reads an empty group as a
  // failed walk rather than an empty one -- rightly, since 42's have hundreds
  // of members -- so this answers with one row belonging to nobody in any
  // roster. Nothing is filtered, and nothing looks broken.
  if (/^\/groups\/\d+\/groups_users$/.test(path)) {
    return paged([{ id: 1, user_id: 1, group_id: 1 }], params);
  }
  if (path === "/blocs") return paged([], params);
  if (path === "/cursus") return paged([], params);

  return notFound();
};

/**
 * The client demo mode hands out. Same two methods as the real one, so it
 * drops into getApi() without anything downstream noticing.
 */
export const demoApi = (): FortyTwoApi => ({
  async fetch(path: string): Promise<Response> {
    const [pathname, query = ""] = path.split("?");
    return route(pathname, new URLSearchParams(query));
  },

  async fetchAllPages(path, options = {}) {
    const pageSize = options.pageSize ?? 100;
    const maxPages = options.maxPages ?? 40;
    const separator = path.includes("?") ? "&" : "?";
    const collected: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const response = await this.fetch(
        `${path}${separator}page[size]=${pageSize}&page[number]=${page}`,
      );
      if (!response.ok) break;

      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) break;

      collected.push(...rows);
      await options.onProgress?.(collected.length, collected.length);
      if (rows.length < pageSize) break;
    }

    return collected;
  },
});
