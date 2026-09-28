import { NextResponse } from "next/server";
import type { Student } from "@/types";
import type { FortyTwoApi } from "@/lib/forty-two/api";
import { MissingUserKeyError } from "@/lib/forty-two/user-api";
import { PARTIAL_TTL, cachedOnce } from "@/lib/memory-cache";
import {
  WORK_APPRENTICESHIP,
  WORK_PROJECT_IDS,
  classifyWorkProject,
} from "@/lib/forty-two/work-projects";

/**
 * Live campus data, straight from the 42 API, on the visitor's own key.
 *
 * This replaces the refresh-42 cron jobs: nothing here reads a database.
 *
 * A whole campus arrives in one paginated call -- a dozen or so requests, not
 * one per student -- which is what makes it affordable to fetch on demand and
 * keep in memory for a few minutes. A connected key is required to fetch it,
 * and the server keeps nothing between restarts.
 *
 * The one thing that does not fit that shape is logtime: it needs a request per
 * student, which no page load can afford. It is built by a visitor's own key
 * and stored in their browser, never here.
 *
 * What one visitor pays to load lands in the shared cache, so the next reader
 * gets it without spending anything.
 */

/**
 * Kept as a fast, no-request path for the two campuses this project started
 * on. Anything else resolves through the live directory below -- the site is
 * no longer limited to these two, now that every request runs on the
 * visitor's own key rather than a shared one with a campus-shaped quota.
 */
export const CAMPUS_IDS: { [key: string]: number } = {
  Angouleme: 31,
  Nice: 41,
};

/**
 * Campuses 42 runs but does not list.
 *
 * GET /v2/campus answers with public campuses only, and Penang is flagged
 * `public: false` -- it is missing from the list, and /v2/campus/74 answers
 * 404 on top, so from those two endpoints the campus does not appear to
 * exist. It does: /campus/74/users returns its 459 accounts,
 * /campus/74/locations its 5723 sessions, and cursus_users filtered on it the
 * 55 students in 42cursus. Every page of this site works for Penang. The only
 * thing missing was the id, so here it is.
 *
 * Found by reading a Penang student's profile: the campus object nested in
 * /v2/users/:login carries the whole record whatever the public flag says.
 * That is also the way to add the next one -- ask someone who is there.
 *
 * And there is no next one for now. Every id the public list skips, 1 to 95,
 * was probed through /campus/:id/users, which answers for a hidden campus
 * where /campus/:id does not. Eighteen came back with accounts, and Penang is
 * the only working student campus among them: thirteen are closed campuses
 * whose alumni remain (Moscow 1279, Kazan 456, Kyiv 182, Johannesburg,
 * Cluj, Bucharest, Chisinau, Cape-Town, Novosibirsk, Alicante, Antwerp,
 * Fremont, 42next), and four are 42's own internal ones, active but never
 * meant for this list (42Network 42, 42 Central 54, Forty2 66, New Vegas 78).
 * One id answered neither way: 7 returns 502 on every attempt, so it is the
 * one gap in the sweep. Its neighbours are all closed campuses.
 *
 * Merged before the live rows, so the day 42 makes one public the API wins.
 */
const UNLISTED_CAMPUSES: { [name: string]: { id: number; closed?: boolean } } = {
  Penang: { id: 74 },

  // Closed, and kept for the people who were there. 42 shut these and their
  // alumni stayed on the intra: cursus_users still answers for them, 887 at
  // Moscow and 246 at Kazan. Only these two of the thirteen closed campuses
  // are listed -- the rest have between zero and a handful of accounts in
  // 42cursus, which is a picker entry leading to an empty page.
  //
  // Their locations endpoint answers 502 rather than empty, so the cluster
  // map cannot work for them. They are marked closed and every picker but the
  // rankings leaves them out.
  Moscow: { id: 17, closed: true },
  Kazan: { id: 23, closed: true },
};

export const CURSUS_ID = 21;
export const POOL_CURSUS_ID = 9;

export interface CampusInfo {
  id: number;
  name: string;
  /**
   * Every account 42 has on record there, as reported on /campus.
   *
   * Not a student count, and not close to one: Paris reports 43225 accounts
   * against 8402 people in the main cursus. It counts piscines, alumni and
   * staff too. What it is good for is relative size -- Paris is genuinely the
   * largest and Nablus, at 2, the smallest -- so the picker shows it as what
   * it is rather than passing it off as a roster.
   */
  usersCount?: number;
  /**
   * A campus 42 has shut. Its alumni and their levels are still on the intra,
   * so a leaderboard for it reads correctly, but nothing is live there: no
   * cluster, no exams, no projects in progress. Only the rankings offer these,
   * and only when asked.
   */
  closed?: boolean;
}

interface CampusDirectory {
  byName: Map<string, number>;
  list: CampusInfo[];
  /** False when 42 would not list its campuses and this is the seed alone. */
  complete: boolean;
  expiresAt: number;
}

/** The full campus list barely ever changes, so a day's cache is cheap. */
const CAMPUS_DIRECTORY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * One directory per source, because the two number their campuses
 * differently: Nice is 36 in the demo network, and 36 at 42 is Adelaide. A
 * single directory, filled by whoever asked first after a start, sent the
 * other side to the wrong campus for a day -- Nice's rankings listing
 * Adelaide's students.
 */
const directories = new Map<FortyTwoApi["source"], CampusDirectory>();

/** A cold page load asks from every route at once: one walk answers them all. */
const directoryLoads = new Map<FortyTwoApi["source"], Promise<CampusDirectory>>();

