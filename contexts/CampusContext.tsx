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
  
  // Only staff and admin can bypass campus restrictions
  const canChangeCampus = userRole === 'staff' || userRole === 'admin'
  
  // Available campuses for staff/admin bypass
  const availableCampuses = ['Angouleme', 'Nice', 'Paris']
  
  // State for selected campus - defaults to user's campus
  const [selectedCampus, setSelectedCampus] = useState<string>(userCampus)
  
  // Update selectedCampus when user's campus changes
  useEffect(() => {
    if (userCampus && !selectedCampus) {
      setSelectedCampus(userCampus)
    }
  }, [userCampus])
  
  // Load saved campus preference from localStorage (only for staff/admin)
  useEffect(() => {
    if (canChangeCampus && typeof window !== 'undefined') {
      const saved = localStorage.getItem('staff_campus_bypass')
      if (saved && availableCampuses.includes(saved)) {
        setSelectedCampus(saved)
      } else {
        // Default to user's campus even for staff
        setSelectedCampus(userCampus)
      }
    } else {
      // Non-staff users always use their campus
      setSelectedCampus(userCampus)
    }
  }, [canChangeCampus, userCampus])
  
  // Save campus preference to localStorage when it changes
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
