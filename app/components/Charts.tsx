'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

const levelEvolutionData = [
  { day: "Monday", averageLevel: 7.2 },
  { day: "Tuesday", averageLevel: 7.5 },
  { day: "Wednesday", averageLevel: 7.8 },
  { day: "Thursday", averageLevel: 8.1 },
  { day: "Friday", averageLevel: 8.4 },
  { day: "Saturday", averageLevel: 8.6 },
  { day: "Sunday", averageLevel: 8.9 },
]

const examSuccessData = [
  { subject: "Math", passed: 42, failed: 8 },
  { subject: "Science", passed: 38, failed: 12 },
  { subject: "English", passed: 45, failed: 5 },
  { subject: "History", passed: 40, failed: 10 },
  { subject: "Art", passed: 48, failed: 2 },
]

export default function Charts() {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Performance Charts</h2>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average Level Evolution</CardTitle>
            <CardDescription>Student level progression throughout the week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                averageLevel: {
                  label: "Average Level",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={levelEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[7, 9]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="averageLevel"
                    stroke="var(--color-averageLevel)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exam Success Rate</CardTitle>
            <CardDescription>Number of students who passed/failed exams this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                passed: {
                  label: "Passed",
                  color: "hsl(var(--chart-2))",
                },
                failed: {
                  label: "Failed",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examSuccessData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="passed" fill="var(--color-passed)" stackId="a" />
                  <Bar dataKey="failed" fill="var(--color-failed)" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

