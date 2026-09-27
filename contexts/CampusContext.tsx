"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Which campus is being looked at.
 *
 * Switching used to be a staff privilege, from when the site read a database
 * seeded for two campuses and there was nothing else to switch to. Every
 * request now runs on the visitor's own key against the live 42 API, so any
 * student can look at any of the 54 schools, and the only thing that makes
 * their own special is that it is where they start.
 */

export interface Campus {
  id: number
  name: string
  usersCount?: number
  /** 42 has shut it. Alumni remain, nothing is live. */
  closed?: boolean
}

interface CampusContextType {
  selectedCampus: string
  setSelectedCampus: (campus: string) => void
  /**
   * The campuses worth offering: open ones only.
   *
   * A closed campus has alumni and levels, so a leaderboard for it reads
   * correctly, but its cluster, exams and projects in progress are all empty
   * or erroring. Every picker on the site reads this list, so the closed ones
   * are kept out of it and offered by the rankings alone, through
   * `allCampuses`.
   */
  campuses: Campus[]
  /** The same list with the closed campuses in it. */
  allCampuses: Campus[]
  userCampus: string
}

const CampusContext = createContext<CampusContextType | undefined>(undefined)

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const userCampus = session?.user?.campus || ''

  const [campuses, setCampuses] = useState<Campus[]>([])
  const [selectedCampus, setSelectedCampus] = useState<string>(userCampus)

  // The directory is one request, cached a day server-side. Everyone gets it:
  // the picker has nothing to offer without it.
  //
  // Keyed on the login rather than the session object: useSession hands back a
  // fresh object on every session refresh, and depending on it re-ran this
  // fetch each time -- four to six calls in a row on a single navigation.
  const sessionLogin = session?.user?.login ?? null
  useEffect(() => {
    if (!sessionLogin) return

    fetch('/api/campuses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCampuses(data)
      })
      .catch(() => {
        // The picker falls back to the visitor's own campus, which is the one
        // they came for anyway.
      })
  }, [sessionLogin])

  // Start where the visitor studies, and remember where they wandered.
  useEffect(() => {
    if (!userCampus) return

    let saved: string | null = null
    try {
      saved = window.localStorage.getItem('selected_campus')
    } catch {
      // Private browsing; the default below still applies.
    }

    setSelectedCampus(saved || userCampus)
  }, [userCampus])

  const handleSetSelectedCampus = (campus: string) => {
    setSelectedCampus(campus)
    try {
      window.localStorage.setItem('selected_campus', campus)
    } catch {
      // Not remembering it is a smaller failure than not honouring it.
    }
  }

  return (
    <CampusContext.Provider
      value={{
        selectedCampus,
        setSelectedCampus: handleSetSelectedCampus,
        campuses: campuses.filter((campus) => !campus.closed),
        allCampuses: campuses,
        userCampus,
      }}
    >
      {children}
    </CampusContext.Provider>
  )
}

export function useCampus() {
  const context = useContext(CampusContext)
  if (context === undefined) {
    throw new Error('useCampus must be used within a CampusProvider')
  }
  return context
}
