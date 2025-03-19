"use client"

import * as React from "react"
import axios from 'axios'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { isToday } from "date-fns"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { Checkbox } from "./ui/checkbox"
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

async function getRequestsLeft(CLIENT_ID: string, CLIENT_SECRET: string) {
    const response = await axios.post('/api/proxy', {
        endpoint: '/users/norminet',
        CLIENT_ID,
        CLIENT_SECRET
    })

    return response.data.headers['x-hourly-ratelimit-remaining']
}

async function getAllSubscribedStudents(CLIENT_ID: string, CLIENT_SECRET: string) {
    let initialStudents: Student[] = []
    const exam_id = ["1324", "1323", "1322", "1321", "1320"]

    for (let i = 0; i < exam_id.length; i++) {
        try {
            const response = await axios.post('/api/proxy', {
                endpoint: `/projects/${exam_id[i]}/users?filter[primary_campus_id]=31&per_page=100`,
                CLIENT_ID,
                CLIENT_SECRET
            })

            const studentsData = response.data.data.map((student: { id: number; login: string; image: { versions: { small: string } } }) => ({
                id: student.id,
                name: student.login,
                photo: student.image.versions.small,
                grade: 0,
                occurence: 0,
                lastUpdate: new Date(),
                examId: exam_id[i],
                isToday: false
            }))
            initialStudents = [...initialStudents, ...studentsData.filter((student: Student) => !initialStudents.some(s => s.id === student.id))]
        } catch (error) {
            console.error('Error fetching students:', error)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
    }
    return initialStudents
}

async function getGrades(CLIENT_ID: string, CLIENT_SECRET: string, students: Student[], setActiveStudents: React.Dispatch<React.SetStateAction<Student[]>>) {
    for (let i = 0; i < students.length; i += 18) {
        const batch = students.slice(i, i + 18)
        const userIds = batch.map(student => student.id).join(',')

        try {
            const response = await axios.post('/api/proxy', {
                endpoint: `/projects_users?filter[project_id]=${batch.map(student => student.examId).join(',')}&per_page=100&filter[user_id]=${userIds}`,
                CLIENT_ID,
                CLIENT_SECRET
            })

            const projectUsers = response.data.data

            for (const projectUser of projectUsers) {
                const student = batch.find(s => s.id === projectUser.user.id)
                if (student) {
                    student.grade = projectUser.teams[projectUser.teams.length - 1].final_mark || 0
                    student.lastUpdate = new Date(projectUser.updated_at)
                    student.occurence = projectUser.occurrence + 1
                    student.isToday = isToday(new Date(projectUser.retriable_at))
                }
            }
        } catch (error) {
            console.error('Error fetching grades:', error)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
    }
    students = Array.isArray(students) ? students.filter(student => student.isToday) : []
    //students = students.slice(0, 5) # for debugging
    students.sort((a, b) => b.grade - a.grade)
    setActiveStudents(students)
    return students
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
    const [activeStudents, setActiveStudents] = useState<Student[]>([])
    const [keepKeys, setKeepKeys] = useState(false)
    const [apiKey1, setApiKey1] = useState('')
    const [apiKey2, setApiKey2] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [requestsLeft, setRequestsLeft] = useState<number | null>(null)
    const [autoUpdate, setAutoUpdate] = useState(false)

    const updateGrades = async () => {
        setIsUpdating(true);
        setError(null);

        try {
            let initialStudents = students;

            const today = new Date();
            const dayOfWeek = today.getDay();
            const isExamDay = dayOfWeek === 3 || dayOfWeek === 4;

            if (!isExamDay) {
                setError("Today is not an exam day. Exams are held on Wednesdays and Thursdays.");
                setIsUpdating(false);
                return;
            }

            const cachedStudentsResponse = await fetch("/api/cacheExamData");
            if (cachedStudentsResponse.ok) {
                const cachedStudents = await cachedStudentsResponse.json();
                setStudents(cachedStudents);
                return;
            }

            if (students.length === 0) {
                initialStudents = await getAllSubscribedStudents(apiKey1, apiKey2);
            }

            const updatedStudents = activeStudents.length > 0
                ? await getGrades(apiKey1, apiKey2, activeStudents, setActiveStudents)
                : await getGrades(apiKey1, apiKey2, initialStudents, setStudents);

            setStudents(updatedStudents);

            await fetch("/api/cache", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ students: updatedStudents }),
            });

            const requestsLeft = await getRequestsLeft(apiKey1, apiKey2);
            setRequestsLeft(requestsLeft);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while updating grades.");
        } finally {
            setIsUpdating(false);
        }
    };


    const updateChecked = (checked: boolean) => {
        setKeepKeys(checked)
        if (!checked) {
            localStorage.removeItem('apiKey1')
            localStorage.removeItem('apiKey2')
        }
        else {
            localStorage.setItem('apiKey1', btoa(apiKey1))
            localStorage.setItem('apiKey2', btoa(apiKey2))
        }
    }

    const updateAutoUpdate = (checked: boolean) => {
        setAutoUpdate(checked)
        if (!checked) {
            localStorage.removeItem('autoUpdate')
        }
        else
            localStorage.setItem('autoUpdate', checked.toString())
    }

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const today = new Date();
        const dayOfWeek = today.getDay();
        const isExamDay = dayOfWeek === 3 || dayOfWeek === 4;

        if (!isExamDay) {
            setError("Today is not an exam day. Exams are held on Wednesdays and Thursdays.");
            setIsUpdating(false);
            return;
        }

        fetch("/api/cache")
            .then(res => res.json())
            .then(data => {
                if (data) setStudents(data);
            })
            .catch(() => console.log("No cached data found"));

        if (autoUpdate && !isUpdating) {
            interval = setInterval(updateGrades, 120000);
        }

        return () => clearInterval(interval);
    }, []);


    const getGradeBadgeColor = (grade: number) => {
        if (grade >= 90) return 'bg-green-500'
        if (grade >= 80) return 'bg-blue-500'
        if (grade >= 70) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    useEffect(() => {
        const storedApiKey1 = localStorage.getItem('apiKey1') ? atob(localStorage.getItem('apiKey1')!) : '';
        const storedApiKey2 = localStorage.getItem('apiKey2') ? atob(localStorage.getItem('apiKey2')!) : '';
        if (storedApiKey1) setApiKey1(storedApiKey1);
        if (storedApiKey2) setApiKey2(storedApiKey2);
        if (localStorage.getItem('autoUpdate')) setAutoUpdate(true);
        setKeepKeys(!!(storedApiKey1 && storedApiKey2));
    }, []);
    const averageGrade = Array.isArray(students) && students.length > 0
        ? students.reduce((sum, student) => sum + (student.grade || 0), 0) / students.length
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Exam Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="api-key-1">CLIENT_ID</Label>
                                <Input
                                    id="api-key-1"
                                    type="login"
                                    placeholder="Enter your CLIENT_ID"
                                    value={apiKey1}
                                    onChange={(e) => setApiKey1(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="api-key-2">CLIENT_SECRET</Label>
                                <Input
                                    id="api-key-2"
                                    type="password"
                                    placeholder="Enter your CLIENT_SECRET"
                                    value={apiKey2}
                                    onChange={(e) => setApiKey2(e.target.value)}
                                />
                            </div>
                            <div className="flex items-end space-x-4">
                                <Button onClick={updateGrades} disabled={isUpdating || !apiKey1 || !apiKey2}>
                                    {isUpdating ? 'Updating...' : 'Update Grades'}
                                </Button>
                            </div>
                        </div>
                        <div className="items-top flex space-x-2">
                            <Checkbox
                                id="save-keys"
                                checked={keepKeys}
                                onCheckedChange={(checked: boolean) => updateChecked(checked)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="save-keys"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Save API keys for future use
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    Store your API keys in your local storage
                                </p>
                            </div>
                            <Checkbox
                                id="save-keys"
                                checked={autoUpdate}
                                onCheckedChange={(checked: boolean) => updateAutoUpdate(checked)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="save-keys"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Auto-Update Grades
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically update grades every 2 minutes
                                </p>
                            </div>
                        </div>
                    </div>
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

                    {students.length === 0 && !isUpdating && requestsLeft !== null && (
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
                            {requestsLeft !== null && (
                                <p><strong>Requests Left:</strong> {requestsLeft}</p>)}
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
                                                <Link href={`https://profile.intra.42.fr/users/${student.id}`} target="_blank" className="flex items-center text-blue-500 hover:underline">
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
