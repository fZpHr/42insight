"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

interface Student {
    id: number
    name: string
    location: string
    photoUrl: string
}

const fetchStudents = async (): Promise<Student[]> => {
    try {
        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1]
        const response = await fetch("/api/students", {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
            throw new Error("Failed to fetch students")
        }
        return response.json()
    } catch (error) {
        console.error("Error fetching students:", error)
        return []
    }
}

const ClusterMap = () => {
    const [students, setStudents] = useState<Student[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            const fetchedStudents = await fetchStudents()
            setStudents(fetchedStudents)
            setIsLoading(false)
        }
        fetchData()
    }, [])

    const renderCluster = (clusterNumber: string) => {
        const rows = ["A", "B", "C", "D", "E", "F", "G"]
        const cols = ["1", "2", "3", "4", "5", "6", "7"]

        return (
            <div className="grid grid-cols-7 gap-2">
                {isLoading &&
                    rows.map((row) =>
                        cols.map((col) => (
                            <div key={`${row}${col}`} className="w-24 h-24 rounded-md bg-gray-200 animate-pulse"></div>
                        )),
                    )}

                {!isLoading &&
                    rows.map((row) =>
                        cols.map((col) => {
                            const location = `${clusterNumber}${row}${col}`
                            const student = students.find((s) => s.location === location)
                            return (
                                <TooltipProvider key={location}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={`w-24 h-24 rounded-md flex items-center justify-center text-sm font-bold overflow-hidden
                                                ${student ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}
                                                transition-all duration-200 hover:shadow-lg`}
                                            >
                                                {student ? (
                                                    <Image
                                                        src={student.photoUrl || "/placeholder.svg"}
                                                        alt={student.name}
                                                        width={200}
                                                        height={200}
                                                        className="object-cover w-full h-full transition-transform duration-200 transform hover:scale-110"
                                                    />
                                                ) : (
                                                    <span className="text-lg">
                                                        {row}
                                                        {col}
                                                    </span>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        {student && (
                                            <TooltipContent side="right">
                                                <div className="text-center">
                                                    <p className="font-bold">{student.name}</p>
                                                    <p>Location: {student.location}</p>
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
        return 7 * 7 - students.filter((student) => student.location.startsWith(clusterNumber)).length
    }

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl">42 Cluster Map</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between mb-4">
                    <p>
                        <strong>{students.filter((student) => student.location !== "404").length}</strong> students logged in
                    </p>
                    <p>
                        <strong>{7 * 7 * 3 - students.filter((student) => student.location !== "404").length}</strong> available PCs
                    </p>
                </div>
                <Tabs defaultValue="cluster1">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="cluster1">Cluster 1 ({getAvailablePC("1")} available)</TabsTrigger>
                        <TabsTrigger value="cluster2">Cluster 2 ({getAvailablePC("2")} available)</TabsTrigger>
                        <TabsTrigger value="cluster3">Cluster 3 ({getAvailablePC("3")} available)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="cluster1">{renderCluster("1")}</TabsContent>
                    <TabsContent value="cluster2">{renderCluster("2")}</TabsContent>
                    <TabsContent value="cluster3">{renderCluster("3")}</TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

export default ClusterMap

