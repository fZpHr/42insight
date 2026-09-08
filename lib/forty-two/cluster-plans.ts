import type { FortyTwoApi } from "@/lib/forty-two/api";
import {
  hasVendoredPlan,
  hostsIn,
  loadVendoredPlan,
} from "@/lib/forty-two/vendored-plans";

/**
 * Where a campus floor plan comes from.
 *
 * Two sources, in this order. Twenty-five campuses have a real seat-by-seat
 * layout in vendor/42-cluster-maps, drawn by the people who work there and
 * exact where it is current -- 144 of 144 workstations at Nice. The rest, and
 * any campus whose vendored map has aged out, get one worked out from the
 * workstation names.
 *
 * 42 has a /v2/clusters endpoint and it is not available to us: it answers 403
 * to an application holding the `public` scope, which is the only scope
 * client_credentials will grant, so no key a student can register will ever
 * reach it. The seat-by-seat maps in (maps)/ were therefore drawn by hand, and
 * only ever for Angouleme and Nice.
 *
 * The names give it away instead. A host is `<cluster>r<row><p|s><seat>` on
 * nearly every campus -- c1r1p1 at Nice, f2r10s6 at Paris, c3r4s1 at Tokyo --
 * which is a coordinate, not a label. Reading a few pages of locations gives
 * the occupied hosts, and their coordinates give the shape of the room.
 *
 * Measured against Nice, whose hand-drawn map has 144 workstations: six pages
 * of locations name 141 of them, all parsing cleanly. Angouleme is the one
 * campus that does not play along (its hosts are "1A1"), and it is also one of
 * the two with a real map, so nothing is lost.
 *
 * Two things it cannot know. Which cells are floor rather than desk: a row seen
 * with seats 1 and 9 is drawn nine wide, and the gap may be a pillar or may be
 * a machine nobody has logged into lately. And how the room is really arranged:
 * seats go left to right in numeric order here, where Nice's drawn map has them
 * running the other way. It is a seating chart, not architecture -- which is
 * what the other 52 campuses get instead of nothing.
 */

/** `c1r2p3`, `f2r10s6`: cluster, row, seat. */
const HOST_PATTERN = /^([a-z]+\d+)r(\d+)[ps](\d+)$/i;

/** Same shape as the hand-drawn maps: "W:<host>", "T:<label>", or a gap. */
export type FloorPlan = Record<string, (string | null)[][]>;

export interface DerivedPlan {
  plan: FloorPlan;
  /** Distinct hosts the plan was built from, for the page to report honestly. */
  hostCount: number;
}

/**
 * Enough pages to see most of a campus without being a page walk in itself.
 *
 * The room's dimensions settle almost immediately -- Tokyo measured the same
 * six clusters at the same sizes from eight pages as from twenty-four -- so
 * the extra pages only fill seats in: 225 workstations at eight, 287 at
 * twenty-four, which is 64-94% of each cluster rather than 50-92%. Two dozen
 * requests once a day is less than one campus roster.
 */
const PAGES = 24;

