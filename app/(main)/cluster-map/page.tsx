"use client";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ClusterUser } from "@/types";
import { angoulemeMaps } from "./(maps)/angouleme";
import { niceMaps } from "./(maps)/nice";

const fetchStudents = async (campus?: string): Promise<ClusterUser[]> => {
    try {
        const campusMapping: { [key: string]: number } = { Angouleme: 31, Nice: 41 };
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

    const { data: students = [], isLoading } = useQuery<ClusterUser[]>({
        queryKey: ["students", user?.campus],
        queryFn: () => fetchStudents(user?.campus),
        enabled: status === "authenticated",
    });

    const renderCluster = (clusterNumber: string) => {
        const campusMaps = getMapByCampus(user?.campus);

        const key = user?.campus === "Nice" ? `c${clusterNumber}` : clusterNumber;

        const map = campusMaps[key];
        if (!map) return null;

        return (
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

                                // Table marker (T:A, T:B...)
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

                                // Workspace (W:...)
                                const location = cell.split(":")[1];
                                const student = students.find((s) => s.host === location);

                                return (
                                    <TooltipProvider key={colIndex}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`aspect-square w-9 sm:w-8 md:w-10 lg:w-20 rounded-md overflow-hidden flex items-center justify-center text-[0.6rem]
                            ${student
                                                            ? " text-white"
                                                            : "bg-gray-200 text-gray-500"
                                                        }
                            hover:shadow-lg transition`}
                                                >
                                                    {student ? (
                                                        <img
                                                            src={
                                                                student.user.image.versions.medium ||
                                                                "/placeholder.svg"
                                                            }
                                                            alt={student.user.login}
                                                            className="object-cover w-full h-full"
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
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
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

        const occupiedWorkspaces = students.filter((s => {
            const location = s.host;
            return map.flat().includes(`W:${location}`);
        })).length;

        const availablePCs = totalWorkspaces - occupiedWorkspaces;
        return availablePCs;
    };

    const getTotalAvailablePCs = () => {
        let total = 0;
        ["1", "2", "3"].forEach((num) => {
            total += getAvailablePC(num);
        });
        return total;
    }

    const getNumberofClusters = () => {
        const campusMaps = getMapByCampus(user?.campus);
        return Object.keys(campusMaps).length;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
                <p className="text-sm sm:text-base">
                    <strong>
                        {students.filter((s) => s.host !== "404").length}
                    </strong>{" "}
                    students logged in
                </p>
                <p className="text-sm sm:text-base">
                    <strong>
                        {getTotalAvailablePCs()}
                    </strong>{" "}
                    available PCs
                </p>
            </div>

            {(() => {
                const count = getNumberofClusters();
                const nums = Array.from({ length: Math.max(0, count) }, (_, i) => String(i + 1));

                return (
                    <Tabs defaultValue={count > 0 ? `cluster1` : ""}>
                        <TabsList
                            className="grid w-full mb-4"
                            style={{ gridTemplateColumns: `repeat(${Math.max(1, count)}, minmax(0, 1fr))` }}
                        >
                            {nums.map((num) => (
                                <TabsTrigger key={num} value={`cluster${num}`}>
                                    <span className="hidden sm:inline">
                                        Cluster {num} ({getAvailablePC(num)} available)
                                    </span>
                                    <span className="sm:hidden">
                                        C{num} ({getAvailablePC(num)})
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {nums.map((num) => (
                            <TabsContent key={num} value={`cluster${num}`}>
                                {isLoading ? (
                                    <div className="text-center text-sm text-gray-500 py-8">
                                        Loading cluster {num}...
                                    </div>
                                ) : (
                                    renderCluster(num)
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                );
            })()}
        </div>
    );
}