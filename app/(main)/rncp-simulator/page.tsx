"use client"

import { shallow } from "zustand/shallow"
import { useFortyTwoStore } from "@/providers/forty-two-store-provider"
import type { FortyTwoTitle } from "@/types/forty-two"
import { useEffect, useMemo, useState } from "react"
import { TitleOptions } from "./(components)/options"
import { TitleRequirements } from "./(components)/requirements"
import { TitleSelector } from "./(components)/selector"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useWindowSize } from "react-use"
import ReactConfetti from "react-confetti"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { fetchUserIntraInfo } from "@/utils/fetchFunctions"

async function fetchUserEvents(login: string) {
  if (!login) return [];
  const res = await fetch(`/api/users/${login}/events`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.events || [];
}

export default function RNCPSimulator() {
  const { data: session } = useSession()
  // On utilise un sélecteur optimisé avec `shallow` pour éviter les re-renders inutiles.
  // On ne récupère que ce dont la page a *directement* besoin.
  const { titles, setProjectMark, setEvents, resetAll, softReset, setAutoFetchedProjectMark, clearAutoFetchedProjectMarks } =
    useFortyTwoStore(
      (state) => ({
        titles: state.titles,
        setProjectMark: state.setProjectMark,
        setEvents: state.setEvents,
        resetAll: state.resetAll,
        softReset: state.softReset,
        setAutoFetchedProjectMark: state.setAutoFetchedProjectMark,
        clearAutoFetchedProjectMarks: state.clearAutoFetchedProjectMarks,
      }),
      shallow,
    )
  const [activeTitle, setActiveTitle] = useState<FortyTwoTitle | null>(titles[0] ?? null)
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(false)
  const [optionStatuses, setOptionStatuses] = useState<Record<string, boolean>>({})

  const { data: userIntraInfo } = useQuery({
    queryKey: ["userIntraInfo", session?.user?.name],
    queryFn: () => fetchUserIntraInfo(session?.user?.login || ""),
    enabled: !!session?.user,
  })


  const { data: userEvents } = useQuery({
    queryKey: ["userEvents", session?.user?.login],
    queryFn: async () => {
      const events = await fetchUserEvents(session?.user?.login || "");
      return events;
    },
    enabled: !!session?.user,
  })

  useEffect(() => {
    if (userIntraInfo && userIntraInfo.projects_users) {
      // On vide d'abord la map autoFetchedProjectMarks pour éviter les doublons
      clearAutoFetchedProjectMarks();
      userIntraInfo.projects_users.forEach((project: any) => {
        // N'applique la note que si final_mark est défini et > 0
        if (typeof project.final_mark === 'number' && project.final_mark > 0) {
          setProjectMark(project.project.id, project.final_mark)
          setAutoFetchedProjectMark(project.project.id, project.final_mark)
        }
      })
    }
  }, [userIntraInfo, setProjectMark, setAutoFetchedProjectMark, clearAutoFetchedProjectMarks])

  useEffect(() => {
    if (Array.isArray(userEvents)) {
      //console.log("[DEBUG] Injecting events into store:", userEvents.length, userEvents)
      setEvents(userEvents.length)
    }
  }, [userEvents, setEvents])

  useEffect(() => {
    if (userIntraInfo) {
      //console.log("RAW USER INTRA INFO:", userIntraInfo);
    }
  }, [userIntraInfo]);

  if (!activeTitle) {
    return null
  }

  // La logique de complétion est maintenant dans le store.
  // On peut créer un hook personnalisé pour plus de clarté.
  const isSuiteComplete = useMemo(() => optionStatuses["Suite"] === true, [optionStatuses])
  const isAnyOtherOptionComplete = useMemo(
    () => Object.entries(optionStatuses).some(([title, status]) => title !== "Suite" && status === true),
    [optionStatuses],
  )

  // On utilise le store pour vérifier la complétion des prérequis.
  // Le hook s'abonne aux changements de `projectMarks` et `level`.
  const areReqsComplete = useFortyTwoStore((state) => {
    if (!activeTitle) return false;
    const currentXP = state.getSelectedXP();
    const currentLevel = state.getLevel(currentXP);
    return currentLevel >= activeTitle.level;
  })

  const isOverallComplete = areReqsComplete && isSuiteComplete && isAnyOtherOptionComplete

  useEffect(() => {
    if (isOverallComplete) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000) // 5 seconds
      return () => clearTimeout(timer)
    }
  }, [isOverallComplete])

  return (
    <>
      {showConfetti && <ReactConfetti width={width} height={height} recycle={false} />}
      <TitleSelector titles={titles} activeTitle={activeTitle} setActiveTitle={setActiveTitle} />

      <Separator className="my-6" />

      <div className="my-6 space-y-1.5">
        <h4 className="font-semibold text-2xl leading-none tracking-tight">Information</h4>

        <p className="text-muted-foreground text-sm">
          Click on projects to select/deselect them and see how the XP bar changes. You must validate the requirements.{" "}
          At least do 2 group projects.
          <Link
            className="underline underline-offset-1 transition-colors hover:text-foreground"
            prefetch={false}
            href="https://meta.intra.42.fr/articles/42-paris-s-homologated-certificates-rncp-6-7"
          >
            Learn more.
          </Link>
        </p>
        <div className="flex gap-2 mt-2">
          <Button variant="destructive" onClick={resetAll} type="button">
            Reset all
          </Button>
          <Button variant="outline" onClick={softReset} type="button">
            Soft reset
          </Button>
        </div>
      </div>

      <TitleRequirements title={activeTitle} className="my-6" />
      <TitleOptions title={activeTitle} onCompletionChange={setOptionStatuses} />
    </>
  )
}
