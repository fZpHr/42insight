'use client'

import type { FortyTwoCursus, FortyTwoLevel, FortyTwoProject, FortyTwoStore, FortyTwoTitle, FortyTwoTitleOption } from "@/types/forty-two"
import { useRef, useContext, createContext, type ReactNode, useState } from "react";
import { useStoreWithEqualityFn, createWithEqualityFn } from "zustand/traditional"

// Persistance localStorage helpers
const STORAGE_KEY = "rncp_simulator_progression"
const EVENTS_TTL = 10 * 60 * 1000; // 10 minutes en ms
function saveProgressionToStorage(state: any) {
  const data = {
    projectMarks: Array.from((state.projectMarks ?? new Map()).entries()),
    professionalExperiences: Array.from(state.professionalExperiences ?? []),
    coalitionProjects: Array.from((state.coalitionProjects ?? new Set()).values()), // Save coalition projects
    events: state.events ?? 0,
    eventsFetchedAt: state.eventsFetchedAt ?? 0,
    ts: Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function loadProgressionFromStorage() {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    const now = Date.now();
    let events = 0, eventsFetchedAt = 0;
    if (typeof data.events === 'number' && typeof data.eventsFetchedAt === 'number') {
      if (now - data.eventsFetchedAt < EVENTS_TTL) {
        events = data.events;
        eventsFetchedAt = data.eventsFetchedAt;
      }
    }
    return {
      projectMarks: new Map<number, number>(data.projectMarks as [number, number][]),
      professionalExperiences: new Set<string>(data.professionalExperiences as string[]),
      coalitionProjects: new Set<number>(data.coalitionProjects as number[]),
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

  type StoreWithPersistence = FortyTwoStore & {
    professionalExperiences: Set<string>;
    autoFetchedProjectMarks: Map<number, number>;
    clearAutoFetchedProjectMarks: () => void;
    toggleProfessionalExperience: (experience: string) => void;
    setProfessionalExperience: (experience: string, enabled: boolean) => void;
    autoFetchedProfessionalExperiences: Set<string>;
    clearAutoFetchedProfessionalExperiences: () => void;
    resetAll: () => void;
    softReset: () => void;
    initialXPDelta: number;
    processInitialData: (userInfo: any, activeTitle: FortyTwoTitle | null) => void;
    persistedOldProjects: any[];
    professionalExperienceMarks: Map<string, number>;
    hydrated: boolean;
    setHydrated: (hydrated: boolean) => void;
    isDataProcessed: boolean;
    coalitionProjects: Set<number>;
    toggleCoalitionBonus: (projectId: number) => void;
  };

  return createWithEqualityFn<StoreWithPersistence>()((set, get) => ({
    cursus: initProps.cursus,
    levels: initProps.levels,
    titles: initProps.titles,
    projects: initProps.projects,
    projectMarks: new Map<number, number>(),
    professionalExperienceMarks: new Map<string, number>(),
    autoFetchedProjectMarks: new Map<number, number>(),
    autoFetchedProfessionalExperiences: new Set<string>(),
    persistedOldProjects: [],
    hydrated: false,
    isDataProcessed: false,
    coalitionProjects: new Set<number>(),

    setHydrated: (hydrated: boolean) => set({ hydrated }),

    clearAutoFetchedProfessionalExperiences: () =>
      set(() => ({ autoFetchedProfessionalExperiences: new Set<string>() })),

    clearAutoFetchedProjectMarks: () =>
      set(() => ({ autoFetchedProjectMarks: new Map() })),

    professionalExperiences: new Set<string>(),
    events: 0,
    eventsFetchedAt: 0,

    setEvents: (events: number) => set((state) => {
      const next = { events, eventsFetchedAt: Date.now() };
      saveProgressionToStorage({ ...state, ...next });
      return next;
    }),

    toggleCoalitionBonus: (projectId: number) =>
      set((state) => {
        const newCoalitionProjects = new Set(state.coalitionProjects);
        if (newCoalitionProjects.has(projectId)) {
          newCoalitionProjects.delete(projectId);
        } else {
          newCoalitionProjects.add(projectId);
        }
        const next = { coalitionProjects: newCoalitionProjects };
        saveProgressionToStorage({ ...state, ...next });
        return next;
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
        const newMarks = new Map(state.professionalExperienceMarks);
        newMarks.set(experience, Math.max(0, Math.min(mark, 100)));
        return { professionalExperienceMarks: newMarks };
      }),

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
      saveProgressionToStorage({ projectMarks: new Map(), professionalExperiences: new Set(), coalitionProjects: new Set(), events: 0, eventsFetchedAt: 0 })
      return { projectMarks: new Map(), professionalExperiences: new Set(), coalitionProjects: new Set(), events: 0, eventsFetchedAt: 0, persistedOldProjects: [], initialXPDelta: 0, isDataProcessed: false }
    }),

    softReset: () => set((state) => {
      const newMarks = new Map(state.autoFetchedProjectMarks ?? [])
      const newProExp: Set<string> = new Set(state.autoFetchedProfessionalExperiences ?? [])
      saveProgressionToStorage({
        projectMarks: newMarks,
        professionalExperiences: newProExp,
        coalitionProjects: state.coalitionProjects ?? new Set(),
        events: state.events,
        eventsFetchedAt: state.eventsFetchedAt,
      })
      return {
        projectMarks: newMarks,
        professionalExperiences: newProExp,
        coalitionProjects: new Set(),
        events: state.events,
        eventsFetchedAt: state.eventsFetchedAt,
        isDataProcessed: false,
      }
    }),

    initialXPDelta: 0,

    processInitialData: (userInfo: any, activeTitle: FortyTwoTitle | null) => {
      if (!userInfo) return;
      const state = get();

      let oldProjects: any[] = [];
      if (userInfo.projects_users && activeTitle) {
        const mainOption = activeTitle.options?.[0];
        if (mainOption) {
          const cursusProjectIds = new Set(
            Array.isArray(mainOption.projects)
              ? mainOption.projects
              : Object.keys(mainOption.projects).map(Number)
          );
          let canonicalProjects: Record<number, any> = {};
          try {
            // @ts-ignore
            canonicalProjects = require('@/lib/forty-two/data/projects_21.json').projects.reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
          } catch {}
          oldProjects = userInfo.projects_users
            .filter((pu: any) => !cursusProjectIds.has(pu.project.id) && pu.final_mark > 0)
            .map((pu: any) => {
              let xp = 0;
              if (canonicalProjects[pu.project.id]) {
                xp = canonicalProjects[pu.project.id].experience || canonicalProjects[pu.project.id].xp || canonicalProjects[pu.project.id].difficulty || 0;
              }
              if (!xp) {
                xp = pu.project.experience || pu.project.xp || 0;
              }
              return {
                id: pu.project.id,
                name: pu.project.name,
                xp,
                mark: pu.final_mark,
              };
            });
        }
      }

      const newMarks = new Map(state.projectMarks);
      const newAutoMarks = new Map(state.autoFetchedProjectMarks);
      const newProExp = new Set(state.professionalExperiences);
      const newAutoProExp = new Set(state.autoFetchedProfessionalExperiences);

      const mainProjects = (userInfo.projects_users && userInfo.projects_users.length > 0)
        ? userInfo.projects_users
        : oldProjects.map((p: any) => ({ project: { id: p.id }, final_mark: p.mark }));

      const projectToExperience: Record<number, string> = {
        1638: "stage_1", 1644: "stage_2", 1662: "startup_experience",
        1873: "alternance_1_an", 1877: "alternance_1_an", 1878: "alternance_1_an",
        1879: "alternance_1_an", 1880: "alternance_1_an", 2561: "alternance_1_an",
        2563: "alternance_1_an", 1857: "alternance_2_ans", 1861: "alternance_2_ans",
        1862: "alternance_2_ans", 1863: "alternance_2_ans", 1864: "alternance_2_ans",
        1865: "alternance_2_ans", 1869: "alternance_2_ans", 1870: "alternance_2_ans",
        1871: "alternance_2_ans", 1872: "alternance_2_ans", 2562: "alternance_2_ans",
        2564: "alternance_2_ans",
      };

      mainProjects.forEach((project: any) => {
        if (typeof project.final_mark === 'number' && project.final_mark > 0) {
          newMarks.set(project.project.id, project.final_mark);
          newAutoMarks.set(project.project.id, project.final_mark);
        }
        const expKey = projectToExperience[project.project.id];
        if (expKey) {
            newProExp.add(expKey);
            newAutoProExp.add(expKey);
        }
      });

      const cursus = userInfo.cursus_users?.find((c: any) => c.cursus_id === 21);
      const userLevel = cursus?.level ?? null;
      let userLevelXP = null;
      if (userLevel !== null && typeof userLevel === 'number') {
        try {
          // @ts-ignore
          const expData = require('@/lib/forty-two/data/experience_21.json');
          const levels = expData.levels;
          let lower = levels[0];
          let upper = levels[levels.length - 1];
          for (let i = 0; i < levels.length; i++) {
            if (levels[i].level <= userLevel) lower = levels[i];
            if (levels[i].level >= userLevel) { upper = levels[i]; break; }
          }
          if (lower.level === upper.level) {
            userLevelXP = lower.experience;
          } else {
            const ratio = (userLevel - lower.level) / (upper.level - lower.level);
            userLevelXP = lower.experience + ratio * (upper.experience - lower.experience);
          }
        } catch (e) {
          userLevelXP = null;
        }
      }

      let totalXP = 0;
      for (const [projectId, mark] of newMarks) {
        const project = state.projects[projectId];
        if (project) {
          totalXP += (project.experience || project.difficulty || 0) * (mark / 100);
        }
      }
      const initialXPDelta = (userLevelXP ?? 0) - totalXP;

      const finalState = {
        projectMarks: newMarks,
        autoFetchedProjectMarks: newAutoMarks,
        professionalExperiences: newProExp,
        autoFetchedProfessionalExperiences: newAutoProExp,
        initialXPDelta: initialXPDelta,
        persistedOldProjects: oldProjects,
        isDataProcessed: true,
      };

      set(finalState);
      saveProgressionToStorage({ ...get(), ...finalState });
    },

    getSelectedXP: () => {
      const state = get();
      const professionalExperienceXp: Record<string, number> = {
        stage_1: 42000,
        stage_2: 63000,
        startup_experience: 42000,
        alternance_1_an: 90000,
        alternance_2_ans: 180000,
      };
      let totalXP = 0;
      let xp = 0;
      for (const experience of state.professionalExperiences) {
        const mark = state.professionalExperienceMarks.get(experience) ?? 100;
        totalXP += (professionalExperienceXp[experience] || 0) * (mark / 100);
      }
      for (const [projectId, mark] of state.projectMarks) {
        const project = state.projects[projectId];
        if (project) {
          let xp = (project.experience || project.difficulty || 0) * (mark / 100);
          // Apply coalition bonus to the global gauge if project flagged as coalition
          if (state.coalitionProjects.has(projectId)) {
            xp *= 1.042;
          }
          totalXP += xp;
        }
      }
      return totalXP + (state.initialXPDelta ?? 0);
    },

    getProjectXP: (project: FortyTwoProject) => {
      const state = get();
      let totalXP = 0;
      totalXP += project.experience || project.difficulty || 0;
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
          let xpForProj = (proj.experience || proj.difficulty || 0) * (mark / 100)
          // Apply coalition bonus only for manually-added projects (not auto-fetched ones)
          const isAutoFetched = state.autoFetchedProjectMarks?.has(projectId);
          if (state.coalitionProjects.has(projectId) && !isAutoFetched) {
            xpForProj *= 1.042
          }
          totalXP += xpForProj
        }
      }

      return totalXP
    },

    isProjectModuleComplete: (project: FortyTwoProject) => {
      const state = get();
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
      for (const [projectId, mark] of state.projectMarks) {
        const project = state.projects[projectId];
        const isGroup = /group|groupe|team/i.test(project?.name || "");
        if (isGroup && mark && mark > 0) {
          count++;
        }
      }
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

export const FortyTwoStoreContext = createContext<FortyTwoStoreApi | undefined>(undefined)

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
      const current = storeRef.current?.getState();
      let events = current?.events ?? 0;
      let eventsFetchedAt = current?.eventsFetchedAt ?? 0;
      if (
        typeof restored.events === 'number' &&
        typeof restored.eventsFetchedAt === 'number' &&
        restored.eventsFetchedAt > eventsFetchedAt
      ) {
        events = restored.events;
        eventsFetchedAt = restored.eventsFetchedAt;
      }
      storeRef.current?.setState({
        projectMarks: restored.projectMarks,
        professionalExperiences: restored.professionalExperiences,
        coalitionProjects: restored.coalitionProjects, // Restore coalition projects
        events,
        eventsFetchedAt,
      });
      forceRerender(x => x + 1);
      setTimeout(() => {
        storeRef.current?.getState().setHydrated(true);
      }, 0);
    } else {
      storeRef.current?.getState().setHydrated(true);
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
