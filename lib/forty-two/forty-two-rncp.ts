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

/**
 * The group projects that belong to the common core, old and new.
 *
 * The RNCP titles ask for "deux projets de groupe **après le tronc commun**",
 * and the simulator was counting every group project a student had ever
 * validated -- so anyone who finished the core arrived with five or six out of
 * two, the requirement marked green, without having done a single group
 * project after it. A false pass on a condition people read before asking
 * their campus for the title.
 *
 * Both generations are listed because both are live. 42 rebuilt the common
 * core in December 2025 under new project ids, and students who started before
 * it carry the old ones: an account is on one set or the other, never both,
 * and the simulator has to answer for either.
 *
 * Only group projects are here. Solo ones can never reach this counter, so
 * listing the whole common core would be noise -- and would need revisiting
 * every time 42 moves a solo project around.
 */
export const COMMON_CORE_GROUP_PROJECTS: ReadonlySet<number> = new Set([
  // The 2019 common core.
  1315, // miniRT
  1326, // cub3d
  1331, // minishell
  1332, // webserv
  1336, // ft_irc
  1337, // ft_transcendence -- kept by the 2025 core too, same id

  // The December 2025 common core.
  2688, // A-Maze-ing
  2701, // The Answer Protocol
  2702, // tree_nity
  2703, // Agent Smith
  2706, // Pac-Man
  2725, // cub3d
  2726, // miniRT
  2727, // minishell
])

/** Whether a validated group project counts toward the two a title asks for. */
export const countsAsGroupProject = (project: {
  id: number
  is_solo?: boolean | null
}): boolean => project.is_solo === false && !COMMON_CORE_GROUP_PROJECTS.has(project.id)
