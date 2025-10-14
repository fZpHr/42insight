"use client"

import type { FortyTwoCursus, FortyTwoLevel, FortyTwoProject, FortyTwoStore, FortyTwoTitle, FortyTwoTitleOption } from "@/types/forty-two"
import { type ReactNode, createContext, useContext } from "react"
import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

// Persistance localStorage helpers
const STORAGE_KEY = "rncp_simulator_progression"
function saveProgressionToStorage(state: any) {
  const data = {
    projectMarks: Array.from(state.projectMarks.entries()),
    professionalExperiences: Array.from(state.professionalExperiences),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function loadProgressionFromStorage() {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    return {
      projectMarks: new Map<number, number>(data.projectMarks as [number, number][]),
      professionalExperiences: new Set<string>(data.professionalExperiences as string[]),
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
    if (!project || !project.children || project.children.length === 0) {
      return []
    }

    const descendantIds: number[] = []
    project.children.forEach((child) => {
      if (!child.name.startsWith(" (Optional)")) {
        descendantIds.push(child.id)
        descendantIds.push(...getAllDescendants(child.id, projects))
      }
    })

    return descendantIds
  }

  // Initial state with possible restore
  const restored = loadProgressionFromStorage();
  // On étend le type du store localement pour inclure la persistance et les resets
  type StoreWithPersistence = FortyTwoStore & {
    professionalExperiences: Set<string>;
    autoFetchedProjectMarks: Map<number, number>;
    setAutoFetchedProjectMark: (projectId: number, mark: number) => void;
    clearAutoFetchedProjectMarks: () => void;
    toggleProfessionalExperience: (experience: string) => void;
    resetAll: () => void;
    softReset: () => void;
  };
  return createStore<StoreWithPersistence>()((set, get) => ({
    /**
     * Retourne le nombre de projets de groupe validés (coche manuelle ou via fetch)
     * Un projet de groupe est un projet où current_team_id != null dans projects_users
     * et qui est validé (mark > 0 ou validated)
     */
    getValidatedGroupProjectsCount: () => {
      const state = get();
      let count = 0;
      // On parcourt tous les projets cochés
      for (const [projectId, mark] of state.projectMarks) {
        const project = state.projects[projectId];
    // On considère que c'est un projet de groupe si le nom contient 'group' ou 'groupe' ou 'team' (fallback)
    // (à adapter si tu as une meilleure logique ou une vraie propriété)
    const isGroup = /group|groupe|team/i.test(project?.name || "");
        if (isGroup && mark && mark > 0) {
          count++;
        }
      }
      // TODO: Ajouter ici la logique pour compter les projets de groupe validés via le fetch (projects_users)
      return count;
    },
    cursus: initProps.cursus,
    levels: initProps.levels,
    titles: initProps.titles,
    projects: initProps.projects,
  projectMarks: restored && restored.projectMarks ? restored.projectMarks : new Map<number, number>(),
  autoFetchedProjectMarks: new Map<number, number>(),
  setAutoFetchedProjectMark: (projectId: number, mark: number) =>
    set((state) => {
      const newAuto = new Map(state.autoFetchedProjectMarks)
      newAuto.set(projectId, mark)
      // On met aussi à jour projectMarks pour affichage immédiat
      const newMarks = new Map(state.projectMarks)
      newMarks.set(projectId, mark)
      saveProgressionToStorage({ ...state, projectMarks: newMarks })
      return { autoFetchedProjectMarks: newAuto, projectMarks: newMarks }
    }),

  clearAutoFetchedProjectMarks: () =>
    set((state) => {
      return { autoFetchedProjectMarks: new Map() }
    }),
  professionalExperiences: restored && restored.professionalExperiences ? restored.professionalExperiences : new Set<string>(),
  events: 0,
  eventsFetchedAt: 0, // timestamp ms

  setEvents: (events: number) => set({ events, eventsFetchedAt: Date.now() }),

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

    // Par défaut, applique la note à tous les descendants (sélection manuelle)
    setProjectMark: (projectId: number, mark: number, onlySelf: boolean = false) =>
      set((state) => {
        const newMarks = new Map(state.projectMarks)
        const projectsToMark = onlySelf ? [projectId] : [projectId, ...getAllDescendants(projectId, state.projects)]

        projectsToMark.forEach((id) => {
          newMarks.set(id, Math.max(0, Math.min(mark, 125)))
        })
        const next = { projectMarks: newMarks }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),

    removeProject: (projectId: number) =>
      set((state) => {
        const newMarks = new Map(state.projectMarks)
        const projectsToRemove = [projectId, ...getAllDescendants(projectId, state.projects)]

        projectsToRemove.forEach((id) => {
          newMarks.delete(id)
        })
        const next = { projectMarks: newMarks }
        saveProgressionToStorage({ ...state, ...next })
        return next
      }),
    resetAll: () => set((state) => {
      // Reset tout (projets cochés, expériences pro)
      saveProgressionToStorage({ projectMarks: new Map(), professionalExperiences: new Set() })
      return { projectMarks: new Map(), professionalExperiences: new Set() }
    }),

    softReset: () => set((state) => {
      // Soft reset: ne garde que les projets auto-fetch
      const newMarks = new Map(state.autoFetchedProjectMarks)
      saveProgressionToStorage({ projectMarks: newMarks, professionalExperiences: new Set(state.professionalExperiences) })
      return { projectMarks: newMarks }
    }),

    getSelectedXP: () => {
      const state = get()
      let totalXP = 0

      const professionalExperienceXp: Record<string, number> = {
        stage_1: 40000,
        stage_2: 40000,
        alternance_1_an: 90000,
        alternance_2_ans: 180000,
      }

      for (const experience of state.professionalExperiences) {
        totalXP += professionalExperienceXp[experience] || 0
      }

      for (const [projectId, mark] of state.projectMarks) {
        const project = state.projects[projectId]
        if (project) {
          totalXP += (project.experience || project.difficulty || 0) * (mark / 100)
        }
      }

      return totalXP
    },

    getProjectXP: (project: FortyTwoProject) => {
      const state = get()
      let totalXP = project.experience || project.difficulty || 0

      if (project.children && project.children.length > 0) {
        project.children.forEach((childRef) => {
          const childProject = state.projects[childRef.id]
          if (childProject) {
            totalXP += state.getProjectXP(childProject)
          }
        })
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
          totalXP += (proj.experience || proj.difficulty || 0) * (mark / 100)
        }
      }

      return totalXP
    },

    isProjectModuleComplete: (project: FortyTwoProject) => {
      const state = get();
      // Si le projet a des enfants, on ne regarde que les enfants non optionnels
      if (project.children && project.children.length > 0) {
        for (const child of project.children) {
          if (child.name && child.name.trim().startsWith('(Optional)')) continue;
          const mark = state.projectMarks.get(child.id);
          if (!mark || mark === 0) {
            return false;
          }
        }
        return true;
      }
      // Sinon, comportement classique : validé si lui-même est validé
      const mark = state.projectMarks.get(project.id);
      return !!mark && mark > 0;
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
  }))
}

type FortyTwoStoreApi = ReturnType<typeof createFortyTwoStore>

const FortyTwoStoreContext = createContext<FortyTwoStoreApi | undefined>(undefined)

export interface FortyTwoStoreProviderProps {
  children: ReactNode
  cursus: FortyTwoCursus
  levels: Record<number, FortyTwoLevel>
  titles: FortyTwoTitle[]
  projects: Record<number, FortyTwoProject>
}

export const FortyTwoStoreProvider = ({ children, cursus, levels, titles, projects }: FortyTwoStoreProviderProps) => {
  const store = createFortyTwoStore({ cursus, levels, titles, projects })

  return <FortyTwoStoreContext.Provider value={store}>{children}</FortyTwoStoreContext.Provider>
}

export const useFortyTwoStore = <T,>(selector: (store: FortyTwoStore) => T): T => {
  const fortyTwoStoreContext = useContext(FortyTwoStoreContext)

  if (!fortyTwoStoreContext) {
    throw new Error("useFortyTwoStore must be used within FortyTwoStoreProvider")
  }

  return useStore(fortyTwoStoreContext, selector)
}