export const deriveFloorPlan = async (
  campusId: number,
  api: FortyTwoApi,
): Promise<DerivedPlan> => {
  const rows = await api.fetchAllPages(`/campus/${campusId}/locations`, {
    maxPages: PAGES,
  });

  // cluster -> row -> seat -> host
  const seats = new Map<string, Map<number, Map<number, string>>>();
  const hosts = new Set<string>();

  for (const row of rows) {
    const host: unknown = row?.host;
    if (typeof host !== "string") continue;

    const match = host.match(HOST_PATTERN);
    if (!match) continue;

    const [, cluster, rowNumber, seatNumber] = match;
    hosts.add(host);

    const byRow = seats.get(cluster) ?? new Map<number, Map<number, string>>();
    seats.set(cluster, byRow);

    const bySeat = byRow.get(Number(rowNumber)) ?? new Map<number, string>();
    byRow.set(Number(rowNumber), bySeat);

    bySeat.set(Number(seatNumber), host);
  }

  const plan: FloorPlan = {};

  for (const [cluster, byRow] of [...seats.entries()].sort(compareNatural)) {
    const lastRow = Math.max(...byRow.keys());
    const lastSeat = Math.max(
      ...[...byRow.values()].flatMap((bySeat) => [...bySeat.keys()]),
    );

    // A full rectangle, so the room keeps its shape: a seat nobody was sitting
    // at is drawn empty rather than collapsing the row around it.
    plan[cluster] = Array.from({ length: lastRow }, (_, rowIndex) => {
      const bySeat = byRow.get(rowIndex + 1);
      return Array.from(
        { length: lastSeat },
        (_, seatIndex) => {
          const host = bySeat?.get(seatIndex + 1);
          return host ? `W:${host}` : null;
        },
      );
    });
  }

  return { plan, hostCount: hosts.size };
};

const compareNatural = (a: [string, unknown], b: [string, unknown]) =>
  a[0].localeCompare(b[0], undefined, { numeric: true });

/**
 * How much of a campus has to match a vendored map for it to be believed.
 *
 * The maps were last touched in December 2024 and campuses move. Surveying all
 * 25 against the hosts 42 reports in use: ten still fit (Nice 100%, Barcelona
 * 99%, Malaga 97%, Lausanne 79%, Khouribga 65%), ten have come adrift (Paris,
 * Belgium, Quebec, Seoul, Rome, Yerevan and Heilbronn match nothing at all --
 * Paris is listed as `e1r13p1` and now runs `f2r10s6`), and five are for
 * campuses the API no longer serves.
 *
 * Half is the bar because of what the map is for. Below it, most of the people
 * logged in are at machines the map has never heard of, so they appear nowhere
 * -- and a schematic that shows everyone beats a beautiful room that hides
 * them. Above it the real layout is worth the few it misses.
 */
const FRESH_ENOUGH = 0.5;

/** Up to a hundred recent hosts is one request and plenty to judge on. */
const SAMPLE_SIZE = 100;

export interface ResolvedPlan {
  plan: FloorPlan;
  /** "vendored" when it came from a real layout, "derived" when worked out. */
  source: "vendored" | "derived";
  /** Workstations the plan names. */
  hostCount: number;
  /**
   * For a vendored plan, the share of machines in use that it knows about.
   * Short of 1 means some students are sitting somewhere it cannot draw.
   */
  coverage?: number;
}

export const resolveFloorPlan = async (
  campusId: number,
  api: FortyTwoApi,
): Promise<ResolvedPlan | null> => {
  if (hasVendoredPlan(campusId)) {
    const plan = await loadVendoredPlan(campusId);
    const coverage = plan ? await measureCoverage(plan, campusId, api) : 0;

    if (plan && coverage >= FRESH_ENOUGH) {
      return {
        plan,
        source: "vendored",
        hostCount: hostsIn(plan).size,
        coverage,
      };
    }
  }

  const derived = await deriveFloorPlan(campusId, api);
  return Object.keys(derived.plan).length > 0
    ? { ...derived, source: "derived" }
    : null;
};

/** What share of the machines students are actually at a plan knows about. */
const measureCoverage = async (
  plan: FloorPlan,
  campusId: number,
  api: FortyTwoApi,
): Promise<number> => {
  const known = hostsIn(plan);
  if (known.size === 0) return 0;

  const response = await api.fetch(
    `/campus/${campusId}/locations?page[size]=${SAMPLE_SIZE}`,
  );
  // No way to judge is not a reason to throw away a real layout.
  if (!response.ok) return 1;

  const live = new Set<string>();
  for (const row of await response.json()) {
    if (typeof row?.host === "string") live.add(row.host);
  }

  // A campus nobody has sat at tells us nothing either way.
  if (live.size === 0) return 1;

  return [...live].filter((host) => known.has(host)).length / live.size;
};
