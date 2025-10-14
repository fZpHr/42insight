export interface FortyTwoProject {
  id: number
  name: string
  slug: string
  difficulty: number
  experience?: number
  completions: number
  duration: number
  created_at: string
  updated_at: string
  exam: boolean
  parent: { name: string; id: number; slug: string } | null
  children: { name: string; id: number; slug: string }[]
  // User-specific fields
  mark?: number
  bonus?: boolean
  validated?: boolean
  is_solo?: boolean // Added for group project detection
}
export interface FortyTwoCursus {
  id: number
  name: string
  slug: string
  level: number
  events: number
  projects: Record<number, { validated: boolean; mark?: number }>
}

export interface FortyTwoTitleOption {
  title: string
  experience: number
  number_of_projects: number
  projects: number[] | Record<number, FortyTwoProject>
}

export interface FortyTwoTitle {
  type: "rncp-6" | "rncp-7"
  title: string
  level: number
  number_of_events: number
  number_of_experiences: number
  number_of_suite: number
  options: FortyTwoTitleOption[]
}

export interface FortyTwoLevel {
  id: number
  level: number
  experience: number
  created_at: string
}

export interface RNCPData {
  meta: {
    id: number
    created_at: string
    kind: string
    name: string
    slug: string
  }
  rncp: FortyTwoTitle[]
  suite: {
    projects: number[]
  }
  experience: {
    projects: number[]
  }
}

export interface FortyTwoStore {
  cursus: FortyTwoCursus;
  levels: Record<number, FortyTwoLevel>;
  projects: Record<number, FortyTwoProject>;
  titles: FortyTwoTitle[];
  projectMarks: Map<number, number>;
  setProjectMark: (projectId: number, mark: number) => void;
  removeProject: (projectId: number) => void;
  getSelectedXP: () => number;
  getProjectXP: (project: FortyTwoProject) => number;
  getDynamicProjectXP: (project: FortyTwoProject) => number;
  events: number;
  eventsFetchedAt: number;
  setEvents: (events: number) => void;
  isProjectModuleComplete: (project: FortyTwoProject) => boolean;
  getExperienceForOption: (option: FortyTwoTitleOption) => number;
  getLevel: (experience: number) => number;
  // Added for requirements UI
  professionalExperiences: Set<string>;
  toggleProfessionalExperience: (experience: string) => void;
}
}