const loadDirectory = async (api: FortyTwoApi): Promise<CampusDirectory> => {
  const known = directories.get(api.source);
  if (known && known.expiresAt > Date.now()) return known;

  let pending = directoryLoads.get(api.source);
  if (!pending) {
    pending = buildDirectory(api, known).finally(() => directoryLoads.delete(api.source));
    directoryLoads.set(api.source, pending);
  }
  return pending;
};

const buildDirectory = async (
  api: FortyTwoApi,
  previous: CampusDirectory | undefined,
): Promise<CampusDirectory> => {
  // The seed is 42's own ids, so only the live directory starts from it. The
  // demo network lists every campus it has, under numbers of its own.
  const seen = new Map<string, CampusInfo>(
    api.source === "live"
      ? [
          ...Object.entries(CAMPUS_IDS).map(
            ([name, id]) => [name, { id, name }] as [string, CampusInfo],
          ),
          ...Object.entries(UNLISTED_CAMPUSES).map(
            ([name, entry]) =>
              [name, { id: entry.id, name, closed: entry.closed }] as [string, CampusInfo],
          ),
        ]
      : [],
  );

  let complete = true;
  try {
    const rows = await api.fetchAllPages(`/campus`, { maxPages: 3 });
    for (const row of rows) {
      if (!row?.name || typeof row.id !== "number") continue;
      seen.set(row.name, {
        id: row.id,
        name: row.name,
        usersCount:
          typeof row.users_count === "number" ? row.users_count : undefined,
      });
    }
  } catch (error: any) {
    // The seed above still covers the two campuses this started on.
    console.error("[live-campus] fetching the campus directory failed:", error.message);
    complete = false;
  }

  // Either way a failure is asked again in a minute, not a day: the seed
  // alone is five campuses, and it used to stand in for the other fifty for
  // twenty-four hours after a single 429. Yesterday's list, when there is
  // one, is still the list in the meantime.
  const retryAt = Date.now() + PARTIAL_TTL * 1000;
  let directory: CampusDirectory;

  if (!complete && previous) {
    directory = { ...previous, expiresAt: retryAt };
  } else {
    const list = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    directory = {
      byName: new Map(list.map((campus) => [campus.name, campus.id])),
      list,
      complete,
      expiresAt: complete ? Date.now() + CAMPUS_DIRECTORY_TTL_MS : retryAt,
    };
  }

  directories.set(api.source, directory);
  return directory;
};

/**
 * Every campus 42 has, id and name, cached for a day.
 *
 * Throws while 42 will not list them. The seed is enough to resolve a name,
 * but a picker, a price or a page built on five campuses would be cached as if
 * they were the network.
 */
export const listCampuses = async (api: FortyTwoApi): Promise<CampusInfo[]> => {
  const directory = await loadDirectory(api);
  if (!directory.complete) throw new Error("42 did not list its campuses");
  return directory.list;
};

/** A campus's id from its name, or null when 42 has no such campus. */
export const resolveCampusId = async (
  name: string,
  api: FortyTwoApi,
): Promise<number | null> => (await loadDirectory(api)).byName.get(name) ?? null;

/**
 * How many students a campus has in a cursus, or the whole network when the
 * campus is null.
 *
 * One request: 42 reports the size of a collection in X-Total, so asking for a
 * single row is enough to learn the size of all of them. That is what makes it
 * honest to quote a price before spending it -- the Global confirmation is
 * showing a number 42 gave, not one this file remembers from a measurement
 * that has since gone stale.
 */
export const countCursusStudents = async (
  campusId: number | null,
  api: FortyTwoApi,
): Promise<number> => {
  const scope = campusId ? `&filter[campus_id]=${campusId}` : "";
  const response = await api.fetch(
    `/cursus_users?filter[cursus_id]=${CURSUS_ID}${scope}&page[size]=1`,
  );

  if (!response.ok) {
    throw new Error(`42 API responded ${response.status} counting students`);
  }

  return Number(response.headers.get("X-Total")) || 0;
};

/**
 * The rankings page hides the correction ratio column when it sees this value.
 * OK/KO counts need a full scale_teams scan, which no live request can afford.
 */
export const NO_CORRECTION_DATA = 420;

// Longer than the pages' own staleTime, so a client refetch lands on a warm
// cache instead of starting another page walk.
const STUDENTS_TTL = 900;
const POOL_TTL = 900;

const studentsCacheKey = (campus: string) => `students:${campus}`;

/**
 * How far a campus roster is allowed to walk.
 *
 * The default of forty silently cut Paris in half: 8402 students in the
 * 42cursus is 85 pages, and forty of them is 4000 with nothing to say the rest
 * existed. This used to be ninety-five, what fitted in one route's minute; the
 * walk now outlives the request (see RosterWalk), so it is only a guard against
 * one that never ends -- twice Paris. The next largest, Madrid, is twenty-six.
 */
const ROSTER_MAX_PAGES = 200;
const ROSTER_PAGE_SIZE = 100;


const daysUntil = (date: string | null): number => {
  if (!date) return 0;
  const remaining = new Date(date).getTime() - Date.now();
  return remaining <= 0 ? 0 : Math.ceil(remaining / 86_400_000);
};

/**
 * Whether an account belongs on a leaderboard.
 *
 * The staff flag alone missed accounts 42 keeps for its own purposes: Lyon's
 * `vpeople` is kind "external", not staff, and sat in the rankings at level
 * 2.61 like any student. Kinds seen on a roster are "student", "admin" and
 * "external"; a missing kind is treated as a student, since the flag is what
 * the old filter trusted.
 */
