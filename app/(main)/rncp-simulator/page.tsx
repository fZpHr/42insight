"use client"

import { shallow } from "zustand/shallow"
import { useFortyTwoStore } from "@/providers/forty-two-store-provider"
import type { FortyTwoTitle } from "@/types/forty-two"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"

import { TitleOptions } from "./(components)/options"
import { TitleRequirements } from "./(components)/requirements"
import { TitleSelector } from "./(components)/selector"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useWindowSize } from "react-use"
import { useContext } from "react"
import { FortyTwoStoreContext } from "@/providers/forty-two-store-provider"
import ReactConfetti from "react-confetti"
import { useSession, signIn } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { fetchUserIntraInfo } from "@/utils/fetchFunctions"
import { Loader2, GraduationCap, Trophy, Award, RefreshCw } from "lucide-react"
import { isDevPreviewEnabled } from "@/lib/dev-preview"

function getManualProjectsKey(session: any) {
  return session?.user?.login ? `manualProjects_${session.user.login}` : undefined
}

async function fetchUserEvents(login: string) {
  if (!login) return []
  const res = await fetch(`/api/users/${login}/events`)
  if (!res.ok) throw new Error("Failed to fetch user events")
  const data = await res.json()
  return data.events || []
}

export default function RNCPSimulator() {
  const storeContext = useContext(FortyTwoStoreContext)
  // Plain useSession, not `required: true`: that option pins status to
  // "loading" for as long as it stays unauthenticated, which in preview mode
  // is forever, and its own redirect-on-unauthenticated fired regardless of
  // the value of `required` passed on later renders. Doing the redirect here
  // instead means it only ever runs once, and only when there really is no
  // preview bypass.
  const { data: session, status } = useSession()
  useEffect(() => {
    if (status === "unauthenticated" && !isDevPreviewEnabled()) signIn()
  }, [status])
  const { width, height } = useWindowSize()


  const [showConfetti, setShowConfetti] = useState(false)
  const [optionStatuses, setOptionStatuses] = useState<Record<string, boolean>>({})
  const manualProjectsKey = getManualProjectsKey(session)

  const [manualProjects, setManualProjects] = useState<any[]>(() => {
    if (typeof window === "undefined" || !manualProjectsKey) return []
    try {
      const raw = localStorage.getItem(manualProjectsKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const {
    titles,
    setEvents,
    resetAll,
    softReset,
    processInitialData,
    persistedOldProjects,
    hydrated,
    isDataProcessed,
  } = useFortyTwoStore(
    (state) => ({
      titles: state.titles,
      setEvents: state.setEvents,
      resetAll: state.resetAll,
      softReset: state.softReset,
      processInitialData: state.processInitialData,
      persistedOldProjects: state.persistedOldProjects,
      hydrated: state.hydrated,
      isDataProcessed: state.isDataProcessed,
    }),
    shallow,
  )

  const [activeTitle, setActiveTitle] = useState<FortyTwoTitle | null>(() => {

    if (typeof window !== "undefined") {
      try {
        const savedTitleName = localStorage.getItem("rncp_active_title_name")
        if (savedTitleName) {
          const savedTitle = titles.find(t => t.title === savedTitleName)
          if (savedTitle) return savedTitle
        }
      } catch {

      }
    }
    return titles[0] ?? null
  })


  useEffect(() => {
    if (activeTitle && typeof window !== "undefined") {
      try {
        localStorage.setItem("rncp_active_title_name", activeTitle.title)
      } catch {

      }
    }
  }, [activeTitle])

  const storeState = useFortyTwoStore(
    (state) => ({
      getSelectedXP: state.getSelectedXP,
      getLevel: state.getLevel,
      events: state.events,
      professionalExperiences: state.professionalExperiences,
      projects: state.projects,
      projectMarks: state.projectMarks,
      coalitionProjects: state.coalitionProjects,
    }),
    shallow,
  )

  const {
    data: userIntraInfo,
    isLoading: isIntraLoading,
    isFetching: isIntraFetching,
    error: intraError,
    refetch: refetchIntra,
  } = useQuery({
    queryKey: ["userIntraInfo", session?.user?.login],
    queryFn: () => fetchUserIntraInfo(session!.user!.login!),
    enabled: !!session?.user?.login,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const {
    data: userEvents,
    isLoading: areEventsLoading,
    isFetching: isEventsFetching,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["userEvents", session?.user?.login],
    queryFn: () => fetchUserEvents(session!.user!.login!),
    enabled: !!session?.user?.login,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (userIntraInfo && activeTitle && !isDataProcessed) {
      processInitialData(userIntraInfo, activeTitle)
    }
  }, [userIntraInfo, isDataProcessed, processInitialData])

  // A plain refetch would land fresh marks in the query cache without ever
  // reaching the store: processInitialData only auto-runs once, gated on
  // isDataProcessed. It merges rather than overwrites -- a mark the visitor
  // edited by hand differs from its auto-fetched twin, and stays put -- so
  // calling it again here is safe even with manual edits already in place.
  const isRefreshingSimulator = isIntraFetching || isEventsFetching
  const refreshSimulatorData = async () => {
    const [intraResult] = await Promise.all([refetchIntra(), refetchEvents()])
    if (intraResult.data && activeTitle) {
      processInitialData(intraResult.data, activeTitle)
    }
  }

  useEffect(() => {
    if (Array.isArray(userEvents)) {
      setEvents(userEvents.length)
    }
  }, [userEvents, setEvents])

  const requirementsComplete = useMemo(() => {
    if (!activeTitle || !isDataProcessed) return false

    const currentXP = storeState.getSelectedXP()
    const currentLevel = storeState.getLevel(currentXP)
    const events = storeState.events
    const professionalExperiences = storeState.professionalExperiences

    let professionalExperiencesCount = professionalExperiences.size
    if (professionalExperiences.has("alternance_2_ans")) professionalExperiencesCount += 1

    const groupProjects = Object.values(storeState.projects).filter((p) => p && p.is_solo === false)
    const validatedGroupProjectsCount = groupProjects.filter((p) => (storeState.projectMarks.get(p.id) ?? 0) > 0).length
    const allTabsComplete = Object.keys(optionStatuses).length > 0 && Object.values(optionStatuses).every(Boolean)

    return (
      currentLevel >= activeTitle.level &&
      events >= activeTitle.number_of_events &&
      professionalExperiencesCount >= activeTitle.number_of_experiences &&
      validatedGroupProjectsCount >= 2 &&
      allTabsComplete
    )
  }, [activeTitle, storeState, optionStatuses, isDataProcessed])

  const prevReqsComplete = useRef(false)
  useEffect(() => {
    if (requirementsComplete && !prevReqsComplete.current) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 8000)
      return () => clearTimeout(timer)
    }
    prevReqsComplete.current = requirementsComplete
  }, [requirementsComplete])

  const onManualProjectsChange = useCallback(
    (newManualProjects: any[]) => {
      if (manualProjectsKey) {
        try {
          localStorage.setItem(manualProjectsKey, JSON.stringify(newManualProjects))
          setManualProjects(newManualProjects)
        } catch {

        }
      }
    },
    [manualProjectsKey],
  )

  const { setProjectMark, toggleCoalitionBonus, coalitionProjects } = useFortyTwoStore(
    (state) => ({
      setProjectMark: state.setProjectMark,
      toggleCoalitionBonus: state.toggleCoalitionBonus,
      coalitionProjects: state.coalitionProjects,
    }),
    shallow,
  )

  const hasRestoredManualProjects = useRef(false)
  useEffect(() => {
    if (isDataProcessed && manualProjects.length > 0 && !hasRestoredManualProjects.current) {
      hasRestoredManualProjects.current = true
      manualProjects.forEach((project) => {
        setProjectMark(project.id, project.mark, true)
        if (project.coa && !coalitionProjects.has(project.id)) {
          toggleCoalitionBonus(project.id)
        }
      })
    }
  }, [isDataProcessed, manualProjects, setProjectMark, toggleCoalitionBonus, coalitionProjects])

  const isLoading = !hydrated || isIntraLoading || areEventsLoading || !isDataProcessed

  return (
    <div className="container mx-auto p-6 space-y-6">
      {showConfetti && <ReactConfetti width={width} height={height} recycle={false} />}
      {activeTitle && <TitleSelector titles={titles} activeTitle={activeTitle} setActiveTitle={setActiveTitle} />}

      <Separator className="my-6" />

      <div className="my-6 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-2xl leading-none tracking-tight">Information</h4>
          <Button
            variant="outline"
            size="icon"
            onClick={refreshSimulatorData}
            disabled={isRefreshingSimulator}
            aria-label="Refresh my 42 data"
            title="Refresh my 42 data"
            className="h-7 w-7 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingSimulator ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          You must validate the requirements.{" "}
          <Link
            className="underline underline-offset-1 transition-colors hover:text-foreground"
            prefetch={false}
            href="https://meta.intra.42.fr/articles/42-paris-s-homologated-certificates-rncp-6-7"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more.
          </Link>
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            variant="destructive"
            onClick={() => {
              softReset()
              window.dispatchEvent(new Event("manualProjectsReset"))
              if (manualProjectsKey) {
                try {
                  localStorage.setItem(manualProjectsKey, JSON.stringify([]))
                  setManualProjects([])
                } catch {

                }
              }
              if (userIntraInfo && activeTitle) {
                processInitialData(userIntraInfo, activeTitle)
              }
            }}
            type="button"
          >
            Reset
          </Button>
        </div>
      </div>

      <TitleRequirements
        title={activeTitle ?? titles[0]}
        manualProjects={manualProjects}
        onManualProjectsChange={onManualProjectsChange}
        className="my-6"
        autoExtraProjects={persistedOldProjects}
      />
      {activeTitle && <TitleOptions title={activeTitle} onCompletionChange={setOptionStatuses} />}
      <div className="text-center text-xs text-muted-foreground">
        This project is inspired by a similar tool from the staff of 42 Angoulême, with their agreement.
      </div>
    </div>
  )
}
