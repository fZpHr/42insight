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
    
    const isToday = (): boolean => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        return dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5;
    }

    const { data: students = [], isLoading, error } = useQuery({
        queryKey: ['current_exam'],
        queryFn: async () => {
            
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
        refetchInterval: 600000,
        enabled: isToday(),
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

    const averageGrade = Array.isArray(students) && students.length > 0
        ? students.reduce((sum, student) => sum + (student.grade || 0), 0) / students.length
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Exam Tracker</CardTitle>
                    <p className="text-muted-foreground">Data is updated every 10 min</p> 
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-bold">Error</AlertTitle>
                            <AlertDescription className="text-muted-foreground">{error instanceof Error ? error.message : String(error)}</AlertDescription>
                        </Alert>
                    )}

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

                    {students.length === 0 && !isLoading && !error && (
                        <Alert variant="default" className="mt-5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No students found</AlertTitle>
                            <AlertDescription className="text-muted-foreground">Exam hasn't started yet.</AlertDescription>
                        </Alert>
                    )}

                    {students.length > 0 && (
                        <>
                            <p><strong>Total Students:</strong> {students.length}</p>
                            <p><strong>Average Grade:</strong> {averageGrade.toFixed(2)}%</p>
                            <div className="mt-4 mb-6"></div>
                            <div className="overflow-x-auto">
                                <Table className="min-w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[200px]">Student</TableHead>
                                            <TableHead className="min-w-[100px]">Grade</TableHead>
                                            <TableHead className="min-w-[120px] hidden md:table-cell">Last push</TableHead>
                                            <TableHead className="min-w-[60px] hidden lg:table-cell">Try</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student: ExamStudent) => (
                                            <TableRow key={student.id}>
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
                                                <TableCell>
                                                    <Link href={`https://profile.intra.42.fr/users/${student.name}`} target="_blank" className="flex items-center text-muted-foreground   hover:underline">
                                                        <ExternalLink className="ml-1 h-4 w-4 flex-shrink-0" />
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
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