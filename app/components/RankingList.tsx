'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Trophy, Medal, Award, ChevronRight, Wallet, Activity, Clock, AlertCircle, ArrowUpDown, ChevronsRight, ChevronLeft, Eye } from 'lucide-react'
import Image from 'next/image'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { Input } from "./ui/input"
import SearchBar from './SearchBar'
import FilterSort from './FilterSort'
import ActivityOverlay from './ActivityOverlay'
import { useInView } from 'react-intersection-observer'
import { format } from 'date-fns';

interface ActivityData {
  totalTime: number
  weeklyTime: number
  dailyHours: { date: string; value: number }[]
  lastUpdated: string
}

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
  activityData: ActivityData | { date: string; value: number }[] | null
  blackholeTimer: number
  rank: number
  location: string
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
  const login = JSON.parse(localStorage.getItem('user') || '{}').login

  const chartData = useMemo(() => {
    if (!student.activityData) return [];
    
    if (Array.isArray(student.activityData)) {
      return student.activityData;
    }
    
    if (typeof student.activityData === 'object' && 'dailyHours' in student.activityData) {
      return student.activityData.dailyHours;
    }
    
    return [];
  }, [student.activityData]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <Card id={student.name} className={`hover:shadow-lg transition-shadow duration-300 ${student.name === login ? 'border-2 border-purple-600' : ''}`}>
        <CardContent className="flex items-center p-4">
            <div className="hidden md:flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mr-4 overflow-hidden">
            <Image
              src={student.photoUrl || "/placeholder.svg"}
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
            {student.correctionPercentage !== 420 && student.correctionTotal >= 10 && (
              <>
                <p className="text-sm text-gray-500 mt-1">Correction: {student.correctionPercentage}% ({student.correctionTotal - student.correctionPositive}/{student.correctionPositive})</p>
              </>
            )}
            <p className="text-sm text-gray-500">Correction Points: {student.correctionPoints}</p>
            <p className="text-sm text-muted-foreground">Year: {student.year}</p>
            <div className="flex items-center mt-1 space-x-2">
              <div className="flex items-center">
                <Wallet className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-sm font-semibold text-green-500">{student.wallet} ₳</span>
              </div>
              {student.blackholeTimer !== 420 && (
                <div className="flex items-center">
                  <Clock className={`w-4 h-4 mr-1 ${getBlackholeColor(student.blackholeTimer)}`} />
                  <span className={`text-sm font-semibold ${getBlackholeColor(student.blackholeTimer)}`}>
                    {student.blackholeTimer} days
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold mr-4 text-purple-600">#{index + 1}</span>
            <div className="mt-2 w-24 h-12 z-index-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
              <Activity className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Activity</span>
              </Button>
              <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://profile.intra.42.fr/users/${student.name}`, '_blank')}
              >
              <ChevronRight className="h-4 w-4" />
              <span className="hidden md:inline ml-2">View Profile</span>
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
    await new Promise(resolve => setTimeout(resolve, 1000));
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
const fetchStudentsOnce = async (): Promise<Student[]> => {
  const cachedStudents = sessionStorage.getItem('students');
  if (cachedStudents && cachedStudents.length > 0) {
    return JSON.parse(cachedStudents);
  }

  const students = await fetchStudents();
  sessionStorage.setItem('students', JSON.stringify(students));
  return students;
};


export default function RankingList() {
  const login =  JSON.parse(localStorage.getItem('user') || '{}').login
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('level')
  const [year, setYear] = useState('all')
  const [activeStudent, setActiveStudent] = useState<Student | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [previewLevel, setPreviewLevel] = useState<number | null>(null)

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchStudentsOnce()
        setStudents(data)
      } catch (err) {
        setError('Failed to load students. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    loadStudents()
    const intervalId = setInterval(async () => {
      const data = await fetchStudents();
      setStudents(data);
      sessionStorage.setItem('students', JSON.stringify(data));
      return () => clearInterval(intervalId);
    }, 1800000);

    return () => clearInterval(intervalId);
  }, [])

  const filteredStudents = useMemo(() => {
    let result = [...students]

    if (filter !== 'all') {
      result = result.filter(student => student.level === parseInt(filter))
    }

    if (year !== 'all') {
      result = result.filter(student => student.year === parseInt(year))
    }

    const sortMultiplier = sortDirection === 'desc' ? -1 : 1

    switch (sort) {
      case 'level':
        result.sort((a, b) => sortMultiplier * (b.level - a.level))
        break
      case 'correction':
        result.sort((a, b) => {
          if ((a.correctionPercentage === 420 && b.correctionPercentage === 420) || (a.correctionTotal < 10 && b.correctionTotal < 10)) {
            return 0;
          }
          if (a.correctionPercentage === 420 || a.correctionTotal < 10) {
            return 1;
          }
          if (b.correctionPercentage === 420 || b.correctionTotal < 10) {
            return -1;
          }
          return sortMultiplier * (a.correctionPercentage - b.correctionPercentage);
        });
        break;
      case 'correctionPoints':
        result.sort((a, b) => {
          return sortMultiplier * (b.correctionPoints - a.correctionPoints);
        })
        break
      case 'wallet':
        result.sort((a, b) => sortMultiplier * (b.wallet - a.wallet))
        break
      case 'blackhole':
        result.sort((a, b) => {
          if (a.blackholeTimer === 420 && b.blackholeTimer === 420) return 0;
          if (a.blackholeTimer === 420) return 1;
          if (b.blackholeTimer === 420) return -1;
          return sortMultiplier * (a.blackholeTimer - b.blackholeTimer);
        })
        break
      case 'activity':
        result.sort((a, b) => {
          const getActivityTime = (student: Student) => {
            if (!student.activityData) return 0;
            
            if (typeof student.activityData === 'object' && !Array.isArray(student.activityData) && 
                'totalTime' in student.activityData) {
              const activityData = student.activityData as ActivityData;
              return activityData.totalTime;
            }
            
            if (typeof student.activityData === 'object' && !Array.isArray(student.activityData) && 
                'weeklyTime' in student.activityData) {
              const activityData = student.activityData as ActivityData;
              return activityData.weeklyTime;
            }
            
            if (Array.isArray(student.activityData)) {
              return student.activityData.reduce((sum, day) => sum + (day.value || 0), 0);
            }
            
            return 0;
          };
          
          const aTime = getActivityTime(a);
          const bTime = getActivityTime(b);
          
          return sortMultiplier * (bTime - aTime);
        });
        break;
      default:
        result.sort((a, b) => sortMultiplier * (b.level - a.level))
    }


    if (previewLevel !== null && login) {
      result = result.map((student) => {
        if (student.name === login) {
          return { ...student, level: Math.max(student.level, previewLevel) }
        }
        return student
      })

      result.sort((a, b) => b.level - a.level)
    }
    result = result.map((student, index) => ({
      ...student,
      rank: index + 1,
      previewRank: student.name === login ? index + 1 : student.rank,
    }))

    if (searchQuery) {
      result = result.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return result
  }, [students, searchQuery, filter, sort, year, sortDirection,  previewLevel])

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

  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')
    setPage(1)
  }, [])



  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <p>{error}</p>
      </div>
    )
  }

  const user =  JSON.parse(localStorage.getItem('user') || '{}')
  const updatedAt = user.time ? format(new Date(user.time[0].updatedAt), 'dd-MM-yyyy HH:mm:ss') : 'N/A'
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-semibold mb-6">Student Rankings</h2>
      <p className="text-sm text-muted-foreground mb-6"> Last updated: {updatedAt}</p >
      < div id="top" className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4" >
        <SearchBar onSearch={handleSearch} />
        <div className="flex items-center space-x-4">
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortDirection}
            className="flex items-center space-x-2"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          {/* <Input
              type="number"
              placeholder="Preview Your Level"
              className="w-40"
              value={previewLevel ?? ""}
              onChange={(e) => setPreviewLevel(e.target.value ? Number.parseFloat(e.target.value) : null)}
              min="1"
              max="100"
              step="0.1"
            /> */}
          <FilterSort
            onSortChange={handleSortChange}
            onYearChange={handleYearChange}
          />
          </div>
      </div>


      {
        isLoading ? (
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
              {user.login && filteredStudents.findIndex(student => student.name === user.login) !== -1 && (
              <p className="text-sm text-gray-500">
                Your position : <strong>{filteredStudents.findIndex(student => student.name === user.login) + 1 || 'N/A'}</strong> / {filteredStudents.length}
                <a
                  href="#"
                  className="ml-2 text-purple-600 underline"
                  onClick={(e) => {
                    e.preventDefault();
                    const position = filteredStudents.findIndex(student => student.name === user.login) + 1;
                    if (position === 0) return;
                    const pageToGo = Math.ceil(position / ITEMS_PER_PAGE);
                    setPage(pageToGo);
                    setTimeout(() => {
                      const top = document.getElementById(user.login);
                      top?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 0);
                  }}
                >
                  (page {Math.ceil((filteredStudents.findIndex(student => student.name === user.login) + 1) / ITEMS_PER_PAGE) || 'N/A'})
                </a>
              </p>
              )}
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
                  onClick={() => {
                    if (page > 1) {
                      setPage(page - 1);
                      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.ceil(filteredStudents.length / ITEMS_PER_PAGE) }, (_, i) => {
                  const pageNumber = i + 1;
                  const isCurrentPage = pageNumber === page;
                  const isNearCurrentPage = pageNumber >= page - 2 && pageNumber <= page + 2;

                  if (isCurrentPage || isNearCurrentPage) {
                    return (
                      <Button
                        key={pageNumber}
                        variant={isCurrentPage ? 'default' : 'outline'}
                        onClick={() => {
                          setPage(pageNumber);
                          document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {pageNumber}
                      </Button>
                    );
                  }

                  return null;
                })}
                <Button
                  variant="outline"
                  onClick={() => {
                    if (page < Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)) {
                      setPage(page + 1);
                      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  disabled={page === Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )
      }
      {
        activeStudent && (
          <ActivityOverlay
            student={{
              name: activeStudent.name,
              activityData: (() => {
                //console.log('Debug activityData:', activeStudent.name, activeStudent.activityData);
                
                if (!activeStudent.activityData) {
                  return undefined;
                }
                
                try {
                  if (typeof activeStudent.activityData === 'object' && 
                      !Array.isArray(activeStudent.activityData) && 
                      'totalTime' in activeStudent.activityData &&
                      'dailyHours' in activeStudent.activityData) {
                    return activeStudent.activityData as ActivityData;
                  }Activity
                  
                  if (Array.isArray(activeStudent.activityData)) {
                    return {
                      totalTime: 0,
                      weeklyTime: 0,
                      dailyHours: activeStudent.activityData,
                      lastUpdated: new Date().toISOString()
                    };
                  }
                  
                  if (typeof activeStudent.activityData === 'string') {
                    try {
                      const parsed = JSON.parse(activeStudent.activityData);
                      if (parsed && typeof parsed === 'object') {
                        if ('dailyHours' in parsed) {
                          return parsed;
                        } else if (Array.isArray(parsed)) {
                          return {
                            totalTime: 0,
                            weeklyTime: 0,
                            dailyHours: parsed,
                            lastUpdated: new Date().toISOString()
                          };
                        }
                      }
                    } catch (e) {
                      console.error('Error parsing activityData JSON', e);
                    }
                  }
                  
                  console.warn('Unable to process activityData format for:', activeStudent.name);
                  return undefined;
                } catch (error) {
                  console.error('Error processing activityData:', error);
                  return undefined;
                }
              })()
            }}
            onClose={() => setActiveStudent(null)}
          />
        )
      }
    </div >
  )
}
