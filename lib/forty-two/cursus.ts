import type { FortyTwoCursus } from "@/types/forty-two"

export async function getFortyTwoCursus(): Promise<FortyTwoCursus> {
  return {
    id: 21,
    name: "42cursus",
    slug: "42cursus",
    level: 0,
    events: 0,
    projects: {},
  }
}
