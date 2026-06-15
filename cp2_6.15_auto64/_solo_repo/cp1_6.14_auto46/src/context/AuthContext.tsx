import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { User, mockLogin, mockRegister, mockLogout, mockGetCurrentUser } from '../shared/mockApi'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, nickname: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await mockGetCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await mockLogin(email, password)
    if (result) {
      setUser(result.user)
      return true
    }
    return false
  }, [])

  const register = useCallback(async (email: string, password: string, nickname: string) => {
    const result = await mockRegister(email, password, nickname)
    if (result) {
      setUser(result.user)
      return true
    }
    return false
  }, [])

  const logout = useCallback(async () => {
    await mockLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
