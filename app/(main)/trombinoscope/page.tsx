"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
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
import { Eye, EyeClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "next-auth/react";
import { Student } from "@/types";
import { useCampus } from "@/contexts/CampusContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const INITIAL_LOAD = 20;
const LOAD_MORE = 10;

const fetchCampusStudents = async (campus: string): Promise<Student[]> => {
  try {
    //console.log("Fetching students for campus:", campus);
    const response = await fetch(`/api/users/campus/${campus}`);
    if (!response.ok) {
      throw new Error("Failed to fetch students");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
};

export default function Trombinoscope() {
    const { data: session, status } = useSession();
    const user = session?.user;
  const { selectedCampus: contextCampus } = useCampus();
  // Use context campus (for staff) or user's campus
  const effectiveCampus = contextCampus || user?.campus || "";
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const [showingName, setShowingName] = useState(true);
  const [year, setYear] = useState<string>("all");
  const observerRef = useRef<HTMLDivElement>(null);
  const [showTimeoutError, setShowTimeoutError] = useState(false);

  // Timeout pour afficher un message d'erreur après 15 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeoutError(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [effectiveCampus]);

  const {
    data: students = [],
    isLoading,
    error,
    isSuccess,
    isFetching,
  } = useQuery({
    queryKey: ["students", effectiveCampus],
    queryFn: () => fetchCampusStudents(effectiveCampus),
    enabled: !!effectiveCampus,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const filteredStudents = students
    .filter((student) => student.photoUrl)
    .filter((student) => {
      if (year === "all") return true;
      return String((student as any).year) === year;
    });

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
  }, [effectiveCampus]);

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

  const handleYearChange = (value: string) => {
    setYear(value);
    setVisibleCount(INITIAL_LOAD);
  };

  const getAvailableYears = () => {
    const yearsSet = new Set<string>();
    students.forEach((student) => {
      if ((student as any).year) {
        yearsSet.add(String((student as any).year));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }

  // Protection: Afficher le loading tant que les données ne sont pas chargées
  if (!showTimeoutError && ((isLoading || isFetching) && !isSuccess)) {
    return <LoadingScreen message="Loading trombinoscope..." />;
  }

  // Si aucun étudiant n'est trouvé après le chargement
  if (isSuccess && students.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-3">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No students found for this campus.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-3">
      {/* Message d'erreur après timeout */}
      {showTimeoutError && (!isSuccess || students.length === 0) && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>42 API Issue</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              The 42 API is taking longer than expected to respond. Please wait
              a moment and refresh the page.
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
      
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">
          {filteredStudents.length} students
        </p>
        <div className="flex items-center gap-2">
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
          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {getAvailableYears().map((yr) => (
                <SelectItem key={yr} value={yr}>
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  poolUser={{} as any}
                  showingName={showingName}
                  isPool={false}
                  isGame={false}
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
