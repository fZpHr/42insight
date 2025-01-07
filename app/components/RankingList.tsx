'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Trophy, Medal, Award, ChevronRight, Wallet, Activity, Clock, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import SearchBar from './SearchBar'
import FilterSort from './FilterSort'
import ActivityOverlay from './ActivityOverlay'
import { useInView } from 'react-intersection-observer'

interface Student {
  id: number
  name: string
  level: number
  photoUrl: string
  correctionTotal: number
  correctionPositive: number
  correctionNegative: number
  correctionPercentage: number
  correctionPoints: number
  year: number
  wallet: number
  activityData: { date: string; value: number }[]
  blackholeTimer: number
  rank: number
}

const generateChartData = (startDate: string, days: number) => {
  const data = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 100),
    });
  }
  return data;
};

interface StudentCardProps {
  student: Student
  index: number
  onActivityClick: (student: Student) => void
}

const ITEMS_PER_PAGE = 20

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Trophy className="w-6 h-6 text-yellow-400" />;
    case 2: return <Medal className="w-6 h-6 text-gray-400" />;
    case 3: return <Award className="w-6 h-6 text-amber-600" />;
    default: return null;
  }
}

const getBlackholeColor = (days: number) => {
  if (days <= 7) return 'text-red-500';
  if (days <= 30) return 'text-yellow-500';
  return 'text-green-500';
}

const StudentCard = ({ student, index, onActivityClick }: StudentCardProps) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <Card id={student.name} className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="flex items-center p-4">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mr-4 overflow-hidden">
            <Image
              src={student.photoUrl}
              alt={`${student.name}'s photo`}
              width={128}
              height={128}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          </div>
          <div className="flex-grow">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold mr-2">{student.name}</h3>
              {getRankIcon(index + 1)}
            </div>
            <Badge variant="secondary" className="mt-1">Level {student.level}</Badge>
            <p className="text-sm text-gray-500 mt-1">Correction: {student.correctionPercentage}%</p>
            <p className="text-sm text-gray-500">Correction Points: {student.correctionPoints}</p>
            <p className="text-sm text-muted-foreground">Year: {student.year}</p>
            <div className="flex items-center mt-1 space-x-2">
              <div className="flex items-center">
                <Wallet className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-sm font-semibold text-green-500">{student.wallet} ₳</span>
              </div>
              <div className="flex items-center">
                <Clock className={`w-4 h-4 mr-1 ${getBlackholeColor(student.blackholeTimer)}`} />
                <span className={`text-sm font-semibold ${getBlackholeColor(student.blackholeTimer)}`}>
                  {student.blackholeTimer} days
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold mr-4 text-purple-600">#{index + 1}</span>
            <div className="mt-2 w-24 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generateChartData('2023-01-01', 10)}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onActivityClick(student)}
              >
                <Activity className="mr-2 h-4 w-4" />
                Activity
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://profile.intra.42.fr/users/${student.name}`, '_blank')}
              >
                <ChevronRight className="mr-2 h-4 w-4" />
                View Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div >
  )
}

const fetchStudents = async (): Promise<Student[]> => {
  try {
    const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1];
    await new Promise(resolve => setTimeout(resolve, 3000));
    const response = await fetch('/api/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch students')
    }
    return response.json()
  } catch (error) {
    console.error('Error fetching students:', error)
    return []
  }
}

export default function RankingList() {
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('level')
  const [year, setYear] = useState('all')
  const [activeStudent, setActiveStudent] = useState<Student | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchStudents()
        setStudents(data)
      } catch (err) {
        setError('Failed to load students. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    loadStudents()
  }, [])

  const filteredStudents = useMemo(() => {
    let result = [...students]


    if (filter !== 'all') {
      result = result.filter(student => student.level === parseInt(filter))
    }

    if (year !== 'all') {
      result = result.filter(student => student.year === parseInt(year))
    }


    switch (sort) {
      case 'level':
        result.sort((a, b) => b.level - a.level)
        break
      case 'correction':
        result.sort((a, b) => b.correctionPercentage - a.correctionPercentage).reverse()
        break
      case 'correctionPoints':
        result.sort((a, b) => b.correctionPoints - a.correctionPoints)
        break
      case 'wallet':
        result.sort((a, b) => b.wallet - a.wallet)
        break
      case 'blackhole':
        result.sort((a, b) => a.blackholeTimer - b.blackholeTimer)
        break
      default:
        result.sort((a, b) => b.level - a.level)
    }

    result = result.map((student, index) => ({
      ...student,
      rank: index + 1
    }))

    if (searchQuery) {
      result = result.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return result
  }, [students, searchQuery, filter, sort, year])

  const paginatedStudents = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredStudents, page])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setPage(1)
  }, [])

  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort)
    setPage(1)
  }, [])

  const handleYearChange = useCallback((newYear: string) => {
    setYear(newYear)
    setPage(1)
  }, [])

  const handleActivityClick = useCallback((student: Student) => {
    setActiveStudent(student)
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-semibold mb-6">Student Rankings</h2>
      <div id="top" className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <SearchBar onSearch={handleSearch} />
        <FilterSort
          onSortChange={handleSortChange}
          onYearChange={handleYearChange}
        />
      </div>


      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
                  Your position : <strong>{filteredStudents.findIndex(student => student.name === localStorage.getItem('login')) + 1 || 'N/A'}</strong> / {filteredStudents.length}
              <a
                href="#"
                className="ml-2 text-purple-600 underline"
                onClick={(e) => {
                  e.preventDefault();
                  const login = localStorage.getItem('login') || '';
                  const position = filteredStudents.findIndex(student => student.name === login) + 1;
                  if (position === 0) return;
                  const pageToGo = Math.ceil(position / ITEMS_PER_PAGE);
                  if (pageToGo === page) return;
                  setPage(pageToGo);
                  setTimeout(() => {
                    const top = document.getElementById(login);
                    top?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (top) {
                      top.style.border = '2px solid rgb(147 51 234)';
                    }
                  }, 0);
                }}
              >
                (page {Math.ceil((filteredStudents.findIndex(student => student.name === localStorage.getItem('login')) + 1) / ITEMS_PER_PAGE) || 'N/A'})
              </a>
            </p>
            {paginatedStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                index={student.rank - 1}
                onActivityClick={handleActivityClick}
              />
            ))}
          </div>

          {filteredStudents.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-8 space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPage(p => p + 1);
                  const top = document.getElementById('top');
                  top?.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={page * ITEMS_PER_PAGE >= filteredStudents.length}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {activeStudent && (
        <ActivityOverlay
          student={activeStudent}
          onClose={() => setActiveStudent(null)}
        />
      )}
    </div>
  )
}