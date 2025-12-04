"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Commit } from "@/types";
import { GitCommit, Sparkles } from "lucide-react";

export function Changelog() {
  const { data: commits, isLoading } = useQuery<Commit[]>({
    queryKey: ["changelog"],
    queryFn: async () => {
      const response = await fetch("/api/changelog");
      if (!response.ok) {
        throw new Error("Failed to fetch changelog");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card className="w-full min-w-[300px] lg:w-[425px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!commits || commits.length === 0) {
    return null;
  }

  return (
    <Card className="w-full min-w-[300px] lg:w-[425px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommit className="h-5 w-5" />
          Recent Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto space-y-4">
        {commits.map((commit, index) => (
          <div
            key={index}
            className={`flex gap-3 items-start p-2 rounded-lg transition-colors ${
              commit.new ? 'bg-primary/10 border-l-2 border-primary pl-3' : 'hover:bg-muted/50'
            }`}
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              <img
                src={commit.avatar}
                alt={commit.author}
                className="h-full w-full object-cover"
              />
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                <p className="text-sm font-medium text-foreground truncate flex-1">
                  {commit.message}
                </p>
                {commit.new && (
                  <Badge variant="default" className="flex items-center gap-1 text-xs flex-shrink-0">
                    <Sparkles className="h-3 w-3" />
                    New
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-muted-foreground truncate">{commit.author}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(commit.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
