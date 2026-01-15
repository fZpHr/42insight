"use client"

import type {
  FortyTwoCursus,
  FortyTwoLevel,
  FortyTwoProject,
  FortyTwoStore,
  FortyTwoTitle,
  FortyTwoTitleOption,
} from "@/types/forty-two"
import { useRef, useContext, createContext, type ReactNode, useState, useEffect } from "react"
import { useStoreWithEqualityFn, createWithEqualityFn } from "zustand/traditional"

const STORAGE_KEY = "rncp_simulator_progression"
const EVENTS_TTL = 10 * 60 * 1000 

function saveProgressionToStorage(state: any) {
  try {
    const data = {
      projectMarks: Array.from((state.projectMarks ?? new Map()).entries()),
      professionalExperiences: Array.from(state.professionalExperiences ?? []),
      professionalExperienceMarks: Array.from((state.professionalExperienceMarks ?? new Map()).entries()),
      coalitionProjects: Array.from((state.coalitionProjects ?? new Set()).values()),
      autoFetchedProjectMarks: Array.from((state.autoFetchedProjectMarks ?? new Map()).entries()),
      autoFetchedProfessionalExperiences: Array.from(state.autoFetchedProfessionalExperiences ?? []),
      autoFetchedProfessionalExperienceMarks: Array.from((state.autoFetchedProfessionalExperienceMarks ?? new Map()).entries()),
      initialXPDelta: state.initialXPDelta ?? 0,
      events: state.events ?? 0,
      eventsFetchedAt: state.eventsFetchedAt ?? 0,
      ts: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {

  }
}

function loadProgressionFromStorage() {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const data = JSON.parse(raw)
    const now = Date.now()

    let events = 0,
      eventsFetchedAt = 0
    if (typeof data.events === "number" && typeof data.eventsFetchedAt === "number") {
      if (now - data.eventsFetchedAt < EVENTS_TTL) {
        events = data.events
        eventsFetchedAt = data.eventsFetchedAt
      }
    }

    return {
      projectMarks: new Map<number, number>(data.projectMarks as [number, number][]),
      professionalExperiences: new Set<string>(data.professionalExperiences as string[]),
      professionalExperienceMarks: new Map<string, number>(data.professionalExperienceMarks as [string, number][]),
      coalitionProjects: new Set<number>(data.coalitionProjects as number[]),
      autoFetchedProjectMarks: new Map<number, number>(data.autoFetchedProjectMarks as [number, number][]),
      autoFetchedProfessionalExperiences: new Set<string>(data.autoFetchedProfessionalExperiences as string[]),
      autoFetchedProfessionalExperienceMarks: new Map<string, number>(data.autoFetchedProfessionalExperienceMarks as [string, number][]),
      initialXPDelta: data.initialXPDelta ?? 0,
      events,
      eventsFetchedAt,
    }
  } catch {
    return null
  }
}

const createFortyTwoStore = (initProps: {
  cursus: FortyTwoCursus
  levels: Record<number, FortyTwoLevel>
  titles: FortyTwoTitle[]
  projects: Record<number, FortyTwoProject>
}) => {
  const getAllDescendants = (projectId: number, projects: Record<number, FortyTwoProject>): number[] => {
    const project = projects[projectId]
    if (!project?.children?.length) return []

    const descendantIds: number[] = []
    for (const child of project.children) {
      if (!child.name.startsWith(" (Optional)")) {
        descendantIds.push(child.id)
        descendantIds.push(...getAllDescendants(child.id, projects))
      }
    }
    return descendantIds
  }

  type StoreWithPersistence = FortyTwoStore & {
    professionalExperiences: Set<string>
    autoFetchedProjectMarks: Map<number, number>
    clearAutoFetchedProjectMarks: () => void
    toggleProfessionalExperience: (experience: string) => void
    setProfessionalExperience: (experience: string, enabled: boolean) => void
    autoFetchedProfessionalExperiences: Set<string>
    autoFetchedProfessionalExperienceMarks: Map<string, number>
    clearAutoFetchedProfessionalExperiences: () => void
    resetAll: () => void
    softReset: () => void
    initialXPDelta: number
    processInitialData: (userInfo: any, activeTitle: FortyTwoTitle | null) => void
    persistedOldProjects: any[]
    professionalExperienceMarks: Map<string, number>
    hydrated: boolean
    setHydrated: (hydrated: boolean) => void
    isDataProcessed: boolean
    dataProcessedAt: number
    coalitionProjects: Set<number>
    toggleCoalitionBonus: (projectId: number) => void
  }

  return createWithEqualityFn<StoreWithPersistence>()((set, get) => ({
    cursus: initProps.cursus,
    levels: initProps.levels,
    titles: initProps.titles,
    projects: initProps.projects,
    projectMarks: new Map<number, number>(),
    professionalExperienceMarks: new Map<string, number>(),
    autoFetchedProjectMarks: new Map<number, number>(),
    autoFetchedProfessionalExperiences: new Set<string>(),
    autoFetchedProfessionalExperienceMarks: new Map<string, number>(),
    persistedOldProjects: [],
    hydrated: false,
    isDataProcessed: false,
    dataProcessedAt: 0,
    coalitionProjects: new Set<number>(),

    setHydrated: (hydrated: boolean) => set({ hydrated }),

    clearAutoFetchedProfessionalExperiences: () => set({ autoFetchedProfessionalExperiences: new Set<string>() }),

    clearAutoFetchedProjectMarks: () => set({ autoFetchedProjectMarks: new Map() }),

    professionalExperiences: new Set<string>(),
    events: 0,
    eventsFetchedAt: 0,

    setEvents: (events: number) =>
      set((state) => {
        const next = { events, eventsFetchedAt: Date.now() }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    toggleCoalitionBonus: (projectId: number) =>
      set((state) => {
        const newCoalitionProjects = new Set(state.coalitionProjects)
        if (newCoalitionProjects.has(projectId)) {
          newCoalitionProjects.delete(projectId)
        } else {
          newCoalitionProjects.add(projectId)
        }
        const next = { coalitionProjects: newCoalitionProjects }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    toggleProfessionalExperience: (experience: string) =>
      set((state) => {
        const newExperiences = new Set(state.professionalExperiences)
        if (newExperiences.has(experience)) {
          newExperiences.delete(experience)
        } else {
          newExperiences.add(experience)
        }
        const next = { professionalExperiences: newExperiences }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    setProfessionalExperience: (experience: string, enabled: boolean) =>
      set((state) => {
        const newExperiences = new Set(state.professionalExperiences)
        if (enabled) {
          newExperiences.add(experience)
        } else {
          newExperiences.delete(experience)
        }
        const next = { professionalExperiences: newExperiences }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    setProfessionalExperienceMark: (experience: string, mark: number) =>
      set((state) => {
        const newMarks = new Map(state.professionalExperienceMarks)
        const maxMark = ["stage_1", "stage_2", "startup_experience"].includes(experience) ? 125 : 100;
        newMarks.set(experience, Math.max(0, Math.min(mark, maxMark)))
        const next = { professionalExperienceMarks: newMarks }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    setProjectMark: (projectId: number, mark: number, onlySelf = false) =>
      set((state) => {
        const newMarks = new Map(state.projectMarks)
        const projectsToMark = onlySelf ? [projectId] : [projectId, ...getAllDescendants(projectId, state.projects)]

        for (const id of projectsToMark) {
          newMarks.set(id, Math.max(0, Math.min(mark, 125)))
        }
        const next = { projectMarks: newMarks }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    removeProject: (projectId: number) =>
      set((state) => {
        const newMarks = new Map(state.projectMarks)
        const projectsToRemove = [projectId, ...getAllDescendants(projectId, state.projects)]

        for (const id of projectsToRemove) {
          newMarks.delete(id)
        }
        const next = { projectMarks: newMarks }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    resetAll: () =>
      set(() => {
        const emptyState = {
          projectMarks: new Map<number, number>(),
          professionalExperiences: new Set<string>(),
          coalitionProjects: new Set<number>(),
          events: 0,
          eventsFetchedAt: 0,
          persistedOldProjects: [],
          initialXPDelta: 0,
          isDataProcessed: false,
        }
        saveProgressionToStorage(emptyState)
        return emptyState
      }),

    softReset: () =>
      set((state) => {
        const newMarks = new Map(state.autoFetchedProjectMarks ?? [])
        const newProExp = new Set(state.autoFetchedProfessionalExperiences ?? [])
        

        const resetProExpMarks = new Map(state.autoFetchedProfessionalExperienceMarks ?? [])
        
        const resetState = {
          projectMarks: newMarks,
          professionalExperiences: newProExp,
          professionalExperienceMarks: resetProExpMarks,
          coalitionProjects: new Set<number>(),
          events: state.events,
          eventsFetchedAt: state.eventsFetchedAt,
          isDataProcessed: false,
        }
        saveProgressionToStorage({ ...state, ...resetState })
        return resetState
      }),

    initialXPDelta: 0,

    processInitialData: (userInfo: any, activeTitle: FortyTwoTitle | null) => {
      if (!userInfo) return
      const state = get()

      let oldProjects: any[] = []
      if (userInfo.projects_users && activeTitle) {
        const mainOption = activeTitle.options?.[0]
        if (mainOption) {
          const cursusProjectIds = new Set(
            Array.isArray(mainOption.projects) ? mainOption.projects : Object.keys(mainOption.projects).map(Number),
          )

          let canonicalProjects: Record<number, any> = {}
          try {
            canonicalProjects = require("@/lib/forty-two/data/projects_21.json").projects.reduce((acc: any, p: any) => {
              acc[p.id] = p
              return acc
            }, {})
          } catch {}

          oldProjects = userInfo.projects_users
            .filter((pu: any) => !cursusProjectIds.has(pu.project.id) && pu.final_mark > 0)
            .map((pu: any) => {
              const xp =
                canonicalProjects[pu.project.id]?.experience ||
                canonicalProjects[pu.project.id]?.xp ||
                canonicalProjects[pu.project.id]?.difficulty ||
                pu.project.experience ||
                pu.project.xp ||
                0

              return {
                id: pu.project.id,
                name: pu.project.name,
                xp,
                mark: pu.final_mark,
              }
            })
        }
      }

      const newMarks = new Map(state.projectMarks)
      const newAutoMarks = new Map(state.autoFetchedProjectMarks)
      const newProExp = new Set(state.professionalExperiences)
      const newAutoProExp = new Set(state.autoFetchedProfessionalExperiences)
      const newProExpMarks = new Map(state.professionalExperienceMarks)
      const newAutoProExpMarks = new Map(state.autoFetchedProfessionalExperienceMarks)

      const projectToExperience: Record<number, string> = {
        1638: "stage_1",
        1644: "stage_2",
        1662: "startup_experience",
        1873: "alternance_1_an",
        1877: "alternance_1_an",
        1878: "alternance_1_an",
        1879: "alternance_1_an",
        1880: "alternance_1_an",
        2561: "alternance_1_an",
        2563: "alternance_1_an",
        1857: "alternance_2_ans",
        1861: "alternance_2_ans",
        1862: "alternance_2_ans",
        1863: "alternance_2_ans",
        1864: "alternance_2_ans",
        1865: "alternance_2_ans",
        1869: "alternance_2_ans",
        1870: "alternance_2_ans",
        1871: "alternance_2_ans",
        1872: "alternance_2_ans",
        2562: "alternance_2_ans",
        2564: "alternance_2_ans",
      }

      const mainProjects =
        userInfo.projects_users?.length > 0
          ? userInfo.projects_users
          : oldProjects.map((p: any) => ({ project: { id: p.id }, final_mark: p.mark }))

      const apiProjectIds = new Set<number>()
      for (const project of mainProjects) {
        if (typeof project.final_mark === "number" && project.final_mark > 0) {
          apiProjectIds.add(project.project.id)
          
          const existingMark = state.projectMarks.get(project.project.id)
          const autoMark = state.autoFetchedProjectMarks.get(project.project.id)
          
          const hasUserModification = existingMark !== undefined && autoMark !== undefined && existingMark !== autoMark
          
          if (hasUserModification) {
            newMarks.set(project.project.id, existingMark)
          } else {
            newMarks.set(project.project.id, project.final_mark)
          }
          
          newAutoMarks.set(project.project.id, project.final_mark)
        }
        const expKey = projectToExperience[project.project.id]
        if (expKey) {
          newProExp.add(expKey)
          newAutoProExp.add(expKey)
          
          if (typeof project.final_mark === "number") {
            const existingExpMark = state.professionalExperienceMarks.get(expKey)
            const autoExpMark = state.autoFetchedProfessionalExperienceMarks.get(expKey)
            
            const hasUserExpModification = existingExpMark !== undefined && autoExpMark !== undefined && existingExpMark !== autoExpMark
            
            if (hasUserExpModification) {
              newProExpMarks.set(expKey, existingExpMark)
            } else {
              newProExpMarks.set(expKey, project.final_mark)
            }
            
            newAutoProExpMarks.set(expKey, project.final_mark)
          }
        }
      }

      for (const [projectId, mark] of state.projectMarks) {
        if (!apiProjectIds.has(projectId)) {
          newMarks.set(projectId, mark)
        }
      }

      const cursus = userInfo.cursus_users?.find((c: any) => c.cursus_id === 21)
      const userLevel = cursus?.level ?? null
      let userLevelXP = null

      if (userLevel !== null && typeof userLevel === "number") {
        try {
          const expData = require("@/lib/forty-two/data/experience_21.json")
          const levels = expData.levels
          let lower = levels[0]
          let upper = levels[levels.length - 1]

          for (const level of levels) {
            if (level.level <= userLevel) lower = level
            if (level.level >= userLevel) {
              upper = level
              break
            }
          }

          if (lower.level === upper.level) {
            userLevelXP = lower.experience
          } else {
            const ratio = (userLevel - lower.level) / (upper.level - lower.level)
            userLevelXP = lower.experience + ratio * (upper.experience - lower.experience)
          }
        } catch {
          userLevelXP = null
        }
      }

      let totalXP = 0
      for (const [projectId, mark] of newAutoMarks) {
        const project = state.projects[projectId]
        if (project) {
          totalXP += (project.experience || project.difficulty || 0) * (mark / 100)
        }
      }

      const initialXPDelta = (userLevelXP ?? 0) - totalXP

      const finalState = {
        projectMarks: newMarks,
        autoFetchedProjectMarks: newAutoMarks,
        professionalExperiences: newProExp,
        autoFetchedProfessionalExperiences: newAutoProExp,
        professionalExperienceMarks: newProExpMarks,
        autoFetchedProfessionalExperienceMarks: newAutoProExpMarks,
        initialXPDelta,
        persistedOldProjects: oldProjects,
        isDataProcessed: true,
      }

      set((state) => {
        saveProgressionToStorage({ ...state, ...finalState })
        return finalState
      })
    },

    getSelectedXP: () => {
      const state = get()
      const professionalExperienceXp: Record<string, number> = {
        stage_1: 42000,
        stage_2: 63000,
        startup_experience: 63000,
        alternance_1_an: 90000,
        alternance_2_ans: 180000,
      }

      let totalXP = 0

      for (const experience of state.professionalExperiences) {
        if (state.autoFetchedProfessionalExperienceMarks.has(experience)) {
          continue
        }
        
        const mark = state.professionalExperienceMarks.get(experience) ?? 100
        const baseXp = professionalExperienceXp[experience] || 0
        totalXP += Math.round(baseXp * (mark / 100))
      }

      for (const [projectId, mark] of state.projectMarks) {
        const project = state.projects[projectId]
        if (project) {
          let xp = (project.experience || project.difficulty || 0) * (mark / 100)
          if (state.coalitionProjects.has(projectId)) {
            xp *= 1.042
          }
          totalXP += xp
        }
      }

      return totalXP + (state.initialXPDelta ?? 0)
    },

    getProjectXP: (project: FortyTwoProject) => {
      const state = get()
      let totalXP = project.experience || project.difficulty || 0

      if (project.children?.length) {
        for (const childRef of project.children) {
          const childProject = state.projects[childRef.id]
          if (childProject) {
            totalXP += state.getProjectXP(childProject)
          }
        }
      }
      return totalXP
    },

    getDynamicProjectXP: (project: FortyTwoProject) => {
      const state = get()
      const projectsToScan = [project.id, ...getAllDescendants(project.id, state.projects)]

      let totalXP = 0
      for (const projectId of projectsToScan) {
        const proj = state.projects[projectId]
        const mark = state.projectMarks.get(projectId)

        if (proj && mark !== undefined && mark > 0) {
          let xpForProj = (proj.experience || proj.difficulty || 0) * (mark / 100)
          if (state.coalitionProjects.has(projectId)) {
            xpForProj *= 1.042
          }
          totalXP += xpForProj
        }
      }

      return totalXP
    },

    isProjectModuleComplete: (project: FortyTwoProject) => {
      const state = get()
      if (project.children?.length) {
        for (const child of project.children) {
          if (child.name?.trim().startsWith("(Optional)")) continue
          const mark = state.projectMarks.get(child.id)
          if (!mark || mark === 0) return false
        }
        return true
      }
      const mark = state.projectMarks.get(project.id)
      return !!mark && mark > 0
    },

    getExperienceForOption: (option: FortyTwoTitleOption) => {
      const state = get()
      let totalXP = 0

      const projectList = Array.isArray(option.projects)
        ? (option.projects as number[]).map((id: number) => state.projects[id]).filter(Boolean)
        : Object.values(option.projects)

      for (const project of projectList) {
        totalXP += state.getDynamicProjectXP(project)
      }

      return totalXP
    },

    getLevel: (experience: number) => {
      const state = get()
      let currentLevel = 0

      for (const level of Object.values(state.levels).sort((a, b) => a.level - b.level)) {
        if (experience >= level.experience) {
          currentLevel = level.level
        } else {
          break
        }
      }

      return currentLevel
    },

    getValidatedGroupProjectsCount: () => {
      const state = get()
      let count = 0
      for (const [projectId, mark] of state.projectMarks) {
        const project = state.projects[projectId]
        const isGroup = /group|groupe|team/i.test(project?.name || "")
        if (isGroup && mark && mark > 0) {
          count++
        }
      }
      return count
    },

    areRequirementsComplete: (title: FortyTwoTitle | null) => {
      if (!title) return false
      const state = get()
      const currentXP = state.getSelectedXP()
      const currentLevel = state.getLevel(currentXP)

      const experienceProjectIds = (title as any).experience?.projects || []
      let experiencesCount = 0
      for (const projectId of experienceProjectIds) {
        if (state.projectMarks.has(projectId)) {
          experiencesCount++
        }
      }
      return currentLevel >= title.level && experiencesCount >= title.number_of_experiences
    },
  }))
}

type FortyTwoStoreApi = ReturnType<typeof createFortyTwoStore>

export const FortyTwoStoreContext = createContext<FortyTwoStoreApi | undefined>(undefined)

export interface FortyTwoStoreProviderProps {
  children: ReactNode
  cursus: FortyTwoCursus
  levels: Record<number, FortyTwoLevel>
  titles: FortyTwoTitle[]
  projects: Record<number, FortyTwoProject>
}

export const FortyTwoStoreProvider = ({ children, cursus, levels, titles, projects }: FortyTwoStoreProviderProps) => {
  const storeRef = useRef<FortyTwoStoreApi | null>(null)
  const [, forceRerender] = useState(0)

  if (!storeRef.current) {
    storeRef.current = createFortyTwoStore({ cursus, levels, titles, projects })
  }

  useEffect(() => {
    const restored = loadProgressionFromStorage()
    if (restored) {
      const current = storeRef.current?.getState()
      let events = current?.events ?? 0
      let eventsFetchedAt = current?.eventsFetchedAt ?? 0

      if (
        typeof restored.events === "number" &&
        typeof restored.eventsFetchedAt === "number" &&
        restored.eventsFetchedAt > eventsFetchedAt
      ) {
        events = restored.events
        eventsFetchedAt = restored.eventsFetchedAt
      }

      storeRef.current?.setState({
        projectMarks: restored.projectMarks,
        professionalExperiences: restored.professionalExperiences,
        professionalExperienceMarks: restored.professionalExperienceMarks || new Map(),
        coalitionProjects: restored.coalitionProjects,
        autoFetchedProjectMarks: restored.autoFetchedProjectMarks || new Map(),
        autoFetchedProfessionalExperiences: restored.autoFetchedProfessionalExperiences || new Set(),
        autoFetchedProfessionalExperienceMarks: restored.autoFetchedProfessionalExperienceMarks || new Map(),
        initialXPDelta: restored.initialXPDelta ?? 0,
        events,
        eventsFetchedAt,
      })
      forceRerender((x) => x + 1)

      setTimeout(() => {
        storeRef.current?.getState().setHydrated(true)
      }, 0)
    } else {
      storeRef.current?.getState().setHydrated(true)
    }
  }, [])

  return <FortyTwoStoreContext.Provider value={storeRef.current}>{children}</FortyTwoStoreContext.Provider>
}

type FullStore = FortyTwoStore & ReturnType<ReturnType<typeof createFortyTwoStore>["getState"]>

export const useFortyTwoStore = <T,>(selector: (store: FullStore) => T, equalityFn?: (a: T, b: T) => boolean): T => {
  const fortyTwoStoreContext = useContext(FortyTwoStoreContext)
  if (!fortyTwoStoreContext) {
    throw new Error("useFortyTwoStore must be used within FortyTwoStoreProvider")
  }
  return useStoreWithEqualityFn(fortyTwoStoreContext, selector, equalityFn)
}
