"use client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Trophy,
  Medal,
  Award,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Target,
  Eye,
  Briefcase,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Student, StudentSortOption } from "@/types";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { debounce } from "@tanstack/pacer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useSession } from "next-auth/react";
import { LoadingScreen } from "@/components/LoadingScreen";

const sortOptions: StudentSortOption[] = [
  { value: "level", label: "Level", key: "level" },
  { value: "wallet", label: "Wallet", key: "wallet" },
  {
    value: "correctionPoints",
    label: "Correction points",
    key: "correctionPoints",
  },
  {
    value: "nb_corrections",
    label: "Number of corrections",
    key: "correctionTotal",
  },
  {
    value: "correctionPercentage",
    label: "Correction ratio",
    key: "correctionPercentage",
  },
  // Login Time - Overview
  { value: "totalLoginTime", label: "Total hours", key: "activityData" },
  { value: "avgDailyHours", label: "Avg hours/day", key: "activityData" },
  { value: "activeDays", label: "Active days", key: "activityData" },
  { value: "presenceRate", label: "Presence rate", key: "activityData" },
  // Login Time - Streaks
  { value: "currentStreak", label: "Current streak", key: "activityData" },
  { value: "maxStreak", label: "Max streak", key: "activityData" },
  { value: "daysWithoutConnection", label: "Days without login", key: "activityData" },
  // Login Time - Sessions
  { value: "totalSessions", label: "Total sessions", key: "activityData" },
  { value: "avgSessionDuration", label: "Avg session duration", key: "activityData" },
  // Login Time - Recent Activity
  { value: "last7DaysTotal", label: "Last 7 days", key: "activityData" },
  { value: "last30DaysTotal", label: "Last 30 days", key: "activityData" },
  // Login Time - Record Days
  { value: "bestDayHours", label: "Best day hours", key: "activityData" },
  { value: "worstDayHours", label: "Worst day hours", key: "activityData" },
  // Login Time - Time Preferences
  { value: "morningHours", label: "Morning hours", key: "activityData" },
  { value: "afternoonHours", label: "Afternoon hours", key: "activityData" },
  { value: "eveningHours", label: "Evening hours", key: "activityData" },
  { value: "nightHours", label: "Night hours", key: "activityData" },
  // Login Time - Weekday vs Weekend
  { value: "weekdayHours", label: "Weekday hours", key: "activityData" },
  { value: "weekendHours", label: "Weekend hours", key: "activityData" },
  { value: "weekdayRatio", label: "Weekday ratio", key: "activityData" },
  // Login Time - Productivity
  { value: "days4h", label: "Days ≥4h", key: "activityData" },
  { value: "days8h", label: "Days ≥8h", key: "activityData" },
  { value: "days12h", label: "Days ≥12h", key: "activityData" },
  { value: "productivityRate", label: "Productivity rate", key: "activityData" },
  // Login Time - Session Stats
  { value: "maxSession", label: "Max session", key: "activityData" },
  { value: "minSession", label: "Min session", key: "activityData" },
  // Work Status
  { value: "internship", label: "En stage", key: "work" },
  { value: "work_study", label: "En alternance", key: "work" },
];

// Categories for login time cascading filters
const loginTimeCategories = {
  overview: {
    label: "Overview",
    options: ["totalLoginTime", "avgDailyHours", "activeDays", "presenceRate"]
  },
  streaks: {
    label: "Streaks",
    options: ["currentStreak", "maxStreak", "daysWithoutConnection"]
  },
  sessions: {
    label: "Sessions",
    options: ["totalSessions", "avgSessionDuration", "maxSession", "minSession"]
  },
  recent: {
    label: "Recent Activity",
    options: ["last7DaysTotal", "last30DaysTotal"]
  },
  records: {
    label: "Record Days",
    options: ["bestDayHours", "worstDayHours"]
  },
  timePreferences: {
    label: "Time Preferences",
    options: ["morningHours", "afternoonHours", "eveningHours", "nightHours"]
  },
  weekdayWeekend: {
    label: "Weekday vs Weekend",
    options: ["weekdayHours", "weekendHours", "weekdayRatio"]
  },
  productivity: {
    label: "Productivity",
    options: ["days4h", "days8h", "days12h", "productivityRate"]
  }
};

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

type SortDirection = "asc" | "desc";

