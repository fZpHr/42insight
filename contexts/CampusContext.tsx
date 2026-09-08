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
}

interface CampusContextType {
  selectedCampus: string
  setSelectedCampus: (campus: string) => void
  /** Every campus 42 has, once the directory has loaded. */
  campuses: Campus[]
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
  useEffect(() => {
    if (!session) return

    fetch('/api/campuses')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCampuses(data)
      })
      .catch(() => {
        // The picker falls back to the visitor's own campus, which is the one
        // they came for anyway.
      })
  }, [session])

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
        campuses,
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