const isStudentAccount = (user: any): boolean =>
  Boolean(user) && !user["staff?"] && (user.kind ?? "student") === "student";

/** Which of those an account is, for the ones that are not students. */
const accountTypeOf = (
  user: any,
  marked: MarkedAccounts,
): Student["accountType"] => {
  if (!user) return "external";
  if (user["staff?"] || user.kind === "admin") return "staff";
  if (marked.staff.has(user.id)) return "staff";
  if (marked.tests.has(user.id)) return "test";
  if ((user.kind ?? "student") !== "student") return "external";
  return "student";
};

/**
 * The accounts 42 marks as tests, which the intra shows as a "Test account"
 * badge beside the login.
 *
 * Kind is not enough on its own: six of these sat in Lyon's rankings and one
 * in Angoulême's, all of them kind "student" with no staff flag, one as high
 * as level 16.36. The badge comes from the account's groups, and a profile's
 * groups are not in a campus listing -- reading them per student would cost a
 * request each, a campus's whole hourly budget.
 *
 * The group itself can be read from the other end, though: 787 members network
 * wide, eight pages, once a week for everyone.
 */
const TEST_ACCOUNT_GROUP_ID = 119;

/**
 * 42's own staff group, read the same way and for the same reason.
 *
 * The staff flag catches nearly all of them, but not all: of a hundred
 * members of this group sampled against /users, two -- tzeck and holly --
 * came back kind "student" with no flag set, which is to say they read as
 * ordinary students everywhere the flag is the only check. Across the group's
 * 654 members that is on the order of a dozen accounts in the leaderboards.
 */
const STAFF_GROUP_ID = 1;
const MARKED_ACCOUNTS_TTL = 7 * 24 * 60 * 60;

interface MarkedAccounts {
  tests: Set<number>;
  staff: Set<number>;
}

/**
 * Everyone in one 42 group, by user id.
 *
 * The catch is outside the cache on purpose. It used to be inside, which
 * meant a single 429 part way through eight pages -- the likeliest thing to
 * happen to a walk that long -- resolved to an empty set, and cachedOnce
 * stored *that* for the week. Every marked account was back in every
 * leaderboard until it expired, with nothing to say why. Letting the failure
 * out of the builder leaves the cache empty instead, so the next request
 * tries again, and the empty set answers this one request only.
 *
 * Only half of that held: the roster built on the empty set was itself cached
 * for a quarter of an hour. So the caller is told too (`partial`), and what it
 * builds with the gap is kept a minute.
 */
const groupMemberIds = async (
  groupId: number,
  api: FortyTwoApi,
  partial: () => void,
): Promise<Set<number>> => {
  try {
    return await cachedOnce(api, `group-members:${groupId}`, MARKED_ACCOUNTS_TTL, async () => {
      const rows = await api.fetchAllPages(`/groups/${groupId}/groups_users`, {
        maxPages: 12,
      });

      const ids = new Set<number>(
        rows
          .map((row) => row?.user_id)
          .filter((id): id is number => typeof id === "number"),
      );

      // Both groups have hundreds of members and always have. None at all
      // means the walk came back wrong rather than that the group emptied,
      // and a week of that is what this is guarding against.
      if (ids.size === 0) {
        throw new Error(`group ${groupId} returned no members`);
      }

      return ids;
    });
  } catch (error: any) {
    // A roster with a few of these in it beats no roster at all.
    console.error(`[live-campus] group ${groupId} failed:`, error.message);
    partial();
    return new Set<number>();
  }
};

const markedAccounts = async (
  api: FortyTwoApi,
  partial: () => void,
): Promise<MarkedAccounts> => {
  const [tests, staff] = await Promise.all([
    groupMemberIds(TEST_ACCOUNT_GROUP_ID, api, partial),
    groupMemberIds(STAFF_GROUP_ID, api, partial),
  ]);
  return { tests, staff };
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
    // Filled from the shared logtime index when it has been built.
    activityData: {} as Student["activityData"],
    relation: null,
  };
};

/**
 * One cursus_users row, cut down to what the roster keeps: the student as
 * every page reads them, and the three fields that say whether they are one.
 */
interface RosterRow {
  student: Student;
  user: { id: number; "staff?"?: boolean; kind?: string };
}

interface RosterPage {
  rows: RosterRow[];
  /** What 42 sent, before rows without a user were dropped. */
  size: number;
}

/**
 * A campus's page walk, kept between requests.
 *
 * Paris is 85 pages. At 600ms a request that is 51 seconds on its own, and
 * the build also reads the two marked-account groups (fifteen pages) and the
 * work status on the same key: over a minute in all. The routes are cut off
 * at sixty seconds, the walk died with the request, and the reload started
 * again from page one -- Paris never loaded at all.
 *
 * So the pages outlive the request that asked for them. A route waits on the
 * walk for ROSTER_WAIT_MS, then answers 202 with how far it got; the browser
 * asks again, and that request joins the same walk -- still running, or
 * resumed from the pages already in -- instead of starting over. Kept as long
 * as the roster itself would be.
 */
interface RosterWalk {
  pages: Map<number, Promise<RosterPage>>;
  /** Rows landed per page, for the progress a 202 reports. */
  landed: Map<number, number>;
  /** 42's X-Total for the campus, once the first page is in. */
  total: number;
  expiresAt: number;
}

const rosterWalks: Map<string, RosterWalk> = ((globalThis as any)
  .__42insightRosterWalks ??= new Map<string, RosterWalk>());

/** Per source, like the cache: the demo's Nice is not 42's. */
const walkKey = (api: FortyTwoApi, campusName: string) =>
  `${api.source}:${campusName}`;

