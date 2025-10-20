"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query";

type ClusterUser = {
    end_at: string | null;
    id: number;
    begin_at: string;
    primary: boolean;
    host: string;
    campus_id: number;
    user: {
        id: number;
        email: string;
        login: string;
        first_name: string;
        last_name: string;
        usual_full_name: string;
        usual_first_name: string | null;
        url: string;
        phone: string;
        displayname: string;
        kind: string;
        image: {
            link: string;
            versions: {
                large: string;
                medium: string;
                small: string;
                micro: string;
            };
        };
        "staff?": boolean;
        correction_point: number;
        pool_month: string;
        pool_year: string;
        location: string;
        wallet: number;
        anonymize_date: string;
        data_erasure_date: string;
        created_at: string;
        updated_at: string;
        alumnized_at: string | null;
        "alumni?": boolean;
        "active?": boolean;
    };
};



const fetchStudents = async (campus?: string): Promise<ClusterUser[]> => {
    try {
            const campusMapping: { [key: string]: number } = {
                "Angouleme": 31, "Nice": 41,
                "amsterdam": 14, "paris": 1, "lyon": 9, "brussels": 12, "helsinki": 13,
                "khouribga": 16, "sao-paulo": 20, "benguerir": 21, "madrid": 22, "kazan": 23,
                "quebec": 25, "tokyo": 26, "rio-de-janeiro": 28, "seoul": 29, "rome": 30,
                "yerevan": 32, "bangkok": 33, "kuala-lumpur": 34, "adelaide": 36, "malaga": 37,
                "lisboa": 38, "heilbronn": 39, "urduliz": 40, "42network": 42, "abu-dhabi": 43,
                "wolfsburg": 44, "alicante": 45, "barcelona": 46, "lausanne": 47, "mulhouse": 48,
                "istanbul": 49, "kocaeli": 50, "berlin": 51, "florence": 52, "vienna": 53,
                "tetouan": 55, "prague": 56, "london": 57, "porto": 58, "le-havre": 62,
                "singapore": 64, "antananarivo": 65, "warsaw": 67, "luanda": 68, "gyeongsan": 69
            };

            const campusId = campusMapping[campus || "null"];
            if (!campusId) {
                console.error("Campus not found:", campus);
                return [];
            }

            const allStudents: ClusterUser[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await fetch(
                    `/api/proxy/campus/${campusId}/locations?&filter[active]=true&per_page=100&page=${page}`
                );
                
                if (!response.ok) {
                    throw new Error("Failed to fetch students");
                }
                
                const data: ClusterUser[] = await response.json();
                allStudents.push(...data);
                
                hasMore = data.length === 100;
                page++;
            }

            return allStudents;
    } catch (error) {
        console.error("Error fetching students:", error)
        return []
    }
}

export default function ClusterMap() {
    const { data: session, status } = useSession();
    const user = session?.user;

    const { data: students = [], isLoading } = useQuery<ClusterUser[]>({
        queryKey: ['students', user?.campus],
        queryFn: () => fetchStudents(user?.campus),
        enabled: status === 'authenticated',
    });

    const renderCluster = (clusterNumber: string) => {
        const rows = ["A", "B", "C", "D", "E", "F", "G"]
        const cols = ["1", "2", "3", "4", "5", "6", "7"]

        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1 sm:gap-2">
                {isLoading &&
                    rows.map((row) =>
                        cols.map((col) => (
                            <div key={`${row}${col}`} className="aspect-square w-full rounded-md bg-gray-200 animate-pulse"></div>
                        )),
                    )}

                {!isLoading &&
                    rows.map((row) =>
                        cols.map((col) => {
                            const location = `${clusterNumber}${row}${col}`
                            const student = students.find((s) => s.host === location)
                            return (
                                <TooltipProvider key={location}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={`aspect-square w-full rounded-md flex items-center justify-center text-xs sm:text-sm font-bold overflow-hidden
                                    ${student ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}
                                    transition-all duration-200 hover:shadow-lg`}
                                            >
                                                {student ? (
                                                    <img
                                                        src={student.user.image.versions.medium || "/placeholder.svg"}
                                                        alt={student.user.login}
                                                        width={200}
                                                        height={200}
                                                        className="object-cover w-full h-full transition-transform duration-200 transform hover:scale-110"
                                                    />
                                                ) : (
                                                    <span className="text-[0.6rem] sm:text-xs md:text-sm lg:text-base">
                                                        {clusterNumber}
                                                        {row}
                                                        {col}
                                                    </span>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        {student && (
                                            <TooltipContent side="right">
                                                <div className="text-center">
                                                    <p className="font-bold">{student.user.login}</p>
                                                    <p>Location: {student.user.location}</p>
                                                </div>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            )
                        }),
                    )}
            </div>
        )
    }

    const getAvailablePC = (clusterNumber: string) => {
        return 7 * 7 - students.filter((student) => student.host?.startsWith(clusterNumber)).length
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-3">
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
                    <p className="text-sm sm:text-base">
                        <strong>{students.filter((student) => student.host !== "404").length}</strong> students logged in
                    </p>
                    <p className="text-sm sm:text-base">
                        <strong>{7 * 7 * 3 - students.filter((student) => student.host !== "404").length}</strong> available PCs
                    </p>
                </div>
                <Tabs defaultValue="cluster1">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="cluster1" className="text-xs sm:text-sm">
                            <span className="hidden sm:inline">Cluster 1 ({getAvailablePC("1")} available)</span>
                            <span className="sm:hidden">C1 ({getAvailablePC("1")})</span>
                        </TabsTrigger>
                        <TabsTrigger value="cluster2" className="text-xs sm:text-sm">
                            <span className="hidden sm:inline">Cluster 2 ({getAvailablePC("2")} available)</span>
                            <span className="sm:hidden">C2 ({getAvailablePC("2")})</span>
                        </TabsTrigger>
                        <TabsTrigger value="cluster3" className="text-xs sm:text-sm">
                            <span className="hidden sm:inline">Cluster 3 ({getAvailablePC("3")} available)</span>
                            <span className="sm:hidden">C3 ({getAvailablePC("3")})</span>
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="cluster1">{renderCluster("1")}</TabsContent>
                    <TabsContent value="cluster2">{renderCluster("2")}</TabsContent>
                    <TabsContent value="cluster3">{renderCluster("3")}</TabsContent>
                </Tabs>
            </CardContent>
        </div>
    )
}

