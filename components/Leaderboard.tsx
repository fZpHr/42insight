"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Student } from "@/types";
import { Trophy, Medal, Award } from "lucide-react";
import Link from "next/link";

interface LeaderboardProps {
  campus: string;
  limit?: number;
}

export function Leaderboard({ campus, limit = 5 }: LeaderboardProps) {
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["leaderboard", campus],
    queryFn: async () => {
      const response = await fetch(`/api/users/campus/${campus}`);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const topStudents = students
    ?.filter((s) => !s.name.includes("- Candidate"))
    ?.sort((a, b) => b.level - a.level)
    ?.slice(0, limit);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Students
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!topStudents || topStudents.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Students
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topStudents.map((student, index) => (
          <Link
            key={student.id}
            href={`/users/${student.name}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="w-6 flex items-center justify-center">
              {getRankIcon(index)}
            </div>
            <Avatar className="h-10 w-10">
              <AvatarImage src={student.photoUrl} alt={student.name} />
              <AvatarFallback>{student.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{student.name}</p>
              <p className="text-xs text-muted-foreground">
                Level {student.level.toFixed(2)}
              </p>
            </div>
          </Link>
        ))}
        <Link
          href="/rankings"
          className="block text-center text-sm text-primary hover:underline pt-2"
        >
          View Full Rankings →
        </Link>
      </CardContent>
    </Card>
  );
}
