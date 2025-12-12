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
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [selectedCluster, setSelectedCluster] = useState("1");

  const {
    data: students = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<ClusterUser[]>({
    queryKey: ["students", user?.campus],
    queryFn: () => fetchStudents(user?.campus),
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
  });

  const renderCluster = (clusterNumber: string) => {
    const campusMaps = getMapByCampus(user?.campus);
    const key = user?.campus === "Nice" ? `c${clusterNumber}` : clusterNumber;
    const map = campusMaps[key];
    if (!map) return null;

    return (
      <TooltipProvider delayDuration={300}>
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

                    return (
                      <Tooltip key={colIndex}>
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
                        {student && (
                          <TooltipContent side="right">
                            <div className="text-center">
                              <p className="font-bold">{student.user.login}</p>
                              <p>Location: {student.host}</p>
                            </div>
                          </TooltipContent>
                        )}
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
    const campusMaps = getMapByCampus(user?.campus);
    const key = user?.campus === "Nice" ? `c${clusterNumber}` : clusterNumber;
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
    const campusMaps = getMapByCampus(user?.campus);
    return Object.keys(campusMaps).length;
  };

  const count = getNumberofClusters();
  const nums = Array.from(
    { length: Math.max(0, count) },
    (_, i) => String(i + 1)
  );

  return (
    <div className="w-full px-4 py-3">
      <div className="max-w-7xl mx-auto">
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