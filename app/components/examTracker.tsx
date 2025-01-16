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
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar"
import { Checkbox } from "./ui/checkbox"


interface Student {
    id: number
    name: string
    photo: string
    grade: number
    lastUpdate: Date
    examId: string
    isToday: boolean
}

async function getRequestsLeft(CLIENT_ID: string, CLIENT_SECRET: string) {
    const accessToken = await getToken(CLIENT_ID, CLIENT_SECRET)
    const response = await axios.get('https://api.intra.42.fr/v2/users/norminet', {
        headers: { Authorization: `Bearer ${accessToken}` },
    })

    const requestsLeft = response.headers['x-hourly-ratelimit-remaining'];
    return requestsLeft;
}


async function getToken(CLIENT_ID: string, CLIENT_SECRET: string) {
    const response = await axios.post('https://api.intra.42.fr/oauth/token', {
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
    })

    return response.data.access_token
}

async function getAllSubscribedStudents(CLIENT_ID: string, CLIENT_SECRET: string) {
    let initialStudents: Student[] = []
    const exam_id = ["1324", "1323", "1322", "1321", "1320"]

    const accessToken = await getToken(CLIENT_ID, CLIENT_SECRET)
    for (let i = 0; i < exam_id.length; i++) {
        try {
            const response = await axios.get(`https://api.intra.42.fr/v2/projects/${exam_id[i]}/users?filter[primary_campus_id]=31&per_page=100`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            const studentsData = response.data.map((student: { id: number; login: string; image: { versions: { small: string } } }) => ({
                id: student.id,
                name: student.login,
                photo: student.image.versions.small,
                grade: 0,
                lastUpdate: new Date(),
                examId: exam_id[i],
                isToday: false
            }))
            initialStudents = [...initialStudents, ...studentsData.filter((student: Student) => !initialStudents.some(s => s.id === student.id))]
        } catch (error) {
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return initialStudents
}

async function getGrades(CLIENT_ID: string, CLIENT_SECRET: string, students: Student[]) {
    const accessToken = await getToken(CLIENT_ID, CLIENT_SECRET)

    for (let i = 0; i < students.length; i += 20) {
        const batch = students.slice(i, i + 20)
        const userIds = batch.map(student => student.id).join(',')

        try {
            const response = await axios.get(`https://api.intra.42.fr/v2/projects_users?filter[project_id]=${batch.map(student => student.examId).join(',')}&per_page=100&filter[user_id]=${userIds}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            const projectUsers = response.data

            for (const projectUser of projectUsers) {
                const student = batch.find(s => s.id === projectUser.user.id)
                if (student) {
                    student.grade = projectUser.final_mark || 0
                    student.lastUpdate = new Date(projectUser.updated_at)
                    student.isToday = isToday(new Date(projectUser.retriable_at))
                }
            }
        } catch (error) {
            console.error('Error fetching grades:', error)
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
    students.sort((a, b) => b.grade - a.grade)
    students = students.filter(student => student.isToday)
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
    const [apiKey1, setApiKey1] = useState('')
    const [apiKey2, setApiKey2] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [requestsLeft, setRequestsLeft] = useState<number | null>(null)

    const updateGrades = async () => {
        setIsUpdating(true)
        setError(null)
        try {
            let initialStudents = students
            if (students.length === 0) {
                initialStudents = await getAllSubscribedStudents(apiKey1, apiKey2)
            }
            const updatedStudents = await getGrades(apiKey1, apiKey2, initialStudents)
            setStudents(updatedStudents)
            const requestsLeft = await getRequestsLeft(apiKey1, apiKey2)
            setRequestsLeft(requestsLeft)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while updating grades.')
        } finally {
            setIsUpdating(false)
        }
    }

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (apiKey1 && apiKey2) {
            updateGrades()
            interval = setInterval(updateGrades, 1800000)
        }

        return () => clearInterval(interval)
    }, [apiKey1, apiKey2])

    const getGradeBadgeColor = (grade: number) => {
        if (grade >= 90) return 'bg-green-500'
        if (grade >= 80) return 'bg-blue-500'
        if (grade >= 70) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    return (
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
                                type="password"
                                placeholder="Enter API Key 1"
                                value={apiKey1}
                                onChange={(e) => setApiKey1(e.target.value)}
                                autoComplete="username"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="api-key-2">CLIENT_SECRET</Label>
                            <Input
                                id="api-key-2"
                                type="password"
                                placeholder="Enter API Key 2"
                                value={apiKey2}
                                onChange={(e) => setApiKey2(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={updateGrades} disabled={isUpdating || !apiKey1 || !apiKey2}>
                                {isUpdating ? 'Updating...' : 'Update Grades'}
                            </Button>
                        </div>
                    </div>
                    {/* <div className="items-top flex space-x-2">
                        <Checkbox id="save-keys" />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="save-keys"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Save API keys for future use
                            </label>
                            <p className="text-sm text-muted-foreground">
                                By checking this box, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </div>
                    </div> */}
                </div>
                {requestsLeft && (
                    <Alert variant="default" className="mb-6">
                        <AlertTitle>Requests Left</AlertTitle>
                        <AlertDescription>You have {requestsLeft} requests left for the next hour.</AlertDescription>
                    </Alert>
                )}
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Exam</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell></TableCell>
                                <Avatar className="rounded-full w-8 h-8">
                                    <AvatarImage src={student.photo} alt={student.name} />
                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>
                                    <Badge className={getGradeBadgeColor(student.grade)}>
                                        {student.grade}%
                                    </Badge>
                                </TableCell>
                                <TableCell>{getExamName(student.examId)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card >
    )
}
