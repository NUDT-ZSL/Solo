import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'

interface AppContextType {
  user: User | null
  login: (name: string, isAdmin?: boolean) => void
  logout: () => void
  currentParticipantId: string | null
  setCurrentParticipantId: (id: string | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('bookevents_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    const savedParticipantId = localStorage.getItem('bookevents_participantId')
    if (savedParticipantId) {
      setCurrentParticipantId(savedParticipantId)
    }
  }, [])

  const login = (name: string, isAdmin = false) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      isAdmin
    }
    setUser(newUser)
    localStorage.setItem('bookevents_user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    setCurrentParticipantId(null)
    localStorage.removeItem('bookevents_user')
    localStorage.removeItem('bookevents_participantId')
  }

  return (
    <AppContext.Provider value={{
      user,
      login,
      logout,
      currentParticipantId,
      setCurrentParticipantId
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
