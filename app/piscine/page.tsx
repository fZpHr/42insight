"use client"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { Search, Trophy, Medal, Award, User, ArrowUpDown, ArrowUp, ArrowDown, Target, Eye, WavesLadder } from "lucide-react"
import { useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PoolUser, SortOption, Tutor } from "@/types"
import Wave from 'react-wavify'

type SortDirection = "asc" | "desc"

const sortOptions: SortOption[] = [
    { value: "level", label: "Level", key: "level" },
    { value: "correctionPoints", label: "Correction Points", key: "correctionPoints" },
]

export default function Piscine() {
    const { user, fetchPoolStudents } = useAuth()
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState<string>("level")
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
    const [highlightUser, setHighlightUser] = useState(false)
    const userRowRef = useRef<HTMLDivElement>(null)

    const {
        data: students,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["pool-students"],
        queryFn: async () => {
            const response = await fetchPoolStudents()
            if (!response || response.length === 0) {
                toast.error("No students found for this campus", {
                    duration: 2000,
                    position: "bottom-right",
                })
                return []
            }
            return response
        },
        staleTime: 10 * 60 * 1000,
    })

    const {
        data: tutors,
        isLoading: isLoadingTutors,
        error: tutorsError,
    } = useQuery<Tutor[]>({
        queryKey: ["tutors"],
        queryFn: async () => {
            return [
                {
                    "id": "tutor1",
                    "name": "ael-atmi",
                    "photoUrl": "https://cdn.intra.42.fr/users/5a3e3f739ad6d5a1a99643ef08d79904/ael-atmi.jpg",
                },
                {
                    "id": "tutor2",
                    "name": "alaualik",
                    "photoUrl": "https://cdn.intra.42.fr/users/cdc094ee2c549eb2432ec950a68abe0f/alaualik.jpg",
                },
                {
                    "id": "tutor3",
                    "name": "antauber",
                    "photoUrl": "https://cdn.intra.42.fr/users/f2073e9936df5d2defc8ad974b264573/antauber.jpg",
                },
                {
                    "id": "tutor4",
                    "name": "inowak--",
                    "photoUrl": "https://cdn.intra.42.fr/users/e05b31f3505551717ddaa595c95fc769/inowak--.jpg",
                },
                {
                    "id": "tutor5",
                    "name": "pjurdana",
                    "photoUrl": "https://cdn.intra.42.fr/users/c6063f96fb9cfdaa5cf853caf8a3bf84/pjurdana.jpg",
                },
                {
                    "id": "tutor6",
                    "name": "qumiraud",
                    "photoUrl": "https://cdn.intra.42.fr/users/e4b1252ddab50488c02d18d23f1ec1e9/qumiraud.jpg",
                },
                {
                    "id": "tutor7",
                    "name": "lguiet",
                    "photoUrl": "https://cdn.intra.42.fr/users/f45e68c95cf8fa6cdc8edd1e2749d804/lguiet.jpg",
                },
                {
                    "id": "tutor8",
                    "name": "stetrel",
                    "photoUrl": "https://cdn.intra.42.fr/users/36ad63d30385ff7c4e2139f41a664913/stetrel.jpg",
                },
                {
                    "id": "tutor9",
                    "name": "fpetit",
                    "photoUrl": "https://cdn.intra.42.fr/users/46f2a1c143571d2b9326de82e21cdf13/fpetit.jpg",
                },
                {
                    "id": "tutor10",
                    "name": "jenibaud",
                    "photoUrl": "https://cdn.intra.42.fr/users/75d336f63bb7f3e7c2e7b3a0e0eec44d/jenibaud.jpg",
                }
            ]
        },
        staleTime: 10 * 60 * 1000,
    })

    const sortStudents = (students: PoolUser[], sortKey: keyof PoolUser, direction: SortDirection) => {
        return [...students].sort((a, b) => {
            const aValue = a[sortKey]
            const bValue = b[sortKey]
            if (direction === "asc") {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
            }
        })
    }

    const processedStudents = students
        ? sortStudents(
            students.filter((student: PoolUser) => student.name.toLowerCase().includes(searchTerm.toLowerCase())),
            sortOptions.find((option) => option.value === sortBy)?.key || "level",
            sortDirection,
        )
        : []

    const userPosition = processedStudents.findIndex((student: PoolUser) => student.id === user?.id)
    const userRank =
        userPosition !== -1 ? (sortDirection === "desc" ? userPosition + 1 : processedStudents.length - userPosition) : null

    const scrollToUserPosition = () => {
        if (userRowRef.current) {
            userRowRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            })
            setTimeout(() => {
                if (userRowRef.current) {
                    userRowRef.current.style.transform = "scale(1.02)"
                    setTimeout(() => {
                        if (userRowRef.current) {
                            userRowRef.current.style.transform = "scale(1)"
                        }
                    }, 200)
                }
            })
        }
    }

    const toggleSortDirection = () => {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    }

    const handleSortChange = (value: string) => {
        setSortBy(value)
        setSortDirection("desc")
    }

    const getRankIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Trophy className="h-6 w-6 text-yellow-500" />
            case 2:
                return <Medal className="h-6 w-6 text-gray-400" />
            case 3:
                return <Award className="h-6 w-6 text-amber-600" />
            default:
                return <span className="text-lg font-bold text-muted-foreground">#{position}</span>
        }
    }

    const getSortIcon = () => {
        if (sortDirection === "asc") {
            return <ArrowUp className="h-4 w-4" />
        } else {
            return <ArrowDown className="h-4 w-4" />
        }
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4">
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-destructive font-medium">Failed to load rankings</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {error instanceof Error ? error.message : "An unexpected error occurred"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <Card className="sticky top-4 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:gap-2 sm:w-auto">
                            {userRank && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={scrollToUserPosition}
                                    className="flex items-center gap-1 px-3 bg-transparent w-full sm:w-auto"
                                    title="Go to your position"
                                >
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                    <span className="sm:inline">{`#${userRank}`}</span>
                                </Button>
                            )}
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:gap-2 sm:w-auto">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                <Select value={sortBy} onValueChange={handleSortChange}>
                                    <SelectTrigger className="w-full sm:w-48">
                                        <SelectValue placeholder="Sort by..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleSortDirection}
                                className="flex items-center gap-1 px-3 bg-transparent w-full sm:w-auto"
                                title={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
                            >
                                {getSortIcon()}
                                <span className="sm:inline">{sortDirection === "asc" ? "Asc" : "Desc"}</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Padding between sticky card and leaderboard */}
            <div className="h-4" />

            {isLoading && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                                <Skeleton className="h-6 w-32" />
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-20 rounded" />
                                <Skeleton className="h-5 w-16 rounded" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {[...Array(8)].map((_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                    </div>
                                    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                            <Skeleton className="h-3 w-28" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                    <div className="hidden lg:block">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <Skeleton className="h-4 w-12" />
                                            <Skeleton className="h-4 w-12" />
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center">
                                        <Skeleton className="h-8 w-20 rounded" />
                                    </div>
                                    <div className="sm:hidden">
                                        <Skeleton className="h-4 w-8" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            {!isLoading && processedStudents.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-8">
                            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No students found</h3>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? `No students match "${searchTerm}"` : "No students available for this campus"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
            {!isLoading && processedStudents.length > 0 && (
                <Card >
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Leaderboard</CardTitle>
                            <div className="flex items-center gap-2">
                                {userRank && (
                                    <Badge variant="outline" className="text-xs">
                                        Your Rank: #{userRank}
                                    </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                    {processedStudents.length} student{processedStudents.length !== 1 ? "s" : ""}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {processedStudents.map((student: PoolUser, index: number) => {
                                const position = sortDirection === "desc" ? index + 1 : processedStudents.length - index
                                const isCurrentUser = student.id === user?.id
                                return (
                                    <div
                                        key={student.id}
                                        ref={isCurrentUser ? userRowRef : null}
                                        className={`flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 ${isCurrentUser && highlightUser
                                            ? "bg-primary/10 border-l-4 border-primary"
                                            : isCurrentUser
                                                ? "bg-muted/30"
                                                : ""
                                            }`}
                                    >
                                        <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                                            {position <= 3 && sortDirection === "desc" ? (
                                                <div className="flex flex-col items-center">{getRankIcon(position)}</div>
                                            ) : (
                                                <div
                                                    className={`flex items-center justify-center w-8 h-8 rounded-full ${isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                                                        }`}
                                                >
                                                    <span
                                                        className={`text-sm font-bold ${isCurrentUser ? "text-primary-foreground" : "text-muted-foreground"
                                                            }`}
                                                    >
                                                        {position}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <Avatar className="h-12 w-12 flex-shrink-0">
                                            <AvatarImage
                                                src={student.photoUrl || "/placeholder.svg"}
                                                alt={student.name}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className={isCurrentUser ? "bg-primary/20 text-primary" : ""}>
                                                {student.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className={`font-semibold truncate ${isCurrentUser ? "text-primary" : ""}`}>
                                                    {student.name}
                                                    {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                                                </h3>
                                                <Badge variant="outline" className="text-xs">
                                                    Level {student.level}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                {student.currentProjects !== 420 && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-muted-foreground">
                                                            Current Projects:{" "}
                                                                {student.currentProjects}
                                                            </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">
                                                        Correction Points:{" "}
                                                        <span
                                                            className={`font-medium ${sortBy === "correctionPoints" ? "text-primary" : "text-foreground"
                                                                }`}
                                                        >
                                                            {student.correctionPoints}
                                                        </span>
                                                    </span>
                                                </div>
                                                {/* <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">
                                Wallet:{" "}
                                <span className={`font-medium ${sortBy === "wallet" ? "text-primary" : "text-foreground"}`}>
                                    {student.wallet}₳
                                </span>
                                </span>
                            </div> */}
                                            </div>
                                        </div>
                                        {student.examGrades && (
                                            <div className="hidden lg:block">
                                                <div className="text-xs text-muted-foreground mb-1">Exam Grades</div>
                                                <div className="grid grid-cols-2 gap-1"></div>
                                                {Object.entries(student.examGrades || {}).map(([exam, grade]) => (
                                                    <Badge
                                                        key={exam}
                                                        variant={grade > 0 ? "default" : "secondary"}
                                                        className="text-xs px-1.5 py-0.5"
                                                    >
                                                        {exam.replace("exam", "E")}: {grade}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        <div className="hidden sm:flex items-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    toast.info(`Viewing profile for ${student.name}`, {
                                                        duration: 2000,
                                                        position: "bottom-right",
                                                    })
                                                    window.open(`https://profile.intra.42.fr/users/${student?.name}`, "_blank")
                                                }}
                                                className="flex items-center gap-1 px-3 text-muted-foreground hover:text-foreground"
                                                title={`View ${student.name}'s profile`}
                                            >
                                                <Eye className="h-4 w-4" />
                                                <span className="text-xs">Profile</span>
                                            </Button>
                                        </div>
                                        <div className="sm:hidden">
                                            <Badge variant="outline" className="text-xs">
                                                #{position}
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
