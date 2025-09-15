"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { StudentCard } from "@/components/trombi-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import useAuthCheck from "@/hooks/useAuthCheck";
import { Eye, EyeClosed, Star, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PoolUser } from "@/types";

const INITIAL_LOAD = 20;
const LOAD_MORE = 10;

export default function Trombinoscope() {
  const { user, fetchPoolStudents } = useAuth();
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const [showingName, setShowingName] = useState(true);
  const [gameMode, setGameMode] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data: students = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => fetchPoolStudents(),
    staleTime: 10 * 60 * 1000,
  });

  const filteredStudents = students.filter((student) => student.photoUrl);
  const visibleStudents = filteredStudents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredStudents.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) =>
        Math.min(prev + LOAD_MORE, filteredStudents.length),
      );
    }
  }, [hasMore, filteredStudents.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading]);

  useEffect(() => {
    setVisibleCount(INITIAL_LOAD);
  }, [students]);

  useEffect(() => {
    if (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load students",
        {
          duration: 2000,
          position: "bottom-right",
        },
      );
      console.error("Error fetching students:", error);
    }
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">
          {filteredStudents.length} students
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={gameMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGameMode((prev) => !prev)}
                    className="flex items-center gap-2"
                  >
                    <Gamepad2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{gameMode ? "Disable Gamemode" : "Enable Gamemode"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowingName((prev) => !prev)}
                  className="flex items-center gap-2"
                >
                  {showingName ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeClosed className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showingName ? "Hide names" : "Show names"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(10)
            .fill(0)
            .map((_, index) => (
              <Card key={index} className="overflow-hidden p-0">
                <CardContent className="p-0">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visibleStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: (index % LOAD_MORE) * 0.05,
                }}
              >
                <StudentCard
                  student={student}
                  poolUser={student}
                  showingName={showingName}
                  isPool={true}
                  isGame={gameMode}
                />
              </motion.div>
            ))}
          </div>

          {hasMore && (
            <div ref={observerRef} className="flex justify-center py-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
                {Array(
                  Math.min(LOAD_MORE, filteredStudents.length - visibleCount),
                )
                  .fill(0)
                  .map((_, index) => (
                    <Card
                      key={`loading-${index}`}
                      className="overflow-hidden p-0"
                    >
                      <CardContent className="p-0">
                        <Skeleton className="aspect-square w-full" />
                        <div className="p-4">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
