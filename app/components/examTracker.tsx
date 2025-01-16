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
import { AlertCircle, Car } from 'lucide-react'
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
                lastUpdate: new Date(),
                examId: exam_id[i],
                isToday: false
            }))
            initialStudents = [...initialStudents, ...studentsData.filter((student: Student) => !initialStudents.some(s => s.id === student.id))]
        } catch (error) {
            console.error('Error fetching students:', error)
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return initialStudents
}

async function getGrades(CLIENT_ID: string, CLIENT_SECRET: string, students: Student[]) {
    for (let i = 0; i < students.length; i += 20) {
        const batch = students.slice(i, i + 20)
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

// You can remove the getToken function from the frontend since it's now handled by the backend


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

    const COLORS = ['#4CAF50', '#F44336']

    useEffect(() => {
        const storedApiKey1 = localStorage.getItem('apiKey1');
        const storedApiKey2 = localStorage.getItem('apiKey2');
        if (storedApiKey1) setApiKey1(storedApiKey1);
        if (storedApiKey2) setApiKey2(storedApiKey2);
    }, []);
    const averageGrade = students.reduce((sum, student) => sum + (student.grade || 0), 0) / students.length

    return (
        <div>
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Exam Tracker</CardTitle>
                <p className="text-muted-foreground">Data is updated every 30min</p>
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
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={updateGrades} disabled={isUpdating || !apiKey1 || !apiKey2}>
                                {isUpdating ? 'Updating...' : 'Update Grades'}
                            </Button>
                        </div>
                    </div>
                    <div className="items-top flex space-x-2">
                        <Checkbox 
                            id="save-keys"
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    localStorage.setItem('apiKey1', apiKey1);
                                    localStorage.setItem('apiKey2', apiKey2);
                                } else {
                                    localStorage.removeItem('apiKey1');
                                    localStorage.removeItem('apiKey2');
                                }
                            }} 
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
                    </div>
                </div>
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Alert variant="default" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription className="text-muted-foreground" >The fetch will only display students whose exams are today.</AlertDescription>
                </Alert>
                {isUpdating && (
                    <div className="flex justify-center items-center mb-6">
                        <div className="animate-spin h-10 w-10 text-gray-600">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    </div>
                )}

                {students.length > 0 && (
                    <>
                        <p><strong>Total Students:</strong> {students.length}</p>
                        <p><strong>Average Grade:</strong> {averageGrade.toFixed(2)}%</p>
                        <p><strong>Requests Left:</strong> {requestsLeft}</p>
                
                <Table className="mt-5">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Last Update</TableHead>
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
                        <TableCell>{student.lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
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
