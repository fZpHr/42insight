"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ClusterUser } from "@/types";
import { angoulemeMaps } from "./(maps)/angouleme";
import { niceMaps } from "./(maps)/nice";
import type { DerivedPlan, FloorPlan } from "@/lib/forty-two/cluster-plan";
import { fetchJson } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCampus } from "@/contexts/CampusContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { isKeyRequired, KeyRequiredError } from "@/lib/api-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface HostUser {
  id: number;
  name: string;
  photoUrl: string;
  hours: string;
  percentage: string;
}

interface HostUsageData {
  [host: string]: HostUser[];
}

// The page walk happens server-side now, on the visitor's own key and behind
// a shared cache, so every open tab reads one answer instead of paginating
// its own.
const fetchStudents = async (campus?: string): Promise<ClusterUser[]> => {
  try {
    if (!campus) return [];

    const response = await fetch(`/api/locations/${campus}`);
    if (response.status === 428) throw new KeyRequiredError();
    if (!response.ok) throw new Error("Failed to fetch students");

    return await response.json();
  } catch (e) {
    // A missing key has to reach the caller, or the page waits forever on data
    // that will never come instead of asking for one.
    if (isKeyRequired(e)) throw e;
    console.error("Error fetching students:", e);
    return [];
  }
};

const fetchHostUsage = async (campus?: string): Promise<HostUsageData> => {
  try {
    if (!campus) return {};
    const response = await fetch(`/api/cluster-hosts/${campus}`);
    if (!response.ok) throw new Error("Failed to fetch host usage");
    const data: HostUsageData = await response.json();
    return data;
  } catch (e) {
    console.error("Error fetching host usage:", e);
    return {};
  }
};

/**
 * The floor plans, which exist for the two campuses somebody sat down and drew.
 *
 * They are literal seat-by-seat layouts naming real hosts -- Angouleme's are
 * "1A1", Nice's are "c1r1p1" -- so they are not transferable, and 42 publishes
 * nothing that would let them be generated. Anywhere else gets the list view
 * below instead.
 *
 * This used to fall back to Angouleme's plan for every other campus, which drew
 * a room that does not exist there and, since no host name matched, showed
 * every seat empty. A campus that looked deserted was really a campus that was
 * never on the map.
 */
const FLOOR_PLANS: Record<string, FloorPlan> = {
  angouleme: angoulemeMaps,
  nice: niceMaps,
};

function getMapByCampus(campus?: string) {
  return FLOOR_PLANS[campus?.toLowerCase() ?? ""] ?? null;
}

/**
 * The layout worked out from workstation names, for the campuses nobody drew.
 * See lib/forty-two/cluster-plan.ts for why it is derived rather than fetched.
 */
const fetchDerivedPlan = async (campus?: string): Promise<DerivedPlan | null> => {
  if (!campus) return null;
  return fetchJson<DerivedPlan>(`/api/cluster-map/${encodeURIComponent(campus)}`);
};

