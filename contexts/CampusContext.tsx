"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface CampusContextType {
  selectedCampus: string
  setSelectedCampus: (campus: string) => void
  availableCampuses: string[]
  canChangeCampus: boolean
  userCampus: string
}

const CampusContext = createContext<CampusContextType | undefined>(undefined)

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const userCampus = session?.user?.campus || ''
  const userRole = session?.user?.role || 'student'
  

  const canChangeCampus = userRole === 'staff' || userRole === 'admin'
  

  const availableCampuses = ['Angouleme', 'Nice', 'Paris']
  

  const [selectedCampus, setSelectedCampus] = useState<string>(userCampus)
  

  useEffect(() => {
    if (userCampus && !selectedCampus) {
      setSelectedCampus(userCampus)
    }
  }, [userCampus])
  

  useEffect(() => {
    if (canChangeCampus && typeof window !== 'undefined') {
      const saved = localStorage.getItem('staff_campus_bypass')
      if (saved && availableCampuses.includes(saved)) {
        setSelectedCampus(saved)
      } else {

        setSelectedCampus(userCampus)
      }
    } else {

      setSelectedCampus(userCampus)
    }
  }, [canChangeCampus, userCampus])
  

  const handleSetSelectedCampus = (campus: string) => {
    if (canChangeCampus) {
      setSelectedCampus(campus)
      if (typeof window !== 'undefined') {
        localStorage.setItem('staff_campus_bypass', campus)
      }
    }
  }
  
  return (
    <CampusContext.Provider
      value={{
        selectedCampus: selectedCampus || userCampus,
        setSelectedCampus: handleSetSelectedCampus,
        availableCampuses,
        canChangeCampus,
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