export default function Rankings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("level");
  const [sortHistory, setSortHistory] = useState<string[]>(["totalLoginTime", "avgDailyHours"]);
  const [loginTimeCategory, setLoginTimeCategory] = useState<string>("overview");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [highlightUser, setHighlightUser] = useState(false);
  const userRowRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const { data: session, status } = useSession();
  const user = session?.user;
  const [showTimeoutError, setShowTimeoutError] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedLogtime, setSelectedLogtime] = useState<any>(null);
  const [showLogtimeDialog, setShowLogtimeDialog] = useState(false);

  // Get login time category based on current sortBy if it's a login time filter
  useEffect(() => {
    const category = Object.entries(loginTimeCategories).find(([_, cat]) => 
      cat.options.includes(sortBy)
    );
    if (category) {
      setLoginTimeCategory(category[0]);
    }
  }, [sortBy]);

  // Timeout pour afficher un message d'erreur après 15 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeoutError(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [selectedCampus, user?.campus]);


  const campusOptions = [
    { value: "Global", label: "Global" },
    { value: "Nice", label: "Nice" },
    { value: "Angouleme", label: "Angoulême" },
  ];

  const {
    data: students,
    isLoading,
    error,
    isSuccess,
    isFetching,
  } = useQuery({
    queryKey: ["campus-students", selectedCampus || user?.campus],
    queryFn: async () => {
      const campus = selectedCampus || user?.campus;
      if (!campus) return [];
      if (campus === "Global") {
        const [nice, angouleme] = await Promise.all([
          fetchCampusStudents("Nice"),
          fetchCampusStudents("Angouleme"),
        ]);
        const all = [...(nice || []), ...(angouleme || [])];
        if (all.length === 0) {
          toast.error("No students found for Global", {
            duration: 2000,
            position: "bottom-right",
          });
          return [];
        }
        
        return all.map((student: Student) => ({
          ...student,
          activityData:
            typeof student.activityData === "string"
              ? JSON.parse(student.activityData)
              : student.activityData,
        }));
      } else {
        const response = await fetchCampusStudents(campus);
        if (!response || response.length === 0) {
          toast.error("No students found for this campus", {
            duration: 2000,
            position: "bottom-right",
          });
          return [];
        }
        
        return response.map((student: Student) => ({
          ...student,
          activityData:
            typeof student.activityData === "string"
              ? JSON.parse(student.activityData)
              : student.activityData,
        }));
      }
    },
    enabled: !!(selectedCampus || user?.campus),
    staleTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const sortStudents = (
    students: Student[],
    sortKey: keyof Student,
    direction: SortDirection,
    sortByValue?: string,
  ) => {
    let effectiveDirection = direction;
    if (sortKey === "correctionPercentage") {
      effectiveDirection = direction === "asc" ? "desc" : "asc";
    }
    return [...students].sort((a, b) => {
      let aValue: any = a[sortKey];
      let bValue: any = b[sortKey];
      
      // Special handling for login time (nested in activityData.logtime)
      if (sortKey === "activityData" && sortByValue) {
        const logA = a.activityData?.logtime;
        const logB = b.activityData?.logtime;
        
        switch (sortByValue) {
          case "totalLoginTime":
            aValue = logA?.totalHours ?? 0;
            bValue = logB?.totalHours ?? 0;
            break;
          case "avgDailyHours":
          case "avgLoginTime":
            aValue = parseFloat(logA?.averageDailyHours ?? "0");
            bValue = parseFloat(logB?.averageDailyHours ?? "0");
            break;
          case "activeDays":
            aValue = logA?.activeDays ?? 0;
            bValue = logB?.activeDays ?? 0;
            break;
          case "presenceRate":
            aValue = parseFloat(logA?.presenceRate ?? "0");
            bValue = parseFloat(logB?.presenceRate ?? "0");
            break;
          case "currentStreak":
            aValue = logA?.currentStreak ?? 0;
            bValue = logB?.currentStreak ?? 0;
            break;
          case "maxStreak":
            aValue = logA?.maxStreak ?? 0;
            bValue = logB?.maxStreak ?? 0;
            break;
          case "daysWithoutConnection":
            aValue = logA?.daysWithoutConnection ?? 0;
            bValue = logB?.daysWithoutConnection ?? 0;
            break;
          case "totalSessions":
            aValue = logA?.totalSessions ?? 0;
            bValue = logB?.totalSessions ?? 0;
            break;
          case "avgSessionDuration":
            aValue = parseFloat(logA?.sessions?.average ?? "0");
            bValue = parseFloat(logB?.sessions?.average ?? "0");
            break;
          case "last7DaysTotal":
            aValue = parseFloat(logA?.last7Days?.totalHours ?? "0");
            bValue = parseFloat(logB?.last7Days?.totalHours ?? "0");
            break;
          case "last30DaysTotal":
            aValue = parseFloat(logA?.last30Days?.totalHours ?? "0");
            bValue = parseFloat(logB?.last30Days?.totalHours ?? "0");
            break;
          case "bestDayHours":
            aValue = parseFloat(logA?.bestDay?.hours ?? "0");
            bValue = parseFloat(logB?.bestDay?.hours ?? "0");
            break;
          case "worstDayHours":
            aValue = parseFloat(logA?.worstDay?.hours ?? "0");
            bValue = parseFloat(logB?.worstDay?.hours ?? "0");
            break;
          case "morningHours":
            aValue = parseFloat(logA?.timePreferences?.morning?.hours ?? "0");
            bValue = parseFloat(logB?.timePreferences?.morning?.hours ?? "0");
            break;
          case "afternoonHours":
            aValue = parseFloat(logA?.timePreferences?.afternoon?.hours ?? "0");
            bValue = parseFloat(logB?.timePreferences?.afternoon?.hours ?? "0");
            break;
          case "eveningHours":
            aValue = parseFloat(logA?.timePreferences?.evening?.hours ?? "0");
            bValue = parseFloat(logB?.timePreferences?.evening?.hours ?? "0");
            break;
          case "nightHours":
            aValue = parseFloat(logA?.timePreferences?.night?.hours ?? "0");
            bValue = parseFloat(logB?.timePreferences?.night?.hours ?? "0");
            break;
          case "weekdayHours":
            aValue = parseFloat(logA?.weekdayVsWeekend?.weekday?.hours ?? "0");
            bValue = parseFloat(logB?.weekdayVsWeekend?.weekday?.hours ?? "0");
            break;
          case "weekendHours":
            aValue = parseFloat(logA?.weekdayVsWeekend?.weekend?.hours ?? "0");
            bValue = parseFloat(logB?.weekdayVsWeekend?.weekend?.hours ?? "0");
            break;
          case "weekdayRatio":
            aValue = parseFloat(logA?.weekdayVsWeekend?.ratio ?? "0");
            bValue = parseFloat(logB?.weekdayVsWeekend?.ratio ?? "0");
            break;
          case "days4h":
            aValue = logA?.productivity?.days4h ?? 0;
            bValue = logB?.productivity?.days4h ?? 0;
            break;
          case "days8h":
            aValue = logA?.productivity?.days8h ?? 0;
            bValue = logB?.productivity?.days8h ?? 0;
            break;
          case "days12h":
            aValue = logA?.productivity?.days12h ?? 0;
            bValue = logB?.productivity?.days12h ?? 0;
            break;
          case "productivityRate":
            aValue = parseFloat(logA?.productivity?.rate ?? "0");
            bValue = parseFloat(logB?.productivity?.rate ?? "0");
            break;
          case "maxSession":
            aValue = parseFloat(logA?.sessions?.max ?? "0");
            bValue = parseFloat(logB?.sessions?.max ?? "0");
            break;
          case "minSession":
            aValue = parseFloat(logA?.sessions?.min ?? "0");
            bValue = parseFloat(logB?.sessions?.min ?? "0");
            break;
          default:
            aValue = logA?.totalHours ?? 0;
            bValue = logB?.totalHours ?? 0;
        }
      }
      
      if (effectiveDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const baselineSortedStudents = useMemo(() => {
    if (!students) return [];

    // List of all activityData-based sort options
    const activityDataSorts = [
      "totalLoginTime", "avgDailyHours", "avgLoginTime", "activeDays", "presenceRate",
      "currentStreak", "maxStreak", "daysWithoutConnection",
      "totalSessions", "avgSessionDuration",
      "last7DaysTotal", "last30DaysTotal"
    ];

    const sortKey =
      sortBy === "internship" || sortBy === "work_study"
        ? ("level" as keyof Student)
        : activityDataSorts.includes(sortBy)
        ? ("activityData" as keyof Student)
        : ((sortOptions.find((o) => o.value === sortBy)?.key ||
          "level") as keyof Student);

    return sortStudents(students, sortKey, sortDirection, sortBy);
  }, [students, sortBy, sortDirection]);

  const rankingStudents = useMemo(() => {
    if (!baselineSortedStudents) return [];
    return baselineSortedStudents
      .filter((student: Student) => {
        if (selectedYear === "all") return true;
        return student.year?.toString() === selectedYear;
      })
      .filter((student: Student) => {
        if (sortBy === "internship") return student.work === 1;
        if (sortBy === "work_study") return student.work === 2;
        return true;
      })
      .filter((student: Student) => {
        if (sortBy === "correctionPercentage") {
          return (
            typeof student.correctionPositive === "number" &&
            typeof student.correctionNegative === "number" &&
            student.correctionPositive + student.correctionNegative >= 15
          );
        }
        return true;
      });
  }, [baselineSortedStudents, selectedYear, sortBy]);

  const rankById = useMemo(() => {
    const map = new Map<string | number, number>();
    const n = rankingStudents.length;
    rankingStudents.forEach((student, idx) => {
      const rank = sortDirection === "desc" ? idx + 1 : n - idx;
      map.set(student.id, rank);
    });
    return map;
  }, [rankingStudents, sortDirection]);

  const processedStudents = useMemo(() => {
    if (!baselineSortedStudents) return [];

    return baselineSortedStudents
      .filter((student: Student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((student: Student) => {
        if (selectedYear === "all") return true;
        return student.year?.toString() === selectedYear;
      })
      .filter((student: Student) => {
        if (sortBy === "internship") return student.work === 1;
        if (sortBy === "work_study") return student.work === 2;
        return true;
      })
      .filter((student: Student) => {
        if (sortBy === "correctionPercentage") {
          return (
            typeof student.correctionPositive === "number" &&
            typeof student.correctionNegative === "number" &&
            student.correctionPositive + student.correctionNegative >= 15
          );
        }
        return true;
      });
  }, [baselineSortedStudents, searchTerm, selectedYear, sortBy]);

  const visibleStudents = processedStudents.slice(0, visibleCount);
  const hasMore = visibleCount < processedStudents.length;

  const loadMoreStudents = () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) =>
          Math.min(prev + 20, processedStudents.length),
        );
        setIsLoadingMore(false);
      }, 100);
    }
  };

  const userRank = user?.id != null ? (rankById.get(Number(user.id)) ?? null) : null;

  useEffect(() => {
    if (!observerRef.current || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore) {
          loadMoreStudents();
        }
      },
      { threshold: 1.0 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, visibleCount]);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, sortBy, sortDirection, selectedCampus]);

  const scrollToUserPosition = () => {
    const userPosition = processedStudents.findIndex(
      (student: Student) => String(student.id) === user?.id,
    );
    if (userPosition === -1) return;
    if (userPosition >= visibleCount) {
      setVisibleCount(userPosition + 21);
      setTimeout(() => {
        if (userRowRef.current) {
          userRowRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          setTimeout(() => {
            if (userRowRef.current) {
              userRowRef.current.style.transform = "scale(1.02)";
              setTimeout(() => {
                if (userRowRef.current) {
                  userRowRef.current.style.transform = "scale(1)";
                }
              }, 200);
            }
          }, 100);
        }
      }, 50);
    } else {
      if (userRowRef.current) {
        userRowRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTimeout(() => {
          if (userRowRef.current) {
            userRowRef.current.style.transform = "scale(1.02)";
            setTimeout(() => {
              if (userRowRef.current) {
                userRowRef.current.style.transform = "scale(1)";
              }
            }, 200);
          }
        }, 100);
      }
    }
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setSortDirection("desc");
    
    // Update sort history - only for login time filters, keep max 2
    const isLoginTimeFilter = Object.values(loginTimeCategories).some(cat => 
      cat.options.includes(value)
    );
    
    if (isLoginTimeFilter) {
      setSortHistory(prev => {
        const newHistory = [value, ...prev.filter(v => v !== value)];
        return newHistory.slice(0, 2);
      });
    }
  };

  const handleLoginTimeCategoryChange = (categoryKey: string) => {
    setLoginTimeCategory(categoryKey);
    // Set the first option of the new category as the default sort
    const category = loginTimeCategories[categoryKey as keyof typeof loginTimeCategories];
    if (category && category.options.length > 0) {
      setSortBy(category.options[0]);
      setSortDirection("desc");
    }
  };

  // Get available login time options for current category
  const currentLoginTimeOptions = useMemo(() => {
    const category = loginTimeCategories[loginTimeCategory as keyof typeof loginTimeCategories];
    if (!category) return [];
    return sortOptions.filter(opt => category.options.includes(opt.value));
  }, [loginTimeCategory]);

  // Check if current sort is a login time filter
  const isLoginTimeFilter = useMemo(() => {
    return Object.values(loginTimeCategories).some(cat => 
      cat.options.includes(sortBy)
    );
  }, [sortBy]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground">
            #{position}
          </span>
        );
    }
  };

  const getSortIcon = () => {
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4" />;
    } else {
      return <ArrowDown className="h-4 w-4" />;
    }
  };

  const getSortLabel = (value: string) => {
    const option = sortOptions.find(opt => opt.value === value);
    return option ? option.label : "Sort by...";
  };

  const getStatValue = (student: Student, sortValue: string): { label: string; value: string } | null => {
    const logtime = student.activityData?.logtime;
    
    // Only return stats for login time filters
    switch (sortValue) {
      case "totalLoginTime":
        return logtime ? { label: "Total", value: `${logtime.totalHours}h` } : null;
      case "avgDailyHours":
        return logtime ? { label: "Avg/day", value: `${logtime.averageDailyHours}h` } : null;
      case "activeDays":
        return logtime ? { label: "Active days", value: `${logtime.activeDays}` } : null;
      case "presenceRate":
        return logtime ? { label: "Presence", value: `${logtime.presenceRate}%` } : null;
      case "currentStreak":
        return logtime ? { label: "Current streak", value: `${logtime.currentStreak}d` } : null;
      case "maxStreak":
        return logtime ? { label: "Max streak", value: `${logtime.maxStreak}d` } : null;
      case "daysWithoutConnection":
        return logtime ? { label: "Days off", value: `${logtime.daysWithoutConnection}d` } : null;
      case "totalSessions":
        return logtime ? { label: "Sessions", value: `${logtime.totalSessions}` } : null;
      case "avgSessionDuration":
        return logtime?.sessions ? { label: "Avg session", value: `${logtime.sessions.average}h` } : null;
      case "last7DaysTotal":
        return logtime?.last7Days ? { label: "Last 7d", value: `${logtime.last7Days.totalHours}h` } : null;
      case "last30DaysTotal":
        return logtime?.last30Days ? { label: "Last 30d", value: `${logtime.last30Days.totalHours}h` } : null;
      case "bestDayHours":
        return logtime?.bestDay ? { label: "Best day", value: `${logtime.bestDay.hours}h` } : null;
      case "worstDayHours":
        return logtime?.worstDay ? { label: "Worst day", value: `${logtime.worstDay.hours}h` } : null;
      case "morningHours":
        return logtime?.timePreferences?.morning ? { label: "Morning", value: `${logtime.timePreferences.morning.hours}h` } : null;
      case "afternoonHours":
        return logtime?.timePreferences?.afternoon ? { label: "Afternoon", value: `${logtime.timePreferences.afternoon.hours}h` } : null;
      case "eveningHours":
        return logtime?.timePreferences?.evening ? { label: "Evening", value: `${logtime.timePreferences.evening.hours}h` } : null;
      case "nightHours":
        return logtime?.timePreferences?.night ? { label: "Night", value: `${logtime.timePreferences.night.hours}h` } : null;
      case "weekdayHours":
        return logtime?.weekdayVsWeekend?.weekday ? { label: "Weekday", value: `${logtime.weekdayVsWeekend.weekday.hours}h` } : null;
      case "weekendHours":
        return logtime?.weekdayVsWeekend?.weekend ? { label: "Weekend", value: `${logtime.weekdayVsWeekend.weekend.hours}h` } : null;
      case "weekdayRatio":
        return logtime?.weekdayVsWeekend ? { label: "Wk/We ratio", value: `${logtime.weekdayVsWeekend.ratio}x` } : null;
      case "days4h":
        return logtime?.productivity ? { label: "Days ≥4h", value: `${logtime.productivity.days4h}` } : null;
      case "days8h":
        return logtime?.productivity ? { label: "Days ≥8h", value: `${logtime.productivity.days8h}` } : null;
      case "days12h":
        return logtime?.productivity ? { label: "Days ≥12h", value: `${logtime.productivity.days12h}` } : null;
      case "productivityRate":
        return logtime?.productivity ? { label: "Productivity", value: `${logtime.productivity.rate}%` } : null;
      case "maxSession":
        return logtime?.sessions ? { label: "Max session", value: `${logtime.sessions.max}h` } : null;
      case "minSession":
        return logtime?.sessions ? { label: "Min session", value: `${logtime.sessions.min}h` } : null;
      default:
        return null;
        return null;
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive font-medium">
                Failed to load rankings
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const debouncedSearch = useMemo(
    () =>
      debounce(
        (term: string) => {
          setSearchTerm(term);
        },
        { wait: 400 },
      ),
    [],
  );

  // Protection: Afficher le loading tant que les données ne sont pas chargées
  if (!showTimeoutError && ((isLoading || isFetching) && !isSuccess)) {
    return <LoadingScreen message="Loading rankings..." />;
  }

  return (
    <TooltipProvider>
    <div className="max-w-7xl mx-auto px-4 space-y-6 py-3">
      {/* Message d'erreur après timeout */}
      {showTimeoutError && (!isSuccess || !students || students.length === 0) && (
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
      
      <Card className="lg:sticky lg:top-4 lg:z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto">
              {userRank && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollToUserPosition}
                  className="flex items-center gap-1 px-3 bg-transparent w-full sm:w-auto"
                  title="Go to your position"
                >
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">#{userRank}</span>
                </Button>
              )}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            <div className="w-full sm:w-auto">
              {/* Desktop view - show controls directly */}
              <div className="hidden sm:flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2021">2021</SelectItem>
                      <SelectItem value="2020">2020</SelectItem>
                      <SelectItem value="2019">2019</SelectItem>
                      <SelectItem value="2018">2018</SelectItem>
                      <SelectItem value="2017">2017</SelectItem>
                      <SelectItem value="2016">2016</SelectItem>
                      <SelectItem value="2015">2015</SelectItem>
                      <SelectItem value="2014">2014</SelectItem>
                      <SelectItem value="2013">2013</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={selectedCampus || user?.campus}
                    onValueChange={setSelectedCampus}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-48 justify-between">
                        {getSortLabel(sortBy)}
                        <ArrowUpDown className="h-4 w-4 ml-2 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48">
                      <DropdownMenuItem onClick={() => handleSortChange("level")}>
                        Level
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("wallet")}>
                        Wallet
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Corrections</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48">
                          <DropdownMenuItem onClick={() => handleSortChange("correctionPoints")}>
                            Correction points
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("nb_corrections")}>
                            Number of corrections
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSortChange("correctionPercentage")}
                            title="Ratio of corrections validated vs KO'd by this person"
                          >
                            Correction ratio
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Login Time</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48 max-h-[400px] overflow-y-auto">
                          <DropdownMenuItem onClick={() => handleSortChange("totalLoginTime")}>
                            Total hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("avgDailyHours")}>
                            Avg hours/day
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("activeDays")}>
                            Active days
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("presenceRate")}>
                            Presence rate
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleSortChange("currentStreak")}>
                            Current streak
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("maxStreak")}>
                            Max streak
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("daysWithoutConnection")}>
                            Days without login
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleSortChange("totalSessions")}>
                            Total sessions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("avgSessionDuration")}>
                            Avg session duration
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("maxSession")}>
                            Max session
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("minSession")}>
                            Min session
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleSortChange("last7DaysTotal")}>
                            Last 7 days
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("last30DaysTotal")}>
                            Last 30 days
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleSortChange("bestDayHours")}>
                            Best day hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("worstDayHours")}>
                            Worst day hours
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleSortChange("morningHours")}>
                            Morning hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("afternoonHours")}>
                            Afternoon hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("eveningHours")}>
                            Evening hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("nightHours")}>
                            Night hours
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleSortChange("weekdayHours")}>
                            Weekday hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("weekendHours")}>
                            Weekend hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("weekdayRatio")}>
                            Weekday ratio
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleSortChange("days4h")}>
                            Days ≥4h
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("days8h")}>
                            Days ≥8h
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("days12h")}>
                            Days ≥12h
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSortChange("productivityRate")}>
                            Productivity rate
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => handleSortChange("internship")}>
                        En stage
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("work_study")}>
                        En alternance
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSortDirection}
                  className="flex items-center gap-1 px-3 bg-transparent w-full sm:w-auto"
                  title={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
                >
                  {getSortIcon()}
                  <span className="hidden sm:inline">
                    {sortDirection === "asc" ? "Asc" : "Desc"}
                  </span>
                </Button>
              </div>

              {/* Mobile view - show controls in accordion */}
              <div className="sm:hidden w-full">
                <Accordion type="single" collapsible>
                  <AccordionItem value="filters" className="border-0">
                    <AccordionTrigger className="py-2 px-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Filters & Sorting</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <div className="flex flex-col gap-3 px-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <Select
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Years</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2023">2023</SelectItem>
                              <SelectItem value="2022">2022</SelectItem>
                              <SelectItem value="2021">2021</SelectItem>
                              <SelectItem value="2020">2020</SelectItem>
                              <SelectItem value="2019">2019</SelectItem>
                              <SelectItem value="2018">2018</SelectItem>
                              <SelectItem value="2017">2017</SelectItem>
                              <SelectItem value="2016">2016</SelectItem>
                              <SelectItem value="2015">2015</SelectItem>
                              <SelectItem value="2014">2014</SelectItem>
                              <SelectItem value="2013">2013</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <Select
                            value={selectedCampus || user?.campus}
                            onValueChange={setSelectedCampus}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Campus" />
                            </SelectTrigger>
                            <SelectContent>
                              {campusOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full justify-between">
                                {getSortLabel(sortBy)}
                                <ArrowUpDown className="h-4 w-4 ml-2 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              <DropdownMenuItem onClick={() => handleSortChange("level")}>
                                Level
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSortChange("wallet")}>
                                Wallet
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Corrections</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-56">
                                  <DropdownMenuItem onClick={() => handleSortChange("correctionPoints")}>
                                    Correction points
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("nb_corrections")}>
                                    Number of corrections
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleSortChange("correctionPercentage")}
                                    title="Ratio of corrections validated vs KO'd by this person"
                                  >
                                    Correction ratio
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Login Time</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-56 max-h-[400px] overflow-y-auto">
                                  <DropdownMenuItem onClick={() => handleSortChange("totalLoginTime")}>
                                    Total hours
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("avgDailyHours")}>
                                    Avg hours/day
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("activeDays")}>
                                    Active days
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("presenceRate")}>
                                    Presence rate
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleSortChange("currentStreak")}>
                                    Current streak
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("maxStreak")}>
                                    Max streak
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("daysWithoutConnection")}>
                                    Days without login
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleSortChange("totalSessions")}>
                                    Total sessions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("avgSessionDuration")}>
                                    Avg session duration
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleSortChange("avgSessionDuration")}>
                                    Avg session duration
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("maxSession")}>
                                    Max session
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("minSession")}>
                                    Min session
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleSortChange("last7DaysTotal")}>
                                    Last 7 days
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("last30DaysTotal")}>
                                    Last 30 days
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleSortChange("bestDayHours")}>
                                    Best day hours
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("worstDayHours")}>
                                    Worst day hours
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleSortChange("morningHours")}>
                                    Morning hours
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("afternoonHours")}>
                                    Afternoon hours
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("eveningHours")}>
                                    Evening hours
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("nightHours")}>
                                    Night hours
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleSortChange("weekdayHours")}>
                                    Weekday hours
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("weekendHours")}>
                                    Weekend hours
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("weekdayRatio")}>
                                    Weekday ratio
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => handleSortChange("days4h")}>
                                    Days ≥4h
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("days8h")}>
                                    Days ≥8h
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("days12h")}>
                                    Days ≥12h
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortChange("productivityRate")}>
                                    Productivity rate
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem onClick={() => handleSortChange("internship")}>
                                En stage
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSortChange("work_study")}>
                                En alternance
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleSortDirection}
                          className="flex items-center gap-1 px-3 bg-transparent w-full"
                          title={`Sort ${sortDirection === "asc" ? "ascending" : "descending"
                            }`}
                        >
                          {getSortIcon()}
                          <span>
                            {sortDirection === "asc"
                              ? "Ascending"
                              : "Descending"}
                          </span>
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4">
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-22" />
                    </div>
                  </div>
                  <div className="sm:hidden">
                    <Skeleton className="h-4 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && processedStudents.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? `No students match "${searchTerm}"`
                  : "No students available for this campus"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && processedStudents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Leaderboard</CardTitle>
              <div className="flex items-center gap-2">
                {userRank && (
                  <Badge variant="outline" className="text-xs">
                    Your Rank: #{userRank}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {processedStudents.length} student
                  {processedStudents.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {visibleStudents.map((student: Student) => {
                const position = rankById.get(student.id) ?? 0;
                const isCurrentUser = Number(student.id) === Number(user?.id);

                return (
                  <div
                    key={student.id}
                    ref={isCurrentUser ? userRowRef : null}
                    className={`flex items-center gap-4 p-4 transition-all duration-200 hover:bg-muted/50 ${isCurrentUser && highlightUser
                      ? "bg-primary/10 border-l-4 border-primary"
                      : isCurrentUser
                        ? "bg-muted/30"
                        : ""
                      }`}
                  >
                    <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                      {position <= 3 && sortDirection === "desc" ? (
                        <div className="flex flex-col items-center">
                          {getRankIcon(position)}
                        </div>
                      ) : (
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full ${isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                            }`}
                        >
                          <span
                            className={`text-sm font-bold ${isCurrentUser
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                              }`}
                          >
                            {position}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      onClick={() => {
                        setSelectedPhoto(student.photoUrl || "/placeholder.svg");
                        setSelectedName(student.name);
                      }}
                      className="cursor-pointer"
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0 sm:block">
                        <AvatarImage
                          src={student.photoUrl || "/placeholder.svg"}
                          alt={student.name}
                          className="object-cover"
                        />
                        <AvatarFallback
                          className={
                            isCurrentUser ? "bg-primary/20 text-primary" : ""
                          }
                        >
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3
                          className={`font-semibold truncate ${isCurrentUser ? "text-primary" : ""
                            }`}
                        >
                          {student.name}
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (You)
                            </span>
                          )}
                        </h3>
                        {student.work === 1 && (
                          <span title="En stage">
                            <Briefcase className="h-4 w-4 flex-shrink-0 text-green-500" />
                          </span>
                        )}
                        {student.work === 2 && (
                          <span title="En alternance">
                            <Briefcase className="h-4 w-4 flex-shrink-0 text-blue-500" />
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Level {student.level}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {/* Column 1: Wallet & Correction Points */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Wallet:{" "}
                              <span
                                className={`font-medium ${sortBy === "wallet"
                                  ? "text-primary"
                                  : "text-foreground"
                                  }`}
                              >
                                {student.wallet}₳
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Correction Points:{" "}
                              <span
                                className={`font-medium ${sortBy === "correctionPoints"
                                  ? "text-primary"
                                  : "text-foreground"
                                  }`}
                              >
                                {student.correctionPoints}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Column 2: Correction Ratio & OK/KO */}
                        {student.correctionPercentage !== 420 && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1">
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground cursor-help">
                                    Correction:{" "}
                                    <span
                                      className={`font-medium ${sortBy === "correctionPercentage"
                                        ? "text-primary"
                                        : "text-foreground"
                                        }`}
                                    >
                                      {student.correctionPercentage}%
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ratio of corrections validated vs KO&apos;d</p>
                                </TooltipContent>
                              </UITooltip>
                            </div>
                            <div className="flex items-center gap-1">
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground cursor-help">
                                    <span className="font-medium text-foreground">
                                      {student.correctionPositive} ✓
                                    </span>
                                    <span className="mx-1">/</span>
                                    <span className="font-medium text-foreground">
                                      {student.correctionNegative} ✗
                                    </span>
                                    <span className="ml-1 text-muted-foreground">
                                      ({student.correctionTotal})
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Validations / KO</p>
                                </TooltipContent>
                              </UITooltip>
                            </div>
                          </div>
                        )}

                        {/* Column 3: Dynamic Stats based on sortHistory */}
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-2 text-xs">
                            {sortHistory.slice(0, 2).map((sortValue, index) => {
                              const stat = getStatValue(student, sortValue);
                              if (!stat) return null;
                              
                              return (
                                <div key={sortValue} className="flex items-center gap-1">
                                  <span className="text-muted-foreground">
                                    {stat.label}:{" "}
                                    <span
                                      className={`font-medium ${sortBy === sortValue
                                        ? "text-primary"
                                        : "text-foreground"
                                        }`}
                                    >
                                      {stat.value}
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          {student.activityData && student.activityData.logtime && (
                            <button
                              onClick={() => {
                                setSelectedLogtime(student.activityData.logtime);
                                setSelectedName(student.name);
                                setShowLogtimeDialog(true);
                              }}
                              className="flex items-center justify-center h-6 w-6 rounded-full bg-muted hover:bg-primary/20 transition-colors text-muted-foreground hover:text-primary"
                              title="View detailed logtime statistics"
                            >
                              <span className="text-sm font-bold">+</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* {student.activityData && (
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-8 relative sm:w-24 sm:h-10">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={student.activityData.dailyHours}>
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#ffff"
                                strokeWidth={2}
                                dot={false}
                                strokeLinecap="round"
                              />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-popover border rounded-md p-2 shadow-md">
                                        <p className="text-xs font-medium">
                                          {payload[0].value}h on day {label}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">
                              {Math.round(student.activityData.totalTime / 60)}h
                            </span>
                            <span className="text-muted-foreground">total</span>
                          </div>
                          {student.activityData.dailyHours &&
                            student.activityData.dailyHours.length > 0 && (
                              <div className="text-muted-foreground">
                                {student.activityData.dailyHours.length} days
                              </div>
                            )}
                        </div>
                      </div>
                    )} */}
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast.info(`Viewing profile for ${student.name}`, {
                            duration: 2000,
                            position: "bottom-right",
                          });
                          window.open(
                            `https://profile.intra.42.fr/users/${student?.name}`,
                            "_blank",
                          );
                        }}
                        className="flex items-center gap-1 px-3 text-muted-foreground hover:text-foreground"
                        title={`View ${student.name}'s profile`}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">
                          Profile
                        </span>
                      </Button>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div
                  ref={observerRef}
                  className="flex items-center justify-center p-4"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        Loading more students...
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Scroll to load more (
                      {processedStudents.length - visibleCount} remaining)
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dialog for Logtime Details */}
      <Dialog open={showLogtimeDialog} onOpenChange={setShowLogtimeDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Login Time Statistics - {selectedName}
            </DialogTitle>
            <DialogDescription>
              Comprehensive campus login activity analysis
            </DialogDescription>
          </DialogHeader>
          
          {selectedLogtime && (
            <div className="space-y-6">
              {/* Overview Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Total Time</div>
                    <div className="text-xl font-bold text-primary">
                      {selectedLogtime.totalHours}h
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.totalDays} days
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Active Days</div>
                    <div className="text-xl font-bold">
                      {selectedLogtime.activeDays}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.presenceRate}% rate
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Total Sessions</div>
                    <div className="text-xl font-bold">
                      {selectedLogtime.totalSessions}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.sessions.perDay}/day avg
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Avg/Day</div>
                    <div className="text-xl font-bold text-primary">
                      {selectedLogtime.averageDailyHours}h
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.averageDailyMinutes} min
                    </div>
                  </Card>
                </div>
              </div>

              {/* Streaks & Periods */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Activity Periods</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Current Streak</div>
                    <div className="text-xl font-bold text-green-500">
                      {selectedLogtime.currentStreak} days
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Max Streak</div>
                    <div className="text-xl font-bold">
                      {selectedLogtime.maxStreak} days
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Days Without</div>
                    <div className="text-xl font-bold text-orange-500">
                      {selectedLogtime.daysWithoutConnection}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Recent Activity</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-2">Last 7 Days</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-primary">{selectedLogtime.last7Days.totalHours}h</span>
                      <span className="text-xs text-muted-foreground">total</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedLogtime.last7Days.avgPerDay}h/day · {selectedLogtime.last7Days.activeDays} days
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-2">Last 30 Days</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-primary">{selectedLogtime.last30Days.totalHours}h</span>
                      <span className="text-xs text-muted-foreground">total</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedLogtime.last30Days.avgPerDay}h/day · {selectedLogtime.last30Days.activeDays} days
                    </div>
                  </Card>
                </div>
              </div>

              {/* Best & Worst Days */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Record Days</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 border-green-500/20 bg-green-500/5">
                    <div className="text-xs text-muted-foreground mb-1">Best Day</div>
                    <div className="text-lg font-bold text-green-500">
                      {selectedLogtime.bestDay.hours}h
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(selectedLogtime.bestDay.date).toLocaleDateString('fr-FR')}
                    </div>
                  </Card>
                  
                  <Card className="p-3 border-orange-500/20 bg-orange-500/5">
                    <div className="text-xs text-muted-foreground mb-1">Worst Day</div>
                    <div className="text-lg font-bold text-orange-500">
                      {selectedLogtime.worstDay.hours}h
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(selectedLogtime.worstDay.date).toLocaleDateString('fr-FR')}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Top 5 Days */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Top 5 Days</h3>
                <div className="grid grid-cols-1 gap-2">
                  {selectedLogtime.topDays.map((day: { date: string; hours: string }, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <span className="text-sm">
                          {new Date(day.date).toLocaleDateString('fr-FR', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary">{day.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Hosts */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Favorite Workstations</h3>
                <div className="grid grid-cols-1 gap-2">
                  {selectedLogtime.topHosts.map((host: { host: string; hours: string; percentage: string }, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-mono font-semibold">{host.host}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">{host.hours}h</div>
                        <div className="text-xs text-muted-foreground">{host.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Preferences */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Time Preferences</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Morning</div>
                    <div className="text-lg font-bold">{selectedLogtime.timePreferences.morning.hours}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.timePreferences.morning.percentage}%
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Afternoon</div>
                    <div className="text-lg font-bold">{selectedLogtime.timePreferences.afternoon.hours}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.timePreferences.afternoon.percentage}%
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Evening</div>
                    <div className="text-lg font-bold">{selectedLogtime.timePreferences.evening.hours}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.timePreferences.evening.percentage}%
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Night</div>
                    <div className="text-lg font-bold">{selectedLogtime.timePreferences.night.hours}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.timePreferences.night.percentage}%
                    </div>
                  </Card>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Peak Hour: <span className="font-semibold text-foreground">{selectedLogtime.peakHour}:00</span></span>
                  <span className="text-muted-foreground">Quiet Hour: <span className="font-semibold text-foreground">{selectedLogtime.quietHour}:00</span></span>
                  <span className="text-muted-foreground">Profile: <span className="font-semibold text-primary capitalize">{selectedLogtime.profile}</span></span>
                </div>
              </div>

              {/* Weekday vs Weekend */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Weekday vs Weekend</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Weekday</div>
                    <div className="text-lg font-bold text-primary">{selectedLogtime.weekdayVsWeekend.weekday.hours}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.weekdayVsWeekend.weekday.percentage}%
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Weekend</div>
                    <div className="text-lg font-bold">{selectedLogtime.weekdayVsWeekend.weekend.hours}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedLogtime.weekdayVsWeekend.weekend.percentage}%
                    </div>
                  </Card>
                </div>
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  Ratio: <span className="font-semibold text-foreground">{selectedLogtime.weekdayVsWeekend.ratio}x</span> more on weekdays
                </div>
              </div>

              {/* Productivity */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Productivity</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Days ≥4h</div>
                    <div className="text-lg font-bold">{selectedLogtime.productivity.days4h}</div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Days ≥8h</div>
                    <div className="text-lg font-bold text-primary">{selectedLogtime.productivity.days8h}</div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Days ≥12h</div>
                    <div className="text-lg font-bold text-green-500">{selectedLogtime.productivity.days12h}</div>
                  </Card>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-sm text-muted-foreground">Productivity Rate: </span>
                  <span className="text-lg font-bold text-primary">{selectedLogtime.productivity.rate}%</span>
                </div>
              </div>

              {/* Session Stats */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Session Statistics</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Average</div>
                    <div className="text-lg font-bold">{selectedLogtime.sessions.average}h</div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Max</div>
                    <div className="text-lg font-bold text-green-500">{selectedLogtime.sessions.max}h</div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Min</div>
                    <div className="text-lg font-bold text-orange-500">{selectedLogtime.sessions.min}h</div>
                  </Card>
                </div>
              </div>

              {/* Footer */}
              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                Period: {new Date(selectedLogtime.firstDay).toLocaleDateString('fr-FR')} → {new Date(selectedLogtime.lastDay).toLocaleDateString('fr-FR')} ({selectedLogtime.daysSinceFirst} days)
                <br />
                Last updated: {new Date(selectedLogtime.lastUpdated).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPhoto(null);
            setSelectedName(null);
          }
        }}
      >
        <DialogContent
          className="max-w-3xl border-0 bg-transparent p-0 shadow-none"
        >
          <DialogTitle className="sr-only">
          </DialogTitle>
          <DialogClose
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80 focus:outline-none"
          >
            ✕
          </DialogClose>
          {selectedPhoto && (
            <div className="w-full">
              <img
                src={selectedPhoto}
                alt={selectedName || "Avatar"}
                className="w-full h-auto max-h-[90vh] object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
