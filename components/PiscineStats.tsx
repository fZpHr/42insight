"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Student } from "@/types";
import { Users, TrendingUp, CheckCircle, XCircle, Globe, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PiscineStatsProps {
  campus: string;
}

export function PiscineStats({ campus }: PiscineStatsProps) {
  const [showTimeoutError, setShowTimeoutError] = useState(false);

  // Timeout pour afficher un message d'erreur après 15 secondes
  useEffect(() => {
    if (!campus) return;
    
    const timer = setTimeout(() => {
      setShowTimeoutError(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [campus]);

  const { data: students, isLoading, isSuccess, isFetching } = useQuery<Student[]>({
    queryKey: ["piscine-stats", campus],
    queryFn: async () => {
      const response = await fetch(`/api/users/campus/${campus}`);
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
      return response.json();
    },
    enabled: !!campus,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: 'always',
  });

  if (!showTimeoutError && ((isLoading || isFetching) && !isSuccess)) {
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
    return (
      <Card className="w-[425px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Campus Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showTimeoutError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>42 API Issue</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  The 42 API is taking longer than expected to respond.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="ml-4 shrink-0"
                >
                  Refresh
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {!showTimeoutError && <p className="text-muted-foreground">No data available</p>}
        </CardContent>
      </Card>
    );
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
