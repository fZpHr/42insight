'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from "./ui/card"
import { motion } from 'framer-motion'
import { Badge } from "./ui/badge"

interface Student {
  id: number
  name: string
  level: number
  photoUrl: string
  year: number
}

const fetchStudents = async (): Promise<Student[]> => {
  try {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    const response = await fetch('/api/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch students')
    }
    return response.json()
  } catch (error) {
    console.error('Error fetching students:', error)
    return [] as Student[]
  }
}

const fetchStudentsOnce = async (): Promise<Student[]> => {
  const cachedStudents = sessionStorage.getItem('students');
  if (cachedStudents) {
    return JSON.parse(cachedStudents);
  }

  const students = await fetchStudents();
  sessionStorage.setItem('students', JSON.stringify(students));
  return students;
};

export default function Trombinoscope() {
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    fetchStudentsOnce().then(setStudents)
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-semibold mb-6">Trombinoscope</h2>
      <p className="text-sm text-muted-foreground mb-4">Number of students: {students.length}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {students.map((student, index) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => window.open(`https://profile.intra.42.fr/users/${student.name}`, '_blank')}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={student.photoUrl}
                    alt={`${student.name}'s photo`}
                    className="object-cover w-full h-full"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    loading="lazy"
                  />

                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{student.name}</h3>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">Level {student.level}</Badge>
                    <span className="text-sm text-muted-foreground">Year {student.year}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
