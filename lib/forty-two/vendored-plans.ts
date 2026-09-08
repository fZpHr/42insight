import type { FloorPlan } from "@/lib/forty-two/cluster-plans";

/**
 * The vendored campus layouts, one lazy import each.
 *
 * Listed rather than globbed so the bundler can trace them: only the campus
 * being looked at is loaded, instead of three quarters of a megabyte of rooms
 * nobody asked about. See vendor/42-cluster-maps/README.md for where the data
 * comes from and why it is checked before it is trusted.
 */
const LOADERS: Record<number, () => Promise<any>> = {
  1: () => import("@/vendor/42-cluster-maps/data/campus_1.json"),
  5: () => import("@/vendor/42-cluster-maps/data/campus_5.json"),
  7: () => import("@/vendor/42-cluster-maps/data/campus_7.json"),
  8: () => import("@/vendor/42-cluster-maps/data/campus_8.json"),
  9: () => import("@/vendor/42-cluster-maps/data/campus_9.json"),
  12: () => import("@/vendor/42-cluster-maps/data/campus_12.json"),
  14: () => import("@/vendor/42-cluster-maps/data/campus_14.json"),
  16: () => import("@/vendor/42-cluster-maps/data/campus_16.json"),
  17: () => import("@/vendor/42-cluster-maps/data/campus_17.json"),
  21: () => import("@/vendor/42-cluster-maps/data/campus_21.json"),
  22: () => import("@/vendor/42-cluster-maps/data/campus_22.json"),
  23: () => import("@/vendor/42-cluster-maps/data/campus_23.json"),
  25: () => import("@/vendor/42-cluster-maps/data/campus_25.json"),
  29: () => import("@/vendor/42-cluster-maps/data/campus_29.json"),
  30: () => import("@/vendor/42-cluster-maps/data/campus_30.json"),
  31: () => import("@/vendor/42-cluster-maps/data/campus_31.json"),
  32: () => import("@/vendor/42-cluster-maps/data/campus_32.json"),
  37: () => import("@/vendor/42-cluster-maps/data/campus_37.json"),
  38: () => import("@/vendor/42-cluster-maps/data/campus_38.json"),
  39: () => import("@/vendor/42-cluster-maps/data/campus_39.json"),
  41: () => import("@/vendor/42-cluster-maps/data/campus_41.json"),
  43: () => import("@/vendor/42-cluster-maps/data/campus_43.json"),
  46: () => import("@/vendor/42-cluster-maps/data/campus_46.json"),
  47: () => import("@/vendor/42-cluster-maps/data/campus_47.json"),
  48: () => import("@/vendor/42-cluster-maps/data/campus_48.json"),
};

export const hasVendoredPlan = (campusId: number): boolean =>
  campusId in LOADERS;

/** The cells 42's own format uses, and what this site draws for each. */
const CELL_USER = "USER";
const CELL_WALL = "WALL";

export const loadVendoredPlan = async (
  campusId: number,
): Promise<FloorPlan | null> => {
  const load = LOADERS[campusId];
  if (!load) return null;

  const module = await load();
  const clusters = (module.default ?? module) as any[];
  if (!Array.isArray(clusters)) return null;

  const plan: FloorPlan = {};

  for (const cluster of clusters) {
    if (!Array.isArray(cluster?.map)) continue;

    // A cluster's own name where it has one, else the host prefix, which is
    // what the workstations are called and so what a student would say.
    const key: string =
      cluster.nameShort || cluster.name || cluster.hostPrefix || cluster.slug;
    if (!key) continue;

    plan[key] = cluster.map.map((row: any[]) =>
      (Array.isArray(row) ? row : []).map((cell: any) => {
        if (cell?.kind === CELL_USER && cell.host) return `W:${cell.host}`;
        // Walls become the same dark block the hand-drawn maps used for one.
        if (cell?.kind === CELL_WALL) return "T: ";
        // CORRIDOR, and empty cells, are floor.
        return null;
      }),
    );
  }

  return Object.keys(plan).length > 0 ? plan : null;
};

/** Every workstation a plan names, for checking it against a live campus. */
export const hostsIn = (plan: FloorPlan): Set<string> =>
  new Set(
    Object.values(plan)
      .flat(2)
      .filter((cell): cell is string => typeof cell === "string" && cell.startsWith("W:"))
      .map((cell) => cell.slice(2)),
  );
