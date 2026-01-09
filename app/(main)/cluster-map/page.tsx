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
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCampus } from "@/contexts/CampusContext";
import { LoadingScreen } from "@/components/LoadingScreen";
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

const fetchStudents = async (campus?: string): Promise<ClusterUser[]> => {
  try {
    const campusMapping: { [key: string]: number } = {
      Angouleme: 31,
      Nice: 41,
    };
    const campusId = campusMapping[campus || "null"];
    if (!campusId) return [];

    const allStudents: ClusterUser[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      if (page > 1) {
        await new Promise(resolve => setTimeout(resolve, 2100));
      }
      
      const response = await fetch(
        `/api/proxy/campus/${campusId}/locations?&filter[active]=true&per_page=100&page=${page}`
      );
      if (!response.ok) throw new Error("Failed to fetch students");
      const data: ClusterUser[] = await response.json();
      allStudents.push(...data);
      hasMore = data.length === 100;
      page++;
    }

    return allStudents;
  } catch (e) {
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

function getMapByCampus(campus?: string) {
  switch (campus?.toLowerCase()) {
    case "angouleme":
      return angoulemeMaps;
    case "nice":
      return niceMaps;
    default:
      return angoulemeMaps;
  }
}

export default function ClusterMap() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { selectedCampus } = useCampus();
  const [selectedCluster, setSelectedCluster] = useState("1");
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
  } = useQuery<ClusterUser[]>({
    queryKey: ["students", effectiveCampus],
    queryFn: () => fetchStudents(effectiveCampus),
    enabled: status === "authenticated" && !!effectiveCampus,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
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

  const renderCluster = (clusterNumber: string) => {
    const campusMaps = getMapByCampus(effectiveCampus);
    const key = effectiveCampus === "Nice" ? `c${clusterNumber}` : clusterNumber;
    const map = campusMaps[key];
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
                                        <Avatar className="h-8 w-8 shrink-0">
                                          <AvatarImage src={user.photoUrl} alt={user.name} />
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

  const getAvailablePC = (clusterNumber: string) => {
    const campusMaps = getMapByCampus(effectiveCampus);
    const key = effectiveCampus === "Nice" ? `c${clusterNumber}` : clusterNumber;
    const map = campusMaps[key];
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

  const getTotalAvailablePCs = () => {
    const count = getNumberofClusters();
    let total = 0;
    for (let i = 1; i <= count; i++) {
      total += getAvailablePC(String(i));
    }
    return total;
  };

  const getNumberofClusters = () => {
    const campusMaps = getMapByCampus(effectiveCampus);
    return Object.keys(campusMaps).length;
  };

  const count = getNumberofClusters();
  const nums = Array.from(
    { length: Math.max(0, count) },
    (_, i) => String(i + 1)
  );




  if (!showTimeoutError && (status === "loading" || !effectiveCampus || (isLoading || isFetching) && !isSuccess)) {
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
            <p className="text-sm sm:text-base">
              <strong>{getTotalAvailablePCs()}</strong> available PCs
            </p>
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

            <Select
              value={selectedCluster}
              onValueChange={setSelectedCluster}
            >
              <SelectTrigger className="flex-1 sm:w-[220px]">
                <SelectValue placeholder="Select cluster" />
              </SelectTrigger>
              <SelectContent>
                {nums.map((num) => (
                  <SelectItem key={num} value={num}>
                    <span className="hidden sm:inline">
                      Cluster {num} ({getAvailablePC(num)} available)
                    </span>
                    <span className="sm:hidden">
                      C{num} ({getAvailablePC(num)})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-gray-500 py-8">
          Loading cluster {selectedCluster}...
        </div>
      ) : (
        renderCluster(selectedCluster)
      )}
    </div>
  );
}