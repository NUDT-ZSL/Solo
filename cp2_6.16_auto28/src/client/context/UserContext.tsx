import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'

interface UserContextType {
  userId: string
  nickname: string
  avatar: string
  setNickname: (name: string) => void
}

const UserContext = createContext<UserContextType | null>(null)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string>('')
  const [nickname, setNickname] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('')

  useEffect(() => {
    let storedUserId = localStorage.getItem('festival_user_id')
    let storedNickname = localStorage.getItem('festival_nickname')
    
    if (!storedUserId) {
      storedUserId = uuidv4()
      localStorage.setItem('festival_user_id', storedUserId)
    }
    
    if (!storedNickname) {
      storedNickname = '音乐迷' + Math.floor(Math.random() * 10000)
      localStorage.setItem('festival_nickname', storedNickname)
    }
    
    setUserId(storedUserId)
    setNickname(storedNickname)
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${storedUserId}`)
  }, [])

  const handleSetNickname = (name: string) => {
    setNickname(name)
    localStorage.setItem('festival_nickname', name)
  }

  return (
    <UserContext.Provider value={{ userId, nickname, avatar, setNickname: handleSetNickname }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
