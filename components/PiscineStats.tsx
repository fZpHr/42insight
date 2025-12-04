"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Student } from "@/types";
import { Users, TrendingUp, CheckCircle, XCircle, Globe } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PiscineStatsProps {
  campus: string;
}

export function PiscineStats({ campus }: PiscineStatsProps) {
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["piscine-stats", campus],
    queryFn: async () => {
      const response = await fetch(`/api/users/campus/${campus}`);
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="w-[425px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Campus Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!students || students.length === 0) {
    return null;
  }

  // Get unique years and sort them
  const years = Array.from(new Set(students.map((s) => s.year)))
    .filter((year) => year > 2000 && year <= new Date().getFullYear()) // Filter valid years
    .sort((a, b) => b - a);

  // Calculate stats for each year
  const yearStats = years
    .map((year) => {
      const yearStudents = students.filter((s) => s.year === year);
      const validated = yearStudents.filter((s) => s.has_validated).length;
      const total = yearStudents.length;
      const percentage = total > 0 ? (validated / total) * 100 : 0;

      return {
        year,
        total,
        validated,
        failed: total - validated,
        percentage,
      };
    })
    .filter((stat) => stat.total >= 10); // Exclude years with less than 10 students

  // Show all available years
  const recentYearStats = yearStats;

  return (
    <Card className="w-[425px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Campus Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentYearStats.map((stat) => (
          <div key={stat.year} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{stat.year}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {stat.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Progress value={stat.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stat.validated} / {stat.total} students validated
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
