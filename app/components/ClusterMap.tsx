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
    imageUrl: string
}

const generateMockStudents = (): Student[] => {
    const students: Student[] = []
    const clusters = ["1", "2", "3"]
    const rows = ["A", "B", "C", "D", "E", "F", "G"]
    const cols = ["1", "2", "3", "4", "5", "6", "7"]

    let id = 1
    clusters.forEach((cluster) => {
        rows.forEach((row) => {
            cols.forEach((col) => {
                if (Math.random() > 0.3) {
                    students.push({
                        id: id,
                        name: `Student ${id}`,
                        location: `${cluster}${row}${col}`,
                        imageUrl: `https://cdn.intra.42.fr/users/4ea572080b176a1551da67a1574e3333/small_bapasqui.jpg`,
                    })
                    id++
                }
            })
        })
    })

    return students
}

const ClusterMap = () => {
    const [students, setStudents] = useState<Student[]>([])

    useEffect(() => {
        setStudents(generateMockStudents())
    }, [])

    const renderCluster = (clusterNumber: string) => {
        const rows = ["A", "B", "C", "D", "E", "F", "G"]
        const cols = ["1", "2", "3", "4", "5", "6", "7"]

        return (
            <div className="grid grid-cols-7 gap-2">
                {rows.map((row) =>
                    cols.map((col) => {
                        const location = `${clusterNumber}${row}${col}`
                        const student = students.find((s) => s.location === location)
                        return (
                            <TooltipProvider key={location}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={`w-24 h-24 rounded-md flex items-center justify-center text-sm font-bold overflow-hidden
                        ${student ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}`}
                                        >
                                            {student ? (
                                                <Image
                                                    src={student.imageUrl || "/placeholder.svg"}
                                                    alt={student.name}
                                                    width={200}
                                                    height={100}
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

    return (
        <Card className="w-full max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl">42 Cluster Map</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="mb-4"><strong>{students.length}</strong> students logged in</p>
                <p className="mb-4"><strong>{7 * 7 * 7 - students.length}</strong> available PC</p>
                <Tabs defaultValue="cluster1">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="cluster1">Cluster 1 ({7 * 7 - students.filter(student => student.location.startsWith("1")).length} available)</TabsTrigger>
                        <TabsTrigger value="cluster2">Cluster 2 ({7 * 7 - students.filter(student => student.location.startsWith("2")).length} available)</TabsTrigger>
                        <TabsTrigger value="cluster3">Cluster 3 ({7 * 7 - students.filter(student => student.location.startsWith("3")).length} available)</TabsTrigger>
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

