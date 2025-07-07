"use client"

import * as React from "react"
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface Student {
    id: number
    name: string
    photo: string
    grade: number
    lastUpdate: Date
    examId: string
    occurence: number
    isToday: boolean
}

function getExamName(examId: string) {
    switch (examId) {
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
    const [students, setStudents] = useState<Student[]>([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)


    const isToday = (): boolean => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        return dayOfWeek === 3 || dayOfWeek === 4;
    }

    const updateData = async () => {
        if (!isToday()) {
            setError("Today is not an exam day. Exams are held on Wednesdays and Thursdays.");
            return;
        }
        try {
            setIsUpdating(true);
            const response = await fetch("/api/current_exam");
            if (response.ok) {
                const data = await response.json();
                const uniqueData = Array.isArray(data)
                    ? data
                        .filter((student: Student, index: number, self: Student[]) =>
                            index === self.findIndex((s) => s.id === student.id)
                        )
                        .sort((a: Student, b: Student) => b.grade - a.grade)
                    : data;
                
                setStudents(uniqueData);
            }
            setIsUpdating(false);
        } catch (error) {
            console.error('Error fetching students:', error)
        }
    }

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (!isToday()) {
            setError("Today is not an exam day. Exams are held on Wednesdays and Thursdays.");
            return;
        }
        updateData();
        interval = setInterval(() => {
            updateData();
        }, 10000);
        return () => clearInterval(interval);
    }, []);


    const getGradeBadgeColor = (grade: number) => {
        if (grade >= 90) return 'bg-green-500'
        if (grade >= 80) return 'bg-blue-500'
        if (grade >= 70) return 'bg-yellow-500'
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
                    <p className="text-muted-foreground">Data is updated every 5 min</p> 
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {isUpdating && students.length === 0 && (
                        <Table className="mt-5">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Exam</TableHead>
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

                    {students.length === 0 && !isUpdating && !error && (
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
                            <Table className="mt-5">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead>Exam</TableHead>
                                        <TableHead>Last push</TableHead>
                                        <TableHead>Try</TableHead>
                                        <TableHead>Intra</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center space-x-3">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={student.photo} alt={student.name} style={{ objectFit: 'cover' }} />
                                                        <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                    </Avatar>
                                                    <span>{student.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getGradeBadgeColor(student.grade || 0)}>
                                                    {student.grade !== undefined ? `${student.grade}%` : 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{getExamName(student.examId)}</TableCell>
                                            <TableCell>{new Date(student.lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                            <TableCell>{student.occurence}</TableCell>
                                            <TableCell>
                                                <Link href={`https://profile.intra.42.fr/users/${student.name}`} target="_blank" className="flex items-center text-blue-500 hover:underline">
                                                    View Profile
                                                    <ExternalLink className="ml-1 h-4 w-4" />
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </CardContent>
            </Card >
        </div>
    )
}