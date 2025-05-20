'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { X, Calendar, Clock, BarChart as BarChartIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { format, parseISO, subDays } from 'date-fns'

interface ActivityData {
  totalTime: number
  weeklyTime: number
  dailyHours: { date: string; value: number }[]
  lastUpdated: string
}

interface ActivityOverlayProps {
  student: {
    name: string
    activityData?: ActivityData
  }
  onClose: () => void
}

// Helper function to format hours as hours and minutes
const formatHours = (hours: number) => {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

export default function ActivityOverlay({ student, onClose }: ActivityOverlayProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  
  useEffect(() => {
    // If student has activityData with dailyHours, use it
    if (student.activityData?.dailyHours) {
      // Sort data by date
      const sortedData = [...student.activityData.dailyHours].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      // Format date to be more readable
      const formattedData = sortedData.map(item => ({
        ...item,
        formattedDate: format(parseISO(item.date), 'MMM dd'),
        tooltipDate: format(parseISO(item.date), 'MMM dd, yyyy')
      }))
      
      setChartData(formattedData)
      
      // Generate weekly data
      const weekly = []
      const now = new Date()
      
      for (let i = 0; i < 4; i++) {
        const weekStart = subDays(now, 7 * i + 6)
        const weekEnd = subDays(now, 7 * i)
        
        const weekLabel = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`
        
        const weekData = sortedData.filter(day => {
          const date = parseISO(day.date)
          return date >= weekStart && date <= weekEnd
        })
        const totalHours = weekData.reduce((sum, day) => sum + day.value, 0)
        
        weekly.push({
          week: weekLabel,
          hours: totalHours,
          daysActive: weekData.length
        })
      }
      
      setWeeklyData(weekly.reverse())
    }
  }, [student])
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-medium">{payload[0]?.payload.tooltipDate}</p>
          <p className="text-purple-600">{formatHours(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{student.name}'s Activity</CardTitle>
            {student.activityData?.lastUpdated && (
              <CardDescription>
                Last updated: {format(parseISO(student.activityData.lastUpdated), 'MMM dd, yyyy HH:mm')}
              </CardDescription>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {student.activityData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-purple-500" />
                        <h4 className="text-sm font-medium">Total Time</h4>
                      </div>
                      <span className="text-2xl font-bold">{Math.round(student.activityData.totalTime / 60)}h</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-medium">Weekly Time</h4>
                      </div>
                      <span className="text-2xl font-bold">{Math.round(student.activityData.weeklyTime / 60)}h</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BarChartIcon className="mr-2 h-4 w-4 text-green-500" />
                        <h4 className="text-sm font-medium">Daily Average</h4>
                      </div>
                      <span className="text-2xl font-bold">
                        {student.activityData.dailyHours.length > 0 
                          ? formatHours(student.activityData.dailyHours.reduce((sum, day) => sum + day.value, 0) / student.activityData.dailyHours.length)
                          : '0h'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Tabs defaultValue="daily">
                <TabsList className="mb-4">
                  <TabsTrigger value="daily">Daily Activity</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
                </TabsList>
                
                <TabsContent value="daily" className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="formattedDate" 
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name="Hours" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="weekly" className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hours" name="Total Hours" fill="#8884d8" />
                        <Bar dataKey="daysActive" name="Days Active" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">No activity data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
