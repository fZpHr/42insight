"use client"

import { useSession } from "next-auth/react"
import { createContext, useContext, type ReactNode } from "react"

interface AuthContextType {
  session: ReturnType<typeof useSession>["data"]
  status: ReturnType<typeof useSession>["status"]
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  const value: AuthContextType = {
    session,
    status,
    isAuthenticated: !!session,
    isLoading: status === "loading",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
