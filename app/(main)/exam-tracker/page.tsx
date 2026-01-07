"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from 'lucide-react'
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
    const [showTimeoutError, setShowTimeoutError] = React.useState(false);

    // Vérifier si c'est un jour d'examen (mercredi, jeudi, vendredi)
    const isExamDay = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Dimanche, 3 = Mercredi, 4 = Jeudi, 5 = Vendredi
        return dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5;
    };

    // Timeout pour afficher un message d'erreur après 15 secondes
    React.useEffect(() => {
        if (!isExamDay()) return; // Pas de timeout si ce n'est pas un jour d'examen
        
        const timer = setTimeout(() => {
            setShowTimeoutError(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, [effectiveCampus]);

    const { data: students = [], isLoading, error, isSuccess, isFetching } = useQuery({
        queryKey: ['current_exam'],
        queryFn: async () => {
            // Si ce n'est pas un jour d'examen, retourner un tableau vide
            if (!isExamDay()) {
                return [];
            }

            const response = await fetch("/api/current_exam");
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
        enabled: isExamDay(), // Désactiver la query si ce n'est pas un jour d'examen
        refetchInterval: isExamDay() ? 600000 : false, // Refetch seulement les jours d'examen
        refetchOnMount: 'always',
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

    const studentsNice = students.filter((s: any) => s.campus === "Nice");
    const studentsAngouleme = students.filter((s: any) => s.campus === "Angouleme");
    const studentsFiltered = effectiveCampus === "Angouleme" ? studentsAngouleme : effectiveCampus === "Nice" ? studentsNice : students;

    const studentsToShow = React.useMemo(() => {
        return [...studentsFiltered].sort((a: ExamStudent, b: ExamStudent) => {
            const aIsFriend = isFriend(a.id);
            const bIsFriend = isFriend(b.id);

            if (aIsFriend && !bIsFriend) return -1;
            if (!aIsFriend && bIsFriend) return 1;

            return b.grade - a.grade;
        });
    }, [studentsFiltered, friends]);

    const averageGrade = Array.isArray(studentsToShow) && studentsToShow.length > 0
        ? studentsToShow.reduce((sum, student) => sum + (student.grade || 0), 0) / studentsToShow.length
        : 0;

    // Campus-specific exam schedule info
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
                    <span>Exam scheduling information is only available for Nice and Angoulême campuses.</span>
                </AlertDescription>
            </Alert>
        );
    }

    // Protection: Afficher le loading tant que les données ne sont pas chargées
    if (!showTimeoutError && ((isLoading || isFetching) && !isSuccess && isExamDay())) {
        return <LoadingScreen message="Loading exam tracker..." />;
    }

    // Message si ce n'est pas un jour d'examen
    if (!isExamDay()) {
        return (
            <div className="max-w-7xl mx-auto px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            Exam Tracker
                            <span title="In development" className="ml-2 text-yellow-500 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold">In development</span>
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {scheduleInfo}
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No Exam Today</AlertTitle>
                            <AlertDescription>
                                Exams are typically scheduled on <strong>Wednesday</strong>, <strong>Thursday</strong>, and <strong>Friday</strong>.
                                Check back on these days to track ongoing exams.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        Exam Tracker
                        <span title="In development" className="ml-2 text-yellow-500 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-semibold">In development</span>
                        </span>
                    </CardTitle>
                    <p className="text-muted-foreground">Data is updated every 10 min</p>
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
                            <AlertDescription className="text-muted-foreground">Exam hasn't started yet.</AlertDescription>
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
