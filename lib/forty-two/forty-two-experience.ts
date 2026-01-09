/**
 * Calcule le niveau réel (avec décimales) à partir de l'XP et des paliers de niveaux.
 * @param experience XP total
 * @param levels Record<number, FortyTwoLevel> (clé = level)
 * @returns niveau réel (ex: 7.42)
 */
export function getPreciseLevel(experience: number, levels: Record<number, FortyTwoLevel>): number {
  const sortedLevels = Object.values(levels).sort((a, b) => a.level - b.level);
  if (experience <= sortedLevels[0].experience) return sortedLevels[0].level;
  for (let i = 0; i < sortedLevels.length - 1; i++) {
    const curr = sortedLevels[i];
    const next = sortedLevels[i + 1];
    if (experience >= curr.experience && experience < next.experience) {
      const progress = (experience - curr.experience) / (next.experience - curr.experience);
      return curr.level + progress;
    }
  }

  return sortedLevels[sortedLevels.length - 1].level;
}
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
