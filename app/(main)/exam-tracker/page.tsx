"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ExamStudent } from "@/types"
import { useSession } from "next-auth/react"
import { useExamFriends } from "@/hooks/use-exam-friends"
import { TransparentBadge } from "@/components/TransparentBadge";
import { useCampus } from "@/contexts/CampusContext";
import { LoadingScreen } from "@/components/LoadingScreen";

function getExamName(examId: string) {
    switch (examId) {
        case '1301':
            return 'C Piscine Exam 00'
        case '1302':
            return 'C Piscine Exam 01'
        case '1303':
            return 'C Piscine Exam 02'
        case '1304':
            return 'C Piscine Exam Final'
        case '1324':
            return 'Exam Rank 06'
        case '1323':
            return 'Exam Rank 05'
        case '1322':
            return 'Exam Rank 04'
        case '1321':
            return 'Exam Rank 03'
        case '1320':
            return 'Exam Rank 02'
    }
}

export default function ExamTracker() {
    const { data: session, status } = useSession();
    const { selectedCampus } = useCampus();
    const effectiveCampus = selectedCampus || session?.user?.campus;
    const { friends, toggleFriend, isFriend } = useExamFriends();
    // Nothing is fetched until it is asked for: an exam sweep costs a few
    // pages on the visitor's own key.
    const [wantExam, setWantExam] = React.useState(false);
    const [showTimeoutError, setShowTimeoutError] = React.useState(false);


    // There used to be an isExamDay() here that returned true on Wednesday,
    // Thursday and Friday. It contradicted the schedule printed on this very
    // page (Nice sits rank exams on Tuesday and Thursday) and it guessed at
    // something the API knows: the route asks the campus for its exams.
    React.useEffect(() => {
        if (!wantExam) return;
        
        const timer = setTimeout(() => {
            setShowTimeoutError(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, [effectiveCampus]);

    const { data: students = [], isLoading, error, isSuccess, isFetching, refetch } = useQuery({
        queryKey: ['current_exam', effectiveCampus],
        queryFn: async () => {
            // Naming the campus is what keeps this to one exam sweep. Without
            // it the route has 54 to choose from and no way to choose.
            const query = effectiveCampus ? `?campus=${encodeURIComponent(effectiveCampus)}` : "";
            const response = await fetch(`/api/current_exam${query}`);
            if (!response.ok) {
                throw new Error('Failed to fetch students');
            }
            const data = await response.json();
            return Array.isArray(data)
                ? data
                    .filter((student: ExamStudent, index: number, self: ExamStudent[]) =>
                        index === self.findIndex((s) => s.id === student.id)
                    )
                    .sort((a: ExamStudent, b: ExamStudent) => b.grade - a.grade)
                : data;
        },
        enabled: wantExam,
        refetchInterval: wantExam ? 600000 : false,
    })


    const getGradeBadgeColor = (grade: number) => {
        if (grade >= 90) return 'bg-green-500'
        if (grade >= 80) return 'bg-blue-500'
        if (grade >= 70) return 'bg-yellow-500'
        if (grade >= 60) return 'bg-orange-500'
        if (grade >= 50) return 'bg-purple-500'
        if (grade >= 40) return 'bg-pink-500'
        if (grade >= 30) return 'bg-indigo-500'
        return 'bg-red-500'
    }

    // The route is asked for one campus and answers for that campus, so there
    // is nothing left to filter here. This used to sift Nice out of Angouleme
    // client-side, from when both arrived in the same response.
    const studentsToShow = React.useMemo(() => {
        return [...students].sort((a: ExamStudent, b: ExamStudent) => {
            const aIsFriend = isFriend(a.id);
            const bIsFriend = isFriend(b.id);

            if (aIsFriend && !bIsFriend) return -1;
            if (!aIsFriend && bIsFriend) return 1;

            return b.grade - a.grade;
        });
    }, [students, friends]);

    const averageGrade = Array.isArray(studentsToShow) && studentsToShow.length > 0
        ? studentsToShow.reduce((sum, student) => sum + (student.grade || 0), 0) / studentsToShow.length
        : 0;


    let scheduleInfo: React.ReactNode = null;
    if (effectiveCampus === "Nice") {
        scheduleInfo = (
            <Alert variant="default" className="mb-4">
                <AlertTitle>Nice Exam Schedule</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc ml-5">
                        <li><b>C Piscine Exams</b>: Every <b>Friday</b> <span className="block text-xs text-muted-foreground">(Only during Piscine periods)</span></li>
                        <li><b>Rank Exams</b>: Every <b>Tuesday</b> from <b>14:00</b> to <b>17:00</b> and <b>Thursday</b> from <b>08:00</b> to <b>15:00</b></li>
                    </ul>
                </AlertDescription>
            </Alert>
        );
    } else if (effectiveCampus === "Angouleme") {
        scheduleInfo = (
            <Alert variant="default" className="mb-4">
                <AlertTitle>Angoulême Exam Schedule</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc ml-5">
                        <li><b>C Piscine Exams</b>: Every <b>Friday</b> <span className="block text-xs text-muted-foreground">(Only during Piscine periods)</span></li>
                        <li><b>Rank Exams</b>: Every <b>Wednesday</b> from <b>08:00</b> to <b>12:00</b> and <b>Thursday</b> from <b>08:00</b> to <b>15:00</b></li>
                    </ul>
                </AlertDescription>
            </Alert>
        );
    } else {
        scheduleInfo = (
            <Alert variant="default" className="mb-4">
                <AlertTitle>Exam Schedule</AlertTitle>
                <AlertDescription>
                    <span>
                        No recurring schedule is written down here for {effectiveCampus || "this campus"}.
                        The exams below are the ones 42 has on its agenda right now.
                    </span>
                </AlertDescription>
            </Alert>
        );
    }


    if ((isLoading || isFetching) && !isSuccess) {
        return <LoadingScreen message="Loading exam tracker..." />;
    }


    if (!wantExam) {
        return (
            <div className="max-w-7xl mx-auto px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Exam Tracker</CardTitle>
                        <p className="text-muted-foreground">
                            Live marks for the exam being sat right now, read from
                            the 42 API on your own key.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {scheduleInfo}
                        <Button onClick={() => setWantExam(true)} className="gap-2">
                            Load exam results
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                Exam Tracker
                                <span title="In development" className="ml-2 text-yellow-500 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-xs font-semibold">In development</span>
                                </span>
                            </CardTitle>
                            <p className="text-muted-foreground">
                                Refreshed every 10 minutes while this page is open.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            aria-label="Refresh exam results"
                            className="shrink-0"
                        >
                            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Message d'erreur après timeout */}
                    {showTimeoutError && (!isSuccess || students.length === 0) && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>42 API Issue</AlertTitle>
                            <AlertDescription className="flex items-center justify-between">
                                <span>
                                    The 42 API is taking longer than expected to respond. Please wait
                                    a moment and refresh the page.
                                </span>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="ml-4 shrink-0 px-3 py-1 text-sm border rounded hover:bg-accent"
                                >
                                    Refresh
                                </button>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {scheduleInfo}
                    {isLoading && students.length === 0 && (
                        <Table className="mt-5">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Last Update</TableHead>
                                    <TableHead>Try</TableHead>
                                    <TableHead>Intra</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(5)].map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-500 rounded-full animate-pulse"></div>
                                                <div className="h-4 bg-gray-500 rounded w-24 animate-pulse"></div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-500 rounded w-12 animate-pulse"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-500 rounded w-20 animate-pulse"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-500 rounded w-16 animate-pulse"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-500 rounded w-16 animate-pulse"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 bg-gray-500 rounded w-16 animate-pulse"></div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {studentsToShow.length === 0 && !isLoading && (
                        <Alert variant="default" className="mt-5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No students found</AlertTitle>
                            <AlertDescription className="flex items-center justify-between gap-4 text-muted-foreground">
                                <span>Exam hasn't started yet, or nobody has been graded so far. Check again in a moment.</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                    className="shrink-0 gap-2"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                                    {isFetching ? "Checking…" : "Check again"}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {studentsToShow.length > 0 && (
                        <>
                            <p><strong>Total Students:</strong> {studentsToShow.length}</p>
                            <p><strong>Average Grade:</strong> {averageGrade.toFixed(2)}%</p>
                            <div className="mt-4 mb-6"></div>
                                                        <TransparentBadge
                                text="🫂 Click on a student row to highlight them"
                                bgColor="bg-green-400/20"
                                textColor="text-green-300"
                            />
                            <div className="mt-4 mb-3"></div>

                            <div className="overflow-x-auto">
                                <Table className="min-w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[200px]">Student</TableHead>
                                            <TableHead className="min-w-[100px]">Grade</TableHead>
                                            <TableHead className="min-w-[120px] hidden md:table-cell">Last push</TableHead>
                                            <TableHead className="min-w-[60px] hidden lg:table-cell">Try</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentsToShow.map((student: ExamStudent) => {
                                            const isStudentFriend = isFriend(student.id);
                                            return (
                                                <TableRow
                                                    key={student.id}
                                                    onClick={() => toggleFriend(student.id)}
                                                    className={`cursor-pointer ${isStudentFriend ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50"}`}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center space-x-3">
                                                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                                                                <AvatarImage src={student.photo} alt={student.name} style={{ objectFit: 'cover' }} />
                                                                <AvatarFallback className="text-xs sm:text-sm">{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium" title={student.name}>{student.name}</p>
                                                                <p
                                                                    className="truncate text-sm text-muted-foreground"
                                                                    title={getExamName(student.examId) ?? `Exam ${student.examId}`}
                                                                >
                                                                    {getExamName(student.examId) ?? `Exam ${student.examId}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getGradeBadgeColor(student.grade || 0)}>
                                                            {student.grade !== undefined ? `${student.grade}%` : 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">{new Date(student.lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                    <TableCell className="hidden lg:table-cell">{student.occurence}</TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Link href={`https://profile.intra.42.fr/users/${student.name}`} target="_blank" className="flex items-center text-muted-foreground hover:underline">
                                                            <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card >
        </div>
    )
}
