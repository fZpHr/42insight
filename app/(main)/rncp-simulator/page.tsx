"use client"

import { shallow } from "zustand/shallow"
import { useFortyTwoStore } from "@/providers/forty-two-store-provider"
import type { FortyTwoTitle } from "@/types/forty-two"
import { useEffect, useMemo, useState, useRef } from "react"
import { addToLocalStorage, getFromLocalStorage } from "@/utils/localStorage"
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


function getCache(key: string, maxAgeMs: number) {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts < maxAgeMs) return value;
  } catch {}
  return null;
}

function setCache(key: string, value: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
}

async function fetchUserEvents(login: string) {
  if (!login) return [];
  const cacheKey = `events_${login}`;
  const cached = getCache(cacheKey, 10 * 60 * 1000);
  if (cached) return cached;
  const res = await fetch(`/api/users/${login}/events`);
  if (!res.ok) return [];
  const data = await res.json();
  setCache(cacheKey, data.events || []);
  return data.events || [];
}

export default function RNCPSimulator() {
  const { data: session } = useSession()
  // On utilise un sélecteur optimisé avec `shallow` pour éviter les re-renders inutiles.
  // On ne récupère que ce dont la page a *directement* besoin.
  const { titles, setProjectMark, setEvents, resetAll, softReset, setAutoFetchedProjectMark, clearAutoFetchedProjectMarks, projects } =
    useFortyTwoStore(
      (state) => ({
        titles: state.titles,
        setProjectMark: state.setProjectMark,
        setEvents: state.setEvents,
        resetAll: state.resetAll,
        softReset: state.softReset,
        setAutoFetchedProjectMark: state.setAutoFetchedProjectMark,
        clearAutoFetchedProjectMarks: state.clearAutoFetchedProjectMarks,
        projects: state.projects,
      }),
      shallow,
    )
  const [activeTitle, setActiveTitle] = useState<FortyTwoTitle | null>(titles[0] ?? null)
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(false)
  const [optionStatuses, setOptionStatuses] = useState<Record<string, boolean>>({})


  // Ajout du cache pour userIntraInfo (projets)
  const { data: userIntraInfo } = useQuery({
    queryKey: ["userIntraInfo", session?.user?.name],
    queryFn: async () => {
      const login = session?.user?.login || "";
      const cacheKey = `userIntraInfo_${login}`;
      const cached = getCache(cacheKey, 10 * 60 * 1000);
      if (cached) return cached;
      const data = await fetchUserIntraInfo(login);
      setCache(cacheKey, data);
      return data;
    },
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

  // On récupère requirementsComplete du composant TitleRequirements
  const requirementsComplete = useFortyTwoStore((state) => {
    if (!activeTitle) return false;
    const currentXP = state.getSelectedXP();
    const currentLevel = state.getLevel(currentXP);
    // On récupère aussi les events, pro exp, group projects
    const events = state.events;
    const professionalExperiences = state.professionalExperiences;
    let professionalExperiencesCount = professionalExperiences.size;
    if (professionalExperiences.has("alternance_2_ans")) professionalExperiencesCount += 1;
    // Group projects validés
    const groupProjects = Object.values(state.projects).filter((p) => p && p.is_solo === false);
    const validatedGroupProjectsCount = groupProjects.filter((p) => state.projectMarks.get(p.id) && state.projectMarks.get(p.id)! > 0).length;
    // Vérifie aussi que toutes les tabs/options sont complètes
    const allTabsComplete = Object.values(optionStatuses).every(Boolean);
    return (
      currentLevel >= activeTitle.level &&
      events >= activeTitle.number_of_events &&
      professionalExperiencesCount >= activeTitle.number_of_experiences &&
      validatedGroupProjectsCount >= 2 &&
      allTabsComplete
    );
  });


  // Confettis : déclenche à chaque passage requirementsComplete false -> true
  const prevReqsComplete = useRef(false)
  useEffect(() => {
    if (requirementsComplete && !prevReqsComplete.current) {
      setShowConfetti(false)
      setTimeout(() => setShowConfetti(true), 10) // force le reset
      setTimeout(() => setShowConfetti(false), 8000)
    }
    prevReqsComplete.current = requirementsComplete
  }, [requirementsComplete])


  // --- Sauvegarde et récupération des anciens projets hors RNCP dans le localStorage ---
  const oldProjectsKey = session?.user && 'login' in session.user && session.user.login ? `oldProjects_${session.user.login}` : undefined;
  // Récupération au chargement si pas de userIntraInfo (ex: refresh)
  const [persistedOldProjects, setPersistedOldProjects] = useState<any[]>(() => {
    if (!oldProjectsKey) return [];
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(oldProjectsKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  // Sauvegarde à chaque fetch
  useEffect(() => {
    if (!userIntraInfo || !userIntraInfo.projects_users || !activeTitle || !oldProjectsKey) return;
    const mainOption = activeTitle.options?.[0];
    if (!mainOption) return;
    const cursusProjectIds = new Set(
      Array.isArray(mainOption.projects)
        ? mainOption.projects
        : Object.keys(mainOption.projects).map(Number)
    );
    const oldProjects = userIntraInfo.projects_users
      .filter((pu: any) => !cursusProjectIds.has(pu.project.id) && pu.final_mark > 0)
      .map((pu: any) => ({
        id: pu.project.id,
        name: pu.project.name,
        xp: pu.project.experience || pu.project.xp || 0,
        mark: pu.final_mark,
      }));
    setPersistedOldProjects(oldProjects);
    localStorage.setItem(oldProjectsKey, JSON.stringify(oldProjects));
  }, [userIntraInfo, activeTitle, oldProjectsKey]);

  // Utilise la source la plus fraiche (userIntraInfo si dispo, sinon localStorage)
  const autoExtraProjects = (() => {
    if (userIntraInfo && userIntraInfo.projects_users && activeTitle) {
      const mainOption = activeTitle.options?.[0];
      if (!mainOption) return [];
      const cursusProjectIds = new Set(
        Array.isArray(mainOption.projects)
          ? mainOption.projects
          : Object.keys(mainOption.projects).map(Number)
      );
      return userIntraInfo.projects_users
        .filter((pu: any) => !cursusProjectIds.has(pu.project.id) && pu.final_mark > 0)
        .map((pu: any) => ({
          id: pu.project.id,
          name: pu.project.name,
          xp: pu.project.experience || pu.project.xp || 0,
          mark: pu.final_mark,
        }));
    }
    return persistedOldProjects;
  })();

  return (
    <>
      {showConfetti && <ReactConfetti width={width} height={height} recycle={false} />}
      <TitleSelector titles={titles} activeTitle={activeTitle} setActiveTitle={setActiveTitle} />

      <Separator className="my-6" />

      <div className="my-6 space-y-1.5">
        <h4 className="font-semibold text-2xl leading-none tracking-tight">Information</h4>

        <p className="text-muted-foreground text-sm">
          You must validate the requirements.   {" "}
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

      {/* Détection des projets hors RNCP auto (présents dans userIntraInfo.projects_users mais pas dans la liste RNCP) */}
      <TitleRequirements
        title={activeTitle}
        className="my-6"
        autoExtraProjects={autoExtraProjects}
      />
      <TitleOptions title={activeTitle} onCompletionChange={setOptionStatuses} />
    </>
  )
}