export default function ClusterMap() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { selectedCampus } = useCampus();
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [showTimeoutError, setShowTimeoutError] = useState(false);


  const effectiveCampus = selectedCampus || user?.campus;


  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeoutError(true);
    }, 15000); 

    return () => clearTimeout(timer);
  }, [effectiveCampus]);

  const {
    data: students = [],
    isLoading,
    refetch,
    isFetching,
    isSuccess,
    error,
  } = useQuery<ClusterUser[]>({
    queryKey: ["students", effectiveCampus],
    queryFn: () => fetchStudents(effectiveCampus),
    enabled: status === "authenticated" && !!effectiveCampus,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: hostUsage = {},
    isLoading: isLoadingHostUsage,
  } = useQuery<HostUsageData>({
    queryKey: ["hostUsage", effectiveCampus],
    queryFn: async () => {

      await new Promise(resolve => setTimeout(resolve, 600));
      return fetchHostUsage(effectiveCampus);
    },
    enabled: status === "authenticated" && !!effectiveCampus && isSuccess,
    staleTime: 10 * 60 * 1000,
  });

  // Drawn by hand where somebody drew one, worked out from the workstation
  // names everywhere else. Only the second costs a request, and only once a day.
  const drawnPlan = getMapByCampus(effectiveCampus);

  const { data: derived, isLoading: isLoadingPlan } = useQuery({
    queryKey: ["cluster-plan", effectiveCampus],
    queryFn: () => fetchDerivedPlan(effectiveCampus),
    enabled:
      status === "authenticated" && !!effectiveCampus && drawnPlan === null,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const plan: FloorPlan | null = drawnPlan ?? derived?.plan ?? null;
  const clusterKeys = plan
    ? Object.keys(plan).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      )
    : [];
  const hasFloorPlan = clusterKeys.length > 0;

  // Whatever the picker is set to has to exist in the plan that arrived: the
  // keys differ per campus, and the previous campus's choice will not be there.
  const currentCluster =
    selectedCluster && clusterKeys.includes(selectedCluster)
      ? selectedCluster
      : (clusterKeys[0] ?? null);

  const renderCluster = (clusterKey: string) => {
    const map = plan?.[clusterKey];
    if (!map) return null;

    return (
      <TooltipProvider delayDuration={100} skipDelayDuration={0}>
        <div className="flex justify-center w-full">
          <div className="inline-block">
            <div className="flex flex-col gap-[2px]">
              {map.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-[2px]">
                  {row.map((cell, colIndex) => {
                    if (typeof cell !== "string") {
                      return (
                        <div
                          key={colIndex}
                          className="aspect-square w-9 sm:w-8 md:w-10 lg:w-20 bg-transparent"
                        />
                      );
                    }

                    if (cell.startsWith("T:")) {
                      return (
                        <div
                          key={colIndex}
                          className="aspect-square w-9 sm:w-8 md:w-10 lg:w-20 bg-zinc-800 text-white flex items-center justify-center text-[0.6rem]"
                        >
                          {cell.split(":")[1]}
                        </div>
                      );
                    }

                    const location = cell.split(":")[1];
                    const student = students.find((s) => s.host === location);
                    const regularUsers = hostUsage[location] || [];

                    return (
                      <Tooltip key={colIndex} delayDuration={100}>
                        <TooltipTrigger asChild>
                          <div
                            className={`aspect-square w-9 sm:w-8 md:w-10 lg:w-20 rounded-md overflow-hidden flex items-center justify-center text-[0.6rem] ${
                              student
                                ? "text-white cursor-pointer"
                                : "bg-gray-200 text-gray-500"
                            } hover:shadow-lg transition-shadow`}
                            onClick={() => {
                              if (student) {
                                window.open(
                                  `https://profile.intra.42.fr/users/${student.user.login}`,
                                  "_blank"
                                );
                              }
                            }}
                          >
                            {student ? (
                              <img
                                src={
                                  student.user.image.versions.medium ||
                                  "/placeholder.svg"
                                }
                                alt={student.user.login}
                                className="object-cover w-full h-full transition-transform duration-300 hover:scale-125"
                              />
                            ) : (
                              <span>{location}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="max-w-sm p-0 pointer-events-auto"
                          sideOffset={5}
                        >
                          <div className="max-h-96 overflow-y-auto">
                            <div className="p-3 space-y-3">
                              {student && (
                                <div 
                                  className="pb-2 border-b cursor-pointer hover:bg-muted/30 rounded p-2 -m-2 mb-1 transition-colors"
                                  onClick={() => window.open(`https://profile.intra.42.fr/users/${student.user.login}`, "_blank")}
                                >
                                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">
                                    Currently here
                                  </p>
                                  <p className="font-bold hover:text-primary transition-colors">{student.user.login}</p>
                                  <p className="text-xs text-muted-foreground">{student.host}</p>
                                </div>
                              )}
                              {regularUsers.length > 0 && (
                                <div>
                                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">
                                    Regular users ({regularUsers.length})
                                  </p>
                                  <div className="space-y-2">
                                    {regularUsers.map((user) => (
                                      <div 
                                        key={user.id} 
                                        className="flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-2 -mx-2 cursor-pointer transition-colors"
                                        onClick={() => window.open(`https://profile.intra.42.fr/users/${user.name}`, "_blank")}
                                      >
                                        <Avatar className="h-12 w-12">
                                          <AvatarImage 
                                            src={user.photoUrl} 
                                            alt={user.name} 
                                            className="h-full w-full object-cover" 
                                          />
                                          <AvatarFallback className="text-xs">
                                            {user.name.slice(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm truncate hover:text-primary transition-colors">{user.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {parseFloat(user.hours).toFixed(1)}h • {user.percentage}%
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!student && regularUsers.length === 0 && (
                                <div className="text-center py-2">
                                  <p className="font-medium">Available</p>
                                  <p className="text-xs text-muted-foreground">{location}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  };

  const getAvailablePC = (clusterKey: string) => {
    const map = plan?.[clusterKey];
    if (!map) return 0;

    const totalWorkspaces = map
      .flat()
      .filter(
        (cell): cell is string =>
          typeof cell === "string" && cell.startsWith("W")
      ).length;

    const occupiedWorkspaces = students.filter((s) => {
      const location = s.host;
      return map.flat().includes(`W:${location}`);
    }).length;

    return totalWorkspaces - occupiedWorkspaces;
  };

  const getTotalAvailablePCs = () =>
    clusterKeys.reduce((total, key) => total + getAvailablePC(key), 0);

  // Who is actually at a machine, for a campus with no plan to place them on.
  const connected = students
    .filter((student) => student.host && student.host !== "404")
    .sort((a, b) => a.host.localeCompare(b.host, undefined, { numeric: true }));






  // Keep the loading screen for as long as the request is actually running.
  // The timeout timer used to dismiss it at 15s while the fetch was still
  // going, so a slow campus rendered every host as empty over a request that
  // then arrived a moment later -- indistinguishable from nobody being logged
  // in, and the only fix was pressing refresh yourself.
  if (status === "loading" || !effectiveCampus || ((isLoading || isFetching) && !isSuccess)) {
    return <LoadingScreen message="Loading cluster map..." />;
  }

  return (
    <div className="w-full px-4 py-3">
      <div className="max-w-7xl mx-auto">
        {/* Alerte 42 API timeout */}
        {showTimeoutError && (!isSuccess || students.length === 0) && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>42 API Issue</AlertTitle>
            <AlertDescription>
               The 42 API has a rate limit of 2 requests per second. We&apos;re managing requests to stay within this limit. The page may take a few moments to load completely.
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()} 
                className="ml-2"
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <p className="text-sm sm:text-base">
              <strong>
                {students.filter((s) => s.host !== "404").length}
              </strong>{" "}
              students logged in
            </p>
            {hasFloorPlan && (
              <p className="text-sm sm:text-base">
                <strong>{getTotalAvailablePCs()}</strong> available PCs
              </p>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md transition"
              aria-label="Refresh students"
              variant="outline"
              disabled={isFetching}
              size="icon"
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>

            {hasFloorPlan && currentCluster && (
              <Select value={currentCluster} onValueChange={setSelectedCluster}>
                <SelectTrigger className="flex-1 sm:w-[220px]">
                  <SelectValue placeholder="Select cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusterKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      <span className="hidden sm:inline">
                        Cluster {key} ({getAvailablePC(key)} available)
                      </span>
                      <span className="sm:hidden">
                        {key} ({getAvailablePC(key)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {isLoading || isLoadingPlan ? (
        <div className="text-center text-sm text-gray-500 py-8">
          {isLoadingPlan ? "Working out the layout…" : "Loading cluster…"}
        </div>
      ) : hasFloorPlan ? (
        <>
          {!drawnPlan && (
            <div className="max-w-7xl mx-auto mb-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Layout read from the workstation names</AlertTitle>
                <AlertDescription>
                  Nobody drew a plan for {effectiveCampus}, and 42&apos;s own
                  cluster endpoint is closed to student keys, so the rows and
                  seats here come from the workstation names themselves
                  {derived?.hostCount ? ` (${derived.hostCount} of them)` : ""}.
                  Treat it as a seating chart rather than the room: seats run in
                  numeric order, and a machine nobody has logged into recently
                  is not in the names, so it shows as an empty square.
                </AlertDescription>
              </Alert>
            </div>
          )}
          {currentCluster && renderCluster(currentCluster)}
        </>
      ) : (
        <div className="max-w-7xl mx-auto">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No floor plan for {effectiveCampus}</AlertTitle>
            <AlertDescription>
              The workstation names at {effectiveCampus} do not carry row and
              seat numbers, so there is nothing to lay the room out from. Who is
              logged in, and where, is live all the same.
            </AlertDescription>
          </Alert>

          {connected.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nobody is logged in at {effectiveCampus} right now.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {connected.map((student) => (
                <button
                  key={student.host}
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://profile.intra.42.fr/users/${student.user.login}`,
                      "_blank",
                    )
                  }
                  className="flex items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={student.user.image?.versions?.small}
                      alt={student.user.login}
                    />
                    <AvatarFallback className="text-xs">
                      {student.user.login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {student.user.login}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.host}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}