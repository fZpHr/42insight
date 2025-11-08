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
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { fetchUserIntraInfo } from "@/utils/fetchFunctions"

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
  const { data: session } = useSession({ required: true })
  const { width, height } = useWindowSize()

  // UI State
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

  const [activeTitle, setActiveTitle] = useState<FortyTwoTitle | null>(titles[0] ?? null)

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

  const { data: userIntraInfo, isLoading: isIntraLoading } = useQuery({
    queryKey: ["userIntraInfo", session?.user?.login],
    queryFn: () => fetchUserIntraInfo(session!.user!.login!),
    enabled: !!session?.user?.login,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: userEvents, isLoading: areEventsLoading } = useQuery({
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
          // Silently fail if localStorage is not available
        }
      }
    },
    [manualProjectsKey],
  )

  const isLoading = !hydrated || isIntraLoading || areEventsLoading || !isDataProcessed

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-lg">
        Chargement des données du simulateur...
      </div>
    )
  }

  return (
    <>
      {showConfetti && <ReactConfetti width={width} height={height} recycle={false} />}
      {activeTitle && <TitleSelector titles={titles} activeTitle={activeTitle} setActiveTitle={setActiveTitle} />}

      <Separator className="my-6" />
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-semibold">
          Alpha
        </span>
        <span className="text-muted-foreground text-xs">
          This version of the RNCP simulator is in alpha development.
          <br />
          Please don't hesitate to submit bug reports&nbsp;
          <a
            href="https://github.com/fzphr/42insight/issues/new?title=[ISSUE]&body=Describe%20your%20issue%20here...&labels=issue"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-700 hover:text-blue-900"
            aria-label="Report a bug on GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-1"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
          
        </span>
      </div>

      <div className="my-6 space-y-1.5">
        <h4 className="font-semibold text-2xl leading-none tracking-tight">Information</h4>

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
                  // Silently fail
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
      <div className="fixed bottom-2 left-0 w-full text-center text-xs text-muted-foreground pointer-events-none z-50">
        This project is inspired by a similar tool from the staff of 42 Angoulême, with their agreement.
      </div>
    </>
  )
}
