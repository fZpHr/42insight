import type { FortyTwoProject } from "@/types/forty-two"
import projectsData from "./data/projects_21.json"

export async function getFortyTwoProjects(): Promise<Record<number, FortyTwoProject>> {
  const projects: Record<number, FortyTwoProject> = {}

  for (const project of projectsData.projects) {
    projects[project.id] = {
      ...project,
      experience: project.difficulty,
      validated: false,
      mark: undefined,
      bonus: false,
    }
  }

  return projects
}
