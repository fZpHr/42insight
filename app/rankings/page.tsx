"use client"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { Search, Trophy, Medal, Award, User, ArrowUpDown, ArrowUp, ArrowDown, MapPin, Target, Eye, Briefcase } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Student, StudentSortOption } from "@/types"
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"
type SortDirection = "asc" | "desc"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"

const sortOptions: StudentSortOption[] = [
    { value: "level", label: "Level", key: "level" },
    { value: "wallet", label: "Wallet", key: "wallet" },
    { value: "correctionPoints", label: "Correction points", key: "correctionPoints" },
    { value: "correctionPercentage", label: "Correction ratio (validation / KO)", key: "correctionPercentage" },
    { value: "internship", label: "En stage", key: "work" },
    { value: "work_study", label: "En alternance", key: "work" },
]

export default function Rankings() {
    const { user, fetchCampusStudents } = useAuth()
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState<string>("level")
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
    const [selectedCampus, setSelectedCampus] = useState<string>("")
    const [highlightUser, setHighlightUser] = useState(false)
    const userRowRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<HTMLDivElement>(null)
    const [visibleCount, setVisibleCount] = useState(20)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [selectedYear, setSelectedYear] = useState<string>("all")

    const campusOptions = [
        { value: "Nice", label: "Nice" },
        { value: "Angoulême", label: "Angoulême" },
    ]

    const {
        data: students,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["campus-students", selectedCampus || user?.campus],
        queryFn: async () => {
            const campus = selectedCampus || user?.campus
            if (!campus) return []
            const response = await fetchCampusStudents(campus)
            if (!response || response.length === 0) {
                toast.error("No students found for this campus", {
                    duration: 2000,
                    position: "bottom-right",
                })
                return []
            }
            return response.map((student: Student) => ({
                ...student,
                activityData: typeof student.activityData === 'string' 
                    ? JSON.parse(student.activityData) 
                    : student.activityData
            }))
        },
        enabled: !!(selectedCampus || user?.campus),
        staleTime: 10 * 60 * 1000,
    })

    const sortStudents = (students: Student[], sortKey: keyof Student, direction: SortDirection) => {
      let effectiveDirection = direction
      if (sortKey === "correctionPercentage") {
        effectiveDirection = direction === "asc" ? "desc" : "asc"
      }
      return [...students].sort((a, b) => {
        let aValue = a[sortKey]
        let bValue = b[sortKey]
        if (effectiveDirection === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
    }

const processedStudents = students
  ? (() => {
      console.log(`Current sortBy value: ${sortBy}`);
      return sortStudents(
        students
          .filter((student: Student) => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .filter((student: Student) => {
            if (selectedYear === "all") return true;
            return student.year?.toString() === selectedYear;
          })
          .filter((student: Student) => {
            if (sortBy === "internship") {
              console.log(`Filtering for internship - Student ${student.name}: work = ${student.work}, type = ${typeof student.work}`);
              return student.work === 1;
            }
            if (sortBy === "work_study") {
              console.log(`Filtering for work_study - Student ${student.name}: work = ${student.work}, type = ${typeof student.work}`);
              return student.work === 2;
            }
            return true;
          })
          .filter((student: Student) => {
            if (sortBy === 'correctionPercentage') {
              return (
                typeof student.correctionPositive === "number" &&
                typeof student.correctionNegative === "number" &&
                (student.correctionPositive + student.correctionNegative) >= 10
              );
            }
            return true;
          }),
        // Si on filtre par "work", on trie par niveau par défaut. Sinon, on utilise le tri sélectionné.
        (sortBy === "internship" || sortBy === "work_study") ? "level" : (sortOptions.find((option) => option.value === sortBy)?.key || "level"),
        sortDirection,
      )
    })()
  : []

    const visibleStudents = processedStudents.slice(0, visibleCount)
    const hasMore = visibleCount < processedStudents.length

    const loadMoreStudents = () => {
        if (hasMore && !isLoadingMore) {
            setIsLoadingMore(true)
            setTimeout(() => {
                setVisibleCount(prev => Math.min(prev + 20, processedStudents.length))
                setIsLoadingMore(false)
            }, 100)
        }
    }

    const userPosition = processedStudents.findIndex((student: Student) => student.id === user?.id)
    const userRank =
        userPosition !== -1 ? (sortDirection === "desc" ? userPosition + 1 : processedStudents.length - userPosition) : null

    useEffect(() => {
        if (!observerRef.current || !hasMore) {
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLoadingMore) {
                    loadMoreStudents()
                }
            },
            { threshold: 1.0 }
        )

        if (observerRef.current) {
            observer.observe(observerRef.current)
        }

        return () => observer.disconnect()
    }, [hasMore, isLoadingMore, visibleCount])

    useEffect(() => {
        setVisibleCount(20)
    }, [searchTerm, sortBy, sortDirection, selectedCampus])

    const scrollToUserPosition = () => {
        const userPosition = processedStudents.findIndex((student: Student) => student.id === user?.id)
        if (userPosition === -1) return
        if (userPosition >= visibleCount) {
            setVisibleCount(userPosition + 21)
            setTimeout(() => {
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
                    }, 100)
                }
            }, 50)
        } else {
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
                }, 100)
            }
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
        <div className="max-w-7xl mx-auto px-4 space-y-6">
            <Card className="lg:sticky lg:top-4 lg:z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto">
                            {userRank && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={scrollToUserPosition}
                                    className="flex items-center gap-1 px-3 bg-transparent w-full sm:w-auto"
                                    title="Go to your position"
                                >
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                    <span className="hidden sm:inline">#{userRank}</span>
                                </Button>
                            )}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full"
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-auto">
                            {/* Desktop view - show controls directly */}
                            <div className="hidden sm:flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-full sm:w-32">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Years</SelectItem>
                                            <SelectItem value="2024">2024</SelectItem>
                                            <SelectItem value="2023">2023</SelectItem>
                                            <SelectItem value="2022">2022</SelectItem>
                                            <SelectItem value="2021">2021</SelectItem>
                                            <SelectItem value="2020">2020</SelectItem>
                                            <SelectItem value="2019">2019</SelectItem>
                                            <SelectItem value="2018">2018</SelectItem>
                                            <SelectItem value="2017">2017</SelectItem>
                                            <SelectItem value="2016">2016</SelectItem>
                                            <SelectItem value="2015">2015</SelectItem>
                                            <SelectItem value="2014">2014</SelectItem>
                                            <SelectItem value="2013">2013</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <Select value={selectedCampus || user?.campus} onValueChange={setSelectedCampus}>
                                        <SelectTrigger className="w-full sm:w-32">
                                            <SelectValue placeholder="Campus" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {campusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                    <span className="hidden sm:inline">{sortDirection === "asc" ? "Asc" : "Desc"}</span>
                                </Button>
                            </div>

                            {/* Mobile view - show controls in accordion */}
                            <div className="sm:hidden w-full">
                                <Accordion type="single" collapsible>
                                    <AccordionItem value="filters" className="border-0">
                                        <AccordionTrigger className="py-2 px-3 hover:no-underline">
                                            <div className="flex items-center gap-2">
                                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">Filters & Sorting</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-2">
                                            <div className="flex flex-col gap-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Year" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">All Years</SelectItem>
                                                            <SelectItem value="2024">2024</SelectItem>
                                                            <SelectItem value="2023">2023</SelectItem>
                                                            <SelectItem value="2022">2022</SelectItem>
                                                            <SelectItem value="2021">2021</SelectItem>
                                                            <SelectItem value="2020">2020</SelectItem>
                                                            <SelectItem value="2019">2019</SelectItem>
                                                            <SelectItem value="2018">2018</SelectItem>
                                                            <SelectItem value="2017">2017</SelectItem>
                                                            <SelectItem value="2016">2016</SelectItem>
                                                            <SelectItem value="2015">2015</SelectItem>
                                                            <SelectItem value="2014">2014</SelectItem>
                                                            <SelectItem value="2013">2013</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <Select value={selectedCampus || user?.campus} onValueChange={setSelectedCampus}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Campus" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {campusOptions.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                                    <Select value={sortBy} onValueChange={handleSortChange}>
                                                        <SelectTrigger className="w-full">
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
                                                    className="flex items-center gap-1 px-3 bg-transparent w-full"
                                                    title={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
                                                >
                                                    {getSortIcon()}
                                                    <span>{sortDirection === "asc" ? "Ascending" : "Descending"}</span>
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {isLoading && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-5 w-16" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {[...Array(8)].map((_, index) => (
                                <div key={index} className="flex items-center gap-4 p-4">
                                    <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                    </div>
                                    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="h-3 w-28" />
                                            <Skeleton className="h-3 w-22" />
                                        </div>
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
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                                Leaderboard
                            </CardTitle>
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
                            {visibleStudents.map((student: Student, index: number) => {
                                const position = sortDirection === "desc" ? index + 1 : processedStudents.length - index
                                const isCurrentUser = student.id === user?.id

                                // DEBUG: Log pour vérifier la valeur de 'work'
                                // console.log(`Student: ${student.name}, work value: ${student.work}, typeof: ${typeof student.work}`);

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

                                        <Avatar className="h-12 w-12 flex-shrink-0 hidden sm:block">
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
                                                {student.work === 1 && (
                                                    <span title="En stage">
                                                        <Briefcase className="h-4 w-4 flex-shrink-0 text-green-500" />
                                                    </span>
                                                )}
                                                {student.work === 2 && (
                                                    <span title="En alternance">
                                                        <Briefcase className="h-4 w-4 flex-shrink-0 text-blue-500" />
                                                    </span>
                                                )}
                                                <Badge variant="outline" className="text-xs">
                                                    Level {student.level}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                {student.correctionPercentage !== 420 && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-muted-foreground">
                                                            Correction:{" "}
                                                            <span
                                                                className={`font-medium ${sortBy === "correctionPercentage" ? "text-primary" : "text-foreground"}`}
                                                            >
                                                                {student.correctionPercentage}%
                                                            </span>
                                                        </span>
                                                    </div>
                                                )}
                                                {student.correctionPercentage !== 420 && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-muted-foreground">
                                                            <span className="font-medium text-foreground">{student.correctionPositive}</span>
                                                            <span className="mx-1">/</span>
                                                            <span className="font-medium text-muted-foreground">{student.correctionNegative}</span>
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">
                                                        Correction Points:{" "}
                                                        <span
                                                            className={`font-medium ${sortBy === "correctionPoints" ? "text-primary" : "text-foreground"}`}
                                                        >
                                                            {student.correctionPoints}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">
                                                        Wallet:{" "}
                                                        <span className={`font-medium ${sortBy === "wallet" ? "text-primary" : "text-foreground"}`}>
                                                            {student.wallet}₳
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {student.activityData && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 h-8 relative sm:w-24 sm:h-10">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={student.activityData.dailyHours}>
                                                            <Line
                                                                type="monotone"
                                                                dataKey="value"
                                                                stroke="#ffff"
                                                                strokeWidth={2}
                                                                dot={false}
                                                                strokeLinecap="round"
                                                            />
                                                            <Tooltip
                                                                content={({ active, payload, label }) => {
                                                                    if (active && payload && payload.length) {
                                                                        return (
                                                                            <div className="bg-popover border rounded-md p-2 shadow-md">
                                                                                <p className="text-xs font-medium">
                                                                                    {payload[0].value}h on day {label}
                                                                                </p>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="text-xs space-y-0.5">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-semibold text-foreground">{Math.round(student.activityData.totalTime / 60)}h</span>
                                                        <span className="text-muted-foreground">total</span>
                                                    </div>
                                                    {student.activityData.dailyHours && student.activityData.dailyHours.length > 0 && (
                                                        <div className="text-muted-foreground">
                                                            {student.activityData.dailyHours.length} days
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center">
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
                                                <span className="text-xs hidden sm:inline">Profile</span>
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                            {hasMore && (
                                <div
                                    ref={observerRef}
                                    className="flex items-center justify-center p-4"
                                >
                                    {isLoadingMore ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                                            <span className="text-sm text-muted-foreground">Loading more students...</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            Scroll to load more ({processedStudents.length - visibleCount} remaining)
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
