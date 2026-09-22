import type { FortyTwoCursus } from "@/types/forty-two"

/** 42cursus: the cursus this whole site reports on. */
export const MAIN_CURSUS_ID = 21

/**
 * The cursus a profile is about.
 *
 * Reading cursus_users[1] is a guess about the order 42 answers in, and it is
 * only right for an account whose piscine happens to come first. A Discovery
 * Piscine, an event cursus or another campus's piscine in between and the
 * guess lands on that instead.
 *
 * `kind === "main"` is not enough on its own either: 42Senior and 42.zip carry
 * that kind too. So the cursus this site is built around comes first, then a
 * main cursus still running, then whatever there is.
 */
export function primaryCursusUser(profile: any): any | null {
  const cursusUsers = profile?.cursus_users
  if (!Array.isArray(cursusUsers) || cursusUsers.length === 0) return null

  return (
    cursusUsers.find((c: any) => c.cursus_id === MAIN_CURSUS_ID) ??
    cursusUsers.find((c: any) => c.cursus?.kind === "main" && !c.end_at) ??
    cursusUsers.find((c: any) => c.cursus?.kind === "main") ??
    cursusUsers[cursusUsers.length - 1]
  )
}

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
