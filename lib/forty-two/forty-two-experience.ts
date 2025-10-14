import type { FortyTwoLevel } from "@/types/forty-two"
import experienceData from "./data/experience_21.json"

export async function getFortyTwoLevels(): Promise<Record<number, FortyTwoLevel>> {
  const levels: Record<number, FortyTwoLevel> = {}

  for (const level of experienceData.levels) {
    levels[level.level] = level
  }

  return levels
}

export function getLevel(experience: number, levels: Record<number, FortyTwoLevel>): number {
  let currentLevel = 0

  for (const level of Object.values(levels).sort((a, b) => a.level - b.level)) {
    if (experience >= level.experience) {
      currentLevel = level.level
    } else {
      break
    }
  }

  return currentLevel
}

export function getExperience(level: number, levels: Record<number, FortyTwoLevel>): number {
  return levels[level]?.experience ?? 0
}