const walkFor = (api: FortyTwoApi, campusName: string): RosterWalk => {
  const now = Date.now();
  for (const [key, walk] of rosterWalks) {
    if (walk.expiresAt <= now) rosterWalks.delete(key);
  }

  const key = walkKey(api, campusName);
  let walk = rosterWalks.get(key);
  if (!walk) {
    walk = {
      pages: new Map(),
      landed: new Map(),
      total: 0,
      expiresAt: now + STUDENTS_TTL * 1000,
    };
    rosterWalks.set(key, walk);
  }
  return walk;
};

const rosterPage = (
  walk: RosterWalk,
  campusId: number,
  campusName: string,
  page: number,
  api: FortyTwoApi,
): Promise<RosterPage> => {
  const known = walk.pages.get(page);
  if (known) return known;

  const pending = (async (): Promise<RosterPage> => {
    // sort=id: the pages of one walk can be read minutes apart, and only a
    // fixed order keeps a row from sliding onto a page already read.
    const response = await api.fetch(
      `/cursus_users?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS_ID}` +
        `&sort=id&page[size]=${ROSTER_PAGE_SIZE}&page[number]=${page}`,
    );
    if (response.status === 401) throw new MissingUserKeyError();
    if (!response.ok) {
      throw new Error(`42 API responded ${response.status} on page ${page}`);
    }

    const total = Number(response.headers.get("X-Total"));
    if (total > 0) walk.total = total;

    const body = await response.json();
    const rows: any[] = Array.isArray(body) ? body : [];
    walk.landed.set(page, rows.length);

    return {
      size: rows.length,
      rows: rows
        .filter((cursusUser) => cursusUser.user)
        .map((cursusUser) => ({
          student: toStudent(cursusUser, campusName),
          user: {
            id: cursusUser.user.id,
            "staff?": cursusUser.user["staff?"],
            kind: cursusUser.user.kind,
          },
        })),
    };
  })();

  walk.pages.set(page, pending);
  // A page that failed is asked again by the next build, not remembered.
  pending.catch(() => {
    if (walk.pages.get(page) === pending) walk.pages.delete(page);
  });
  return pending;
};

/**
 * How many pages of one walk are asked for at once.
 *
 * One after another, each page waited on 42's answer before claiming its
 * slot, so a walk went at the latency when that was over 600ms -- and a page
 * of a hundred cursus_users takes 42 about three and a half seconds. Three in
 * flight made Paris 109 seconds where the pacing allows 56. Six keep every
 * slot used; the pacing, not this, still decides how fast 42 is asked.
 */
const WALK_CONCURRENCY = 6;

