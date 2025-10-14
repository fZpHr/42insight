import type { FortyTwoTitle } from "@/types/forty-two"
import rncpData from "./data/rncp_21.json"

export async function getFortyTwoTitles(): Promise<FortyTwoTitle[]> {
  return rncpData.rncp
}

export function getSuiteProjects(): number[] {
  return rncpData.suite.projects
}

export function getExperienceProjects(): number[] {
  return rncpData.experience.projects
}
