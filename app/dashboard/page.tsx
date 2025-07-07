"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { Trophy, Users, Calendar, Target, ExternalLink, TrendingUp, AlertCircle, BookOpen, Award } from "lucide-react"
import { useMemo } from "react"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  isLoading?: boolean
}

function StatCard({ title, value, icon: Icon, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

interface QuickActionProps {
  href: string
  icon: React.ElementType
  children: React.ReactNode
}

function QuickAction({ href, icon: Icon, children }: QuickActionProps) {
  return (
    <Button
      className="w-full justify-start bg-transparent"
      variant="outline"
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
    >
      <Icon className="mr-2 h-4 w-4" />
      {children}
    </Button>
  )
}

interface ProjectCardProps {
  project: any
}

function ProjectCard({ project }: ProjectCardProps) {
  const getStatusColor = (status: string, validated: boolean) => {
    if (validated) return "default"
    if (status === "in_progress") return "secondary"
    if (status === "finished") return "outline"
    return "secondary"
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{project.project.name}</h4>
        {project.updated_at && (
          <p className="text-xs text-muted-foreground">Updated: {new Date(project.updated_at).toLocaleDateString()}</p>
        )}
      </div>
      <Badge variant={getStatusColor(project.status, project["validated?"])}>
        {project.final_mark !== null ? project.final_mark : project.status.replace("_", " ")}
      </Badge>
    </div>
  )
}

interface AchievementCardProps {
  achievement: any
}

function AchievementCard({ achievement }: AchievementCardProps) {
  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0">
        <Award className="h-6 w-6 text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{achievement.name}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2">{achievement.description}</p>
      </div>
      <Badge variant="outline">{achievement.tier}</Badge>
    </div>
  )
}

interface SkillProgressProps {
  skill: any
}

function SkillProgress({ skill }: SkillProgressProps) {
  const maxLevel = 21
  const progressPercentage = Math.min((skill.level / maxLevel) * 100, 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{skill.name}</span>
        <span className="text-muted-foreground">{skill.level.toFixed(2)}</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
    </div>
  )
}

function LoadingDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCard key={i} title="" value="" icon={Trophy} isLoading />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, loading, fetchUserIntraInfo, getCampusRank } = useAuth()

  const {
    data: userIntraInfo,
    isLoading: intraLoading,
    error: intraError,
  } = useQuery({
    queryKey: ["userIntraInfo", user?.name],
    queryFn: () => fetchUserIntraInfo(user?.name || ""),
    enabled: !!user && !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })

  const {
    data: campusRank,
    isLoading: rankLoading,
    error: rankError,
  } = useQuery({
    queryKey: ["campusRank", user?.campus],
    queryFn: () => getCampusRank(user?.campus || ""),
    enabled: !!user && !loading,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })

  const currentCursus = useMemo(() => {
    return userIntraInfo?.cursus_users?.[1] || userIntraInfo?.cursus_users?.[0] || null
  }, [userIntraInfo])

  const stats = useMemo(
    () => [
      {
        title: "Level",
        value: currentCursus?.level?.toFixed(2) || "0.00",
        icon: TrendingUp,
      },
      {
        title: "Wallet",
        value: `${userIntraInfo?.wallet || 0} ₳`,
        icon: Target,
      },
      {
        title: "Evaluation Pts",
        value: userIntraInfo?.correction_point || 0,
        icon: Trophy,
      },
      {
        title: "Campus Rank",
        value: campusRank || "N/A",
        icon: Users,
      },
    ],
    [currentCursus, userIntraInfo, campusRank],
  )

  if (loading) {
    return <LoadingDashboard />
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to view your dashboard.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (intraError || rankError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load dashboard data. Please try refreshing the page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const levelProgress = ((currentCursus?.level || 0) % 1) * 100
  const recentProjects = userIntraInfo?.projects_users?.slice(0, 10) || []
  const recentAchievements = userIntraInfo?.achievements?.slice(0, 10) || []
  const topSkills = currentCursus?.skills?.slice(0, 6) || []

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20 ring-2 ring-border">
          <AvatarImage
            className="h-full w-full object-cover"
            src={userIntraInfo?.image?.link || user?.photoUrl}
            alt={`${user?.name}'s avatar`}
          />
          <AvatarFallback className="text-lg font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {userIntraInfo?.usual_full_name || user?.name}!
          </h1>
          <p className="text-muted-foreground text-lg">
            {userIntraInfo?.campus?.[0]?.name || "42 Campus"} • {currentCursus?.cursus?.name || "Common Core"}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {currentCursus?.grade && (
              <Badge variant="secondary" className="font-medium">
                {currentCursus.grade}
              </Badge>
            )}
            <Badge variant={userIntraInfo?.["active?"] ? "default" : "secondary"}>
              {userIntraInfo?.["active?"] ? "Active" : "Inactive"}
            </Badge>
            {userIntraInfo?.["staff?"] && <Badge variant="outline">Staff</Badge>}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
    <Card className="w-full">
        <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon
                if (intraLoading || rankLoading) {
                    return (
                    <div key={index} className="flex flex-col items-center text-center space-y-1">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-5 w-10" />
                    </div>
                    )
                }
                return (
                    <div key={index} className="flex flex-col items-center text-center space-y-1">
                    <Icon className="h-6 w-6 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                )
            })}
            </div>
        </CardContent>
    </Card>

      {/* Progress and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Cursus Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Level Progress</span>
                  <span className="text-muted-foreground">{levelProgress.toFixed(1)}%</span>
                </div>
                <Progress value={levelProgress} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  Current Level: {currentCursus?.level?.toFixed(2) || "0.00"}
                </p>
              </div>

              {currentCursus?.blackholed_at && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Black Hole</span>
                    <span className="text-destructive font-medium">
                      {new Date(currentCursus.blackholed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction href="https://find-peers.codam.nl/" icon={Users}>
              Find Study Partners
            </QuickAction>
            <QuickAction href="https://profile.intra.42.fr/slots" icon={Calendar}>
              Book Evaluation Slot
            </QuickAction>
            <QuickAction href="https://profile.intra.42.fr/" icon={ExternalLink}>
              Open Intranet
            </QuickAction>
          </CardContent>
        </Card>
      </div>

      {/* Projects and Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentProjects.length > 0 ? (
                recentProjects.map((project, index) => <ProjectCard key={index} project={project} />)
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent projects</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentAchievements.length > 0 ? (
                recentAchievements.map((achievement, index) => (
                  <AchievementCard key={index} achievement={achievement} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No achievements yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills Section */}
      {topSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topSkills.map((skill, index) => (
                <SkillProgress key={index} skill={skill} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