const pagesInParallel = async (
  from: number,
  to: number,
  readPage: (page: number) => Promise<RosterPage>,
): Promise<RosterPage[]> => {
  const pages: RosterPage[] = [];
  let next = from;
  let failed = false;

  const worker = async () => {
    while (!failed && next <= to) {
      const page = next++;
      try {
        pages[page - from] = await readPage(page);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  await Promise.all(Array.from({ length: WALK_CONCURRENCY }, worker));
  return pages;
};

const walkRoster = async (
  campusName: string,
  campusId: number,
  api: FortyTwoApi,
): Promise<RosterRow[]> => {
  const walk = walkFor(api, campusName);
  const read = (page: number) => rosterPage(walk, campusId, campusName, page, api);

  const pages = [await read(1)];
  const lastPage = Math.min(
    ROSTER_MAX_PAGES,
    Math.max(1, Math.ceil(walk.total / ROSTER_PAGE_SIZE)),
  );
  pages.push(...(await pagesInParallel(2, lastPage, read)));

  // X-Total is from page one. A campus that grew since ends on a full page,
  // and the rows past it are read the old way, until one comes up short.
  let page = lastPage;
  while (pages[pages.length - 1].size === ROSTER_PAGE_SIZE && page < ROSTER_MAX_PAGES) {
    pages.push(await read(++page));
  }
  if (pages[pages.length - 1].size === ROSTER_PAGE_SIZE) {
    console.warn(
      `[live-campus] ${campusName} truncated at ${ROSTER_MAX_PAGES} pages ` +
        `of ${walk.total} rows`,
    );
  }

  // A row deleted mid-walk shifts the next one back onto a page already read.
  const seen = new Set<number>();
  return pages
    .flatMap(({ rows }) => rows)
    .filter(({ student }) => {
      if (seen.has(student.id)) return false;
      seen.add(student.id);
      return true;
    });
};

/**
 * How long a route waits on a roster before answering that it is still being
 * read. Well inside the routes' sixty seconds, whatever else they do after,
 * and often enough for the browser to show the walk moving.
 */
export const ROSTER_WAIT_MS = 20_000;

/** A roster not in yet. Routes answer it with rosterPendingResponse. */
export class RosterPendingError extends Error {
  constructor(
    readonly campus: string,
    readonly loaded: number,
    readonly total: number,
  ) {
    super(`${campus} is still being read: ${loaded} of ${total}`);
    this.name = "RosterPendingError";
  }
}

/**
 * 202, and how far the walk has got. lib/api-client.ts asks again on it, and
 * the walk is still going when it does.
 */
export const rosterPendingResponse = (error: RosterPendingError) =>
  NextResponse.json(
    { pending: true, campus: error.campus, loaded: error.loaded, total: error.total },
    { status: 202 },
  );

const pendingError = (api: FortyTwoApi, campusName: string) => {
  const walk = rosterWalks.get(walkKey(api, campusName));
  let loaded = 0;
  for (const size of walk?.landed.values() ?? []) loaded += size;
  return new RosterPendingError(campusName, loaded, walk?.total ?? 0);
};

/**
 * The work, or `late()` thrown once `waitMs` has passed. The work goes on
 * either way: it belongs to whoever asks next, not to this request.
 */
const withinWait = async <T>(
  work: Promise<T>,
  waitMs: number,
  late: () => Error,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(late()), Math.max(0, waitMs));
  });

  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Everyone the campus lists, students and 42's own accounts alike, each
 * tagged with what it is. Kept whole in the cache so that showing the staff
 * and test accounts costs no second walk.
 *
 * Throws RosterPendingError when the walk takes longer than `waitMs`.
 */
const getCampusRoster = async (
  campusName: string,
  api: FortyTwoApi,
  waitMs: number,
): Promise<Student[]> => {
  const startedAt = Date.now();
  const campusId = await resolveCampusId(campusName, api);
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  const build = () =>
    cachedOnce(api, studentsCacheKey(campusName), STUDENTS_TTL, async (partial) => {
      let gap = false;
      const noteGap = () => {
        gap = true;
        partial();
      };

      const [rows, work, marked] = await Promise.all([
        walkRoster(campusName, campusId, api),
        getWorkStatus(campusId, api, noteGap),
        markedAccounts(api, noteGap),
      ]);

      // A roster missing a piece is kept a minute. Its pages are kept longer,
      // so the rebuild re-reads the piece rather than the campus.
      if (!gap) rosterWalks.delete(walkKey(api, campusName));

      return rows.map(({ student, user }) => ({
        ...student,
        work: work.get(student.id) ?? 0,
        accountType: accountTypeOf(user, marked),
      }));
    });

  const late = () => pendingError(api, campusName);

  try {
    return await withinWait(build(), waitMs, late);
  } catch (error) {
    // A request that joined a walk can see it fail on another's behalf -- a
    // page lost while the instance sat frozen between two requests. The pages
    // that did land are kept, so one more build costs only what went missing.
    if (error instanceof RosterPendingError || error instanceof MissingUserKeyError) {
      throw error;
    }
    return withinWait(build(), waitMs - (Date.now() - startedAt), late);
  }
};

export interface RosterWait {
  /** How long to wait on a walk before throwing RosterPendingError. */
  waitMs?: number;
}

/**
 * The campus as every page reads it: students only.
 *
 * Staff, 42's test accounts and the odd external one sat in the rankings
 * beside real students, one of the test accounts at level 16.36.
 */
export const getCampusStudents = async (
  campusName: string,
  api: FortyTwoApi,
  { waitMs = ROSTER_WAIT_MS }: RosterWait = {},
): Promise<Student[]> =>
  (await getCampusRoster(campusName, api, waitMs)).filter(
    (student) => student.accountType === "student",
  );

/** The accounts the rankings leave out, for when somebody asks to see them. */
export const getCampusOutsiders = async (
  campusName: string,
  api: FortyTwoApi,
  { waitMs = ROSTER_WAIT_MS }: RosterWait = {},
): Promise<Student[]> =>
  (await getCampusRoster(campusName, api, waitMs)).filter(
    (student) => student.accountType !== "student",
  );

/**
 * Who is on an internship or an apprenticeship, as a student id -> work code.
 *
 * A few pages for most campuses, so it rides along with the campus build
 * rather than being a page of its own. A failure here costs the two sorts that
 * depend on it, not the rankings -- and says so, so it costs them a minute.
 *
 * Paris is seventeen: 1634 rows, apprenticeships counting one per company
 * evaluation. The cap of eight kept 800 of them, half of Paris's interns and
 * apprentices missing from those two sorts. The walk is no longer held to one
 * request's minute, so the cap is the default forty.
 */
const getWorkStatus = async (
  campusId: number,
  api: FortyTwoApi,
  partial: () => void,
): Promise<Map<number, number>> => {
  const work = new Map<number, number>();

  try {
    const rows = await api.fetchAllPages(
      `/projects_users?filter[campus]=${campusId}&filter[cursus]=${CURSUS_ID}` +
        `&filter[status]=in_progress&filter[project_id]=${WORK_PROJECT_IDS.join(",")}`,
      { maxPages: 40 },
    );

    for (const row of rows) {
      const kind = classifyWorkProject(row.project?.name ?? "");
      if (!kind || !row.user?.id) continue;
      // Apprenticeship wins: its company evaluations are separate projects, so
      // one student legitimately shows up under several of these.
      const existing = work.get(row.user.id) ?? 0;
      work.set(row.user.id, Math.max(existing, kind === WORK_APPRENTICESHIP ? 2 : 1));
    }
  } catch (error: any) {
    console.error("[live-campus] work status failed:", error.message);
    partial();
  }

  return work;
};

/**
 * Kept as the name the routes read through. Logtime used to be merged in here
 * from a shared index; it now lives in the visitor's browser, so the merge
 * happens there and this is the campus as the 42 API gives it.
 */
export const getEnrichedCampusStudents = getCampusStudents;

/**
 * The piscines a campus actually ran in a given year, and which kind each was.
 *
 * There is no guessing the months. Angouleme ran six promotions in 2026 --
 * February, April, June, July, August and September -- and a different six in
 * 2025. Paris runs neither July nor September, but May and June. A school
 * changes its months from one year to the next, so the only honest answer
 * comes from asking.
 *
 * Nor are they the same thing. Angouleme's February 2026 is a Discovery
 * Piscine: cursus 3, "Web Programming Essentials", seven days, and not one of
 * its 22 people is in the C Piscine cursus at all. September is the real one:
 * cursus 9, twenty-five days. Listed together they would be a ranking in which
 * a third of the promotions have everybody on level zero, because the level
 * being read is for a cursus they never took.
 *
 * Cost: twelve requests, one per month, each asking for five rows -- the
 * X-Total header for the size, the rows themselves for sample ids -- then one
 * request that asks which cursus those samples are in. Thirteen, fixed,
 * whatever the size of the campus. Cached a day, since a piscine that has
 * happened does not un-happen.
 */

export const POOL_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

export interface PoolPromotion {
  month: string;
  year: string;
  /** How many people 42 has on it -- an order of size, not a roster. */
  count: number;
  /** The cursus its members actually sat, when the sample agreed on one. */
  cursusId: number | null;
  cursusName: string | null;
  /** Whether that cursus is the C Piscine, as opposed to a Discovery one. */
  isCPiscine: boolean;
  /** The one a page opens on when nobody has chosen. */
  isCurrent?: boolean;
}

const PROMOTIONS_TTL = 24 * 60 * 60;

/**
 * How far back the piscine picker reaches.
 *
 * Older years thin out on their own, and not because they were quiet:
 * /campus/:id/users lists who is at the campus now, so a promotion whose
 * members have since graduated or moved away is mostly gone from it. Angouleme
 * 2021 answers three people. Six years is far enough to cover anyone still
 * around without pretending the years before that are empty.
 */
export const YEARS_BACK = 6;

/** Enough of a promotion to tell which cursus it was, without reading it all. */
const SAMPLE_PER_MONTH = 5;

/**
 * What 42 calls each cursus, and what kind it is.
 *
 * The kind is the thing worth having: "piscine" is a C Piscine (9, and the
 * Brussels and Antwerp ones), "piscine_deprecated" an older form of it,
 * "professional_training" the Discovery Piscines, and "main" the 42cursus.
 * Seventy-odd rows in one request, and they change about never.
 */
const CURSUS_TTL = 7 * 24 * 60 * 60;

interface CursusInfo {
  id: number;
  name: string;
  kind: string;
}

const listCursus = async (api: FortyTwoApi): Promise<Map<number, CursusInfo>> =>
  cachedOnce(api, "cursus-directory", CURSUS_TTL, async () => {
    const rows = await api.fetchAllPages(`/cursus`, { maxPages: 2 });

    return new Map(
      rows
        .filter((row) => typeof row?.id === "number")
        .map((row) => [
          row.id,
          { id: row.id, name: row.name ?? `Cursus ${row.id}`, kind: row.kind ?? "" },
        ]),
    );
  });

/** A C Piscine, as opposed to a Discovery week or the 42cursus itself. */
const isCPiscineKind = (kind: string) =>
  kind === "piscine" || kind === "piscine_deprecated";

/** The 42cursus, which a pisciner joins after passing and which is not a piscine. */
const isMainKind = (kind: string) =>
  kind === "main" || kind === "main_deprecated";

/**
 * Staff are excluded at 42's end, not ours, so the count matches the roster.
 *
 * Angouleme's November 2023 was one person: eliot, an admin whose pool_month
 * happens to say November 2023. The picker offered "November 2023, 1 person",
 * the roster dropped staff and came back empty, and the page said nobody was
 * there -- a promotion that never existed, offered because the count and the
 * roster disagreed about who counts.
 */
const POOL_USERS_FILTER = "&filter[staff?]=false";

const countPromotion = (
  campusId: number,
  month: string,
  year: string,
  api: FortyTwoApi,
) =>
  api.fetch(
    `/campus/${campusId}/users` +
      `?filter[pool_month]=${month}&filter[pool_year]=${encodeURIComponent(year)}` +
      POOL_USERS_FILTER +
      `&page[size]=${SAMPLE_PER_MONTH}`,
  );

export const listPoolPromotions = async (
  campusName: string,
  year: string,
  api: FortyTwoApi,
): Promise<PoolPromotion[]> => {
  const campusId = await resolveCampusId(campusName, api);
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  return cachedOnce(
    api,
    `pool-promotions:v2:${campusName}:${year}`,
    PROMOTIONS_TTL,
    async (partial) => {
      const found: { month: string; count: number; samples: number[] }[] = [];

      for (const month of POOL_MONTHS) {
        // A month that fails is not a month with no piscine, and skipping it
        // quietly meant one transient 429 could delete July 2023 -- 61 people
        // -- from the list, and the gap was then cached for a day. Retried
        // once, and a month that still will not answer fails the whole list
        // rather than being served as if it were complete.
        let response = await countPromotion(campusId, month, year, api);

        if (!response.ok) {
          response = await countPromotion(campusId, month, year, api);
        }
        if (!response.ok) {
          throw new Error(
            `42 API responded ${response.status} counting ${month} ${year}`,
          );
        }

        const count = Number(response.headers.get("X-Total")) || 0;
        if (count === 0) continue;

        const rows = await response.json();
        found.push({
          month,
          count,
          samples: (Array.isArray(rows) ? rows : [])
            .map((row: any) => row?.id)
            .filter((id: unknown): id is number => typeof id === "number"),
        });
      }

      const [cursusBySample, directory] = await Promise.all([
        getSampleCursus(found.flatMap((promotion) => promotion.samples), api, partial),
        listCursus(api),
      ]);

      const classified = found.map(({ month, count, samples }) => {
        const cursus = dominantCursus(samples, cursusBySample, directory);

        return {
          month,
          year,
          count,
          cursusId: cursus?.id ?? null,
          cursusName: cursus?.name ?? null,
          // Unclassifiable is treated as the real thing rather than hidden: a
          // promotion nobody can name is still better shown than dropped.
          isCPiscine:
            cursus === null || isCPiscineKind(directory.get(cursus.id)?.kind ?? ""),
        };
      });

      // Marked here rather than worked out again in the browser, so the page
      // opens on the same promotion the roster route would have chosen.
      const current = currentPoolPromotion(classified);

      return classified.map((promotion) => ({
        ...promotion,
        isCurrent:
          promotion.month === current?.month && promotion.year === current?.year,
      }));
    },
  );
};

/**
 * Which cursus each sampled student is in, in one request. Without it every
 * promotion reads as a C Piscine, so a failure makes the list partial.
 */
const getSampleCursus = async (
  ids: number[],
  api: FortyTwoApi,
  partial: () => void,
): Promise<Map<number, { id: number; name: string }[]>> => {
  const bySample = new Map<number, { id: number; name: string }[]>();
  if (ids.length === 0) return bySample;

  try {
    const rows = await api.fetchAllPages(
      `/cursus_users?filter[user_id]=${ids.join(",")}`,
      // Sixty sample ids, each in several cursus: three pages was not always
      // enough, and a sample with no cursus rows is a promotion classified on
      // whatever the others happened to say.
      { maxPages: 8 },
    );

    for (const row of rows) {
      const userId = row?.user?.id;
      if (typeof userId !== "number" || typeof row.cursus_id !== "number") continue;

      const seen = bySample.get(userId) ?? [];
      seen.push({ id: row.cursus_id, name: row.cursus?.name ?? `Cursus ${row.cursus_id}` });
      bySample.set(userId, seen);
    }
  } catch (error: any) {
    console.error("[live-campus] classifying piscines failed:", error.message);
    partial();
  }

  return bySample;
};

/**
 * Which piscine a promotion's samples sat.
 *
 * The 42cursus is excluded before counting, and this is the whole point.
 * A pisciner who passes joins it, so every sample from a finished promotion is
 * in both cursus 9 and cursus 21 -- five and five. Taking the most common
 * cursus outright therefore came down to a tie, and sort() being stable, to
 * whichever of the two the API happened to list first. The same promotion
 * classified differently from one fetch to the next: Angouleme July 2023 read
 * as a C Piscine with levels around nine, or as the 42cursus with levels of
 * twenty-three, where a piscine tops out near ten.
 *
 * Among what is left, a real C Piscine beats a Discovery week: somebody who
 * did both is in both, and the C Piscine is the one being asked about.
 */
const dominantCursus = (
  samples: number[],
  cursusBySample: Map<number, { id: number; name: string }[]>,
  directory: Map<number, CursusInfo>,
): { id: number; name: string } | null => {
  const tally = new Map<number, { name: string; n: number }>();

  for (const sample of samples) {
    for (const cursus of cursusBySample.get(sample) ?? []) {
      if (isMainKind(directory.get(cursus.id)?.kind ?? "")) continue;

      const seen = tally.get(cursus.id) ?? { name: cursus.name, n: 0 };
      seen.n++;
      tally.set(cursus.id, seen);
    }
  }

  const best = [...tally.entries()].sort((a, b) => {
    const aPiscine = isCPiscineKind(directory.get(a[0])?.kind ?? "");
    const bPiscine = isCPiscineKind(directory.get(b[0])?.kind ?? "");
    if (aPiscine !== bPiscine) return aPiscine ? -1 : 1;
    // Count, then id, so nothing is left for the response order to decide.
    return b[1].n - a[1].n || a[0] - b[0];
  })[0];

  return best ? { id: best[0], name: best[1].name } : null;
};

/**
 * The most recent promotion of a year that has actually begun, or null.
 *
 * Null rather than a future one: a campus whose next piscine starts in three
 * weeks has nothing to rank yet, and saying so lets the caller look at the
 * year before instead. That is what happens every January, when the new year
 * is empty and December's piscine is still running.
 */
export const currentPoolPromotion = (
  promotions: PoolPromotion[],
  now = new Date(),
): PoolPromotion | null => {
  // The C Piscine is what "the piscine" means unqualified. A Discovery week is
  // only shown when it is picked, or when a campus runs nothing else.
  const real = promotions.filter((promotion) => promotion.isCPiscine);
  const candidates = real.length > 0 ? real : promotions;

  const started = candidates.filter((promotion) => {
    const year = Number(promotion.year);
    if (year < now.getFullYear()) return true;
    if (year > now.getFullYear()) return false;
    return POOL_MONTHS.indexOf(promotion.month as any) <= now.getMonth();
  });

  return (
    [...started].sort(
      (a, b) =>
        Number(b.year) - Number(a.year) ||
        POOL_MONTHS.indexOf(b.month as any) - POOL_MONTHS.indexOf(a.month as any),
    )[0] ?? null
  );
};

/**
 * Which piscine a request is about: the one asked for, else the current one.
 *
 * Replaces a currentPool() that read POOL_MONTH/POOL_YEAR from the environment
 * and fell back to the literal string "september". Nobody had set those, so
 * every piscine page assumed September -- right at Nice by luck, wrong at
 * Angouleme five months out of six, and wrong at Paris always.
 */
export const resolvePoolPromotion = async (
  campusName: string,
  api: FortyTwoApi,
  asked: { month?: string | null; year?: string | null } = {},
): Promise<PoolPromotion | null> => {
  const month = asked.month?.toLowerCase();

  // Even a promotion named outright is looked up rather than taken at face
  // value: which cursus it was decides which levels to read, and a Discovery
  // Piscine's members have none in the C Piscine.
  if (month) {
    const year = asked.year ?? String(new Date().getFullYear());
    const promotions = await listPoolPromotions(campusName, year, api);

    return (
      promotions.find((promotion) => promotion.month === month) ?? {
        month,
        year,
        count: 0,
        cursusId: null,
        cursusName: null,
        isCPiscine: true,
      }
    );
  }

  // Walk back until a year has a piscine that has begun. On the second of
  // January the current year has none, and December's is still running.
  const thisYear = Number(asked.year ?? new Date().getFullYear());

  for (let year = thisYear; year > thisYear - YEARS_BACK; year--) {
    const current = currentPoolPromotion(
      await listPoolPromotions(campusName, String(year), api),
    );
    if (current) return current;
  }

  return null;
};

/**
 * The piscine roster for one campus and one promotion.
 *
 * This used to walk every cursus_users row the campus has ever had for the
 * piscine cursus and then keep the ones whose pool_month matched -- 12 pages at
 * Nice, 81 at Paris, to end up with a hundred people. Worse, fetchAllPages
 * stops at 40 pages, so Paris's 8087 rows were read half way and the promotion
 * being asked for could sit entirely in the half never read.
 *
 * /campus/:id/users filters on pool_month and pool_year directly, which is
 * exact -- checked against the live API, every row it returns conforms, and
 * Paris correctly answers zero for a promotion it never ran. What it does not
 * carry is the cursus level, so the ids come back in a second request that asks
 * cursus_users for exactly those users. Nice: four requests rather than twelve
 * pages.
 */
export const getPoolUsers = async (
  campusName: string,
  month: string,
  year: string,
  api: FortyTwoApi,
  /** The cursus this promotion sat, when it is known to not be the C Piscine. */
  cursusId: number = POOL_CURSUS_ID,
): Promise<any[]> => {
  const campusId = await resolveCampusId(campusName, api);
  if (!campusId) throw new Error(`Unknown campus: ${campusName}`);

  const cacheKey = `pool:${campusName}:${month}:${year}:${cursusId}`;

  return cachedOnce(api, cacheKey, POOL_TTL, async (partial) => {
    const users = await api.fetchAllPages(
      `/campus/${campusId}/users` +
        `?filter[pool_month]=${encodeURIComponent(month)}` +
        `&filter[pool_year]=${encodeURIComponent(year)}` +
        POOL_USERS_FILTER,
    );

    // Belt and braces: the filter above is what makes the count agree with the
    // roster, and this makes a filter 42 might one day stop honouring harmless.
    const marked = await markedAccounts(api, partial);
    const pisciners = users.filter(
      (user) =>
        isStudentAccount(user) &&
        !marked.tests.has(user.id) &&
        !marked.staff.has(user.id),
    );
    if (pisciners.length === 0) return [];

    const levels = await getPoolLevels(
      pisciners.map((user) => user.id),
      cursusId,
      api,
      partial,
    );

    return pisciners.map((user) => ({
      id: user.id,
      name: user.login,
      firstName: user.first_name ?? "",
      level: levels.get(user.id) ?? 0,
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
    }));
  });
};

/**
 * Several promotions at once, for a ranking across a year or across the lot.
 *
 * Only C Piscine promotions are gathered. A Discovery week is a different
 * cursus over seven days rather than twenty-five, so its levels do not belong
 * on the same scale -- it is worth looking at, but on its own.
 *
 * Somebody who sat July and came back in September appears in both, so they
 * are folded together on the higher level, which is the one that says how far
 * they got.
 */
export const getPoolUsersAcross = async (
  campusName: string,
  promotions: PoolPromotion[],
  api: FortyTwoApi,
): Promise<any[]> => {
  const byStudent = new Map<number, any>();

  for (const promotion of promotions) {
    if (!promotion.isCPiscine) continue;

    const roster = await getPoolUsers(
      campusName,
      promotion.month,
      promotion.year,
      api,
      promotion.cursusId ?? undefined,
    ).catch((error: any) => {
      // Named, not swallowed: a promotion that fails to load leaves a gap in a
      // ranking that otherwise looks complete.
      console.error(
        `[live-campus] ${promotion.month} ${promotion.year} missing from the ` +
          `combined ranking: ${error.message}`,
      );
      return [];
    });

    for (const student of roster) {
      const seen = byStudent.get(student.id);
      if (!seen || (student.level ?? 0) > (seen.level ?? 0)) {
        byStudent.set(student.id, student);
      }
    }
  }

  return [...byStudent.values()];
};

/**
 * Piscine levels, by student id.
 *
 * A hundred ids to a request: filter[user_id] takes a comma list, and a
 * hundred of them is a URL of some 770 characters. A failure here costs the
 * level column, not the roster -- for a minute, since it says so.
 */
const getPoolLevels = async (
  ids: number[],
  cursusId: number,
  api: FortyTwoApi,
  partial: () => void,
): Promise<Map<number, number>> => {
  const levels = new Map<number, number>();
  const CHUNK = 100;

  for (let start = 0; start < ids.length; start += CHUNK) {
    const chunk = ids.slice(start, start + CHUNK);

    try {
      const rows = await api.fetchAllPages(
        `/cursus_users?filter[cursus_id]=${cursusId}` +
          `&filter[user_id]=${chunk.join(",")}`,
        { maxPages: 2 },
      );

      for (const row of rows) {
        if (row?.user?.id) levels.set(row.user.id, row.level ?? 0);
      }
    } catch (error: any) {
      console.error("[live-campus] pool levels failed:", error.message);
      partial();
    }
  }

  return levels;
};
