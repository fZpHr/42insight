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

/**
 * Projects 42 retired that still count toward a title for whoever validated
 * them. They stay in the options so they keep counting, but the simulator
 * hides them unless the visitor asks to see them.
 */
export const LEGACY_PROJECT_IDS: ReadonlySet<number> = new Set(rncpData.legacy.projects)
