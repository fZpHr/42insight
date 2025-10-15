"use client"

import type { FortyTwoCursus, FortyTwoLevel, FortyTwoProject, FortyTwoStore, FortyTwoTitle, FortyTwoTitleOption } from "@/types/forty-two"
import { useRef, useContext, createContext, type ReactNode, useState } from "react";
import { useStoreWithEqualityFn, createWithEqualityFn } from "zustand/traditional"

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

  // Initial state: pas de localStorage ici (pour SSR/CSR sync)
  const restored = null;
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
  return createWithEqualityFn<StoreWithPersistence>()((set, get) => ({
    cursus: initProps.cursus,
    levels: initProps.levels,
    titles: initProps.titles,
    projects: initProps.projects,
  projectMarks: new Map<number, number>(),
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
  professionalExperiences: new Set<string>(),


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
  // Reset tout (projets cochés, expériences pro, events)
  saveProgressionToStorage({ projectMarks: new Map(), professionalExperiences: new Set(), events: 0, eventsFetchedAt: 0 })
  return { projectMarks: new Map(), professionalExperiences: new Set(), events: 0, eventsFetchedAt: 0 }
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
      const state = get();
      let totalXP = 0;
      // Toujours additionner l'XP du projet lui-même (même si 0)
      totalXP += project.experience || project.difficulty || 0;
      // Additionner récursivement l'XP de tous les enfants
      if (project.children && project.children.length > 0) {
        for (const childRef of project.children) {
          const childProject = state.projects[childRef.id];
          if (childProject) {
            totalXP += state.getProjectXP(childProject);
          }
        }
      }
      return totalXP;
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
  // Logic for counting validated group projects via fetch (projects_users) can be added here if needed
      return count;
    },

    areRequirementsComplete: (title: FortyTwoTitle | null) => {
      if (!title) return false;
      const state = get();
      const currentXP = state.getSelectedXP();
      const currentLevel = state.getLevel(currentXP);

      const experienceProjectIds = (title as any).experience?.projects || [];
      let experiencesCount = 0;
      for (const projectId of experienceProjectIds) {
        if (state.projectMarks.has(projectId)) {
          experiencesCount++;
        }
      }
      return currentLevel >= title.level && experiencesCount >= title.number_of_experiences;
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

import { useEffect } from "react";

export const FortyTwoStoreProvider = ({ children, cursus, levels, titles, projects }: FortyTwoStoreProviderProps) => {
  const storeRef = useRef<FortyTwoStoreApi | null>(null);
  const [, forceRerender] = useState(0);
  if (!storeRef.current) {
    storeRef.current = createFortyTwoStore({ cursus, levels, titles, projects });
  }

  // Synchronise la progression après le mount côté client
  useEffect(() => {
    const restored = loadProgressionFromStorage();
    if (restored) {
      storeRef.current?.setState({
        projectMarks: restored.projectMarks,
        professionalExperiences: restored.professionalExperiences,
      });
      forceRerender(x => x + 1);
    }
  }, []);

  return <FortyTwoStoreContext.Provider value={storeRef.current}>{children}</FortyTwoStoreContext.Provider>;
};

// On étend le type pour inclure les nouvelles fonctions
type FullStore = FortyTwoStore & ReturnType<ReturnType<typeof createFortyTwoStore>["getState"]>;


export const useFortyTwoStore = <T,>(
  selector: (store: FullStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T => {
  const fortyTwoStoreContext = useContext(FortyTwoStoreContext);
  if (!fortyTwoStoreContext) {
    throw new Error("useFortyTwoStore must be used within FortyTwoStoreProvider");
  }
  return useStoreWithEqualityFn(fortyTwoStoreContext, selector, equalityFn);
};
