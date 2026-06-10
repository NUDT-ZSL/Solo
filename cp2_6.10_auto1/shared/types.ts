export type Emotion = 'happy' | 'sad' | 'expect' | 'emotion'

export interface User {
  id: string
  username: string
  passwordHash: string
  createdAt: number
}

export interface Session {
  id: string
  userId: string
  token: string
  createdAt: number
  expiresAt: number
}

export interface Letter {
  id: string
  userId: string
  title: string
  content: string
  emotion: Emotion
  unlockAt: number
  createdAt: number
  isUnlocked: boolean
}

export interface LetterListItem {
  id: string
  title: string
  emotion: Emotion
  unlockAt: number
  createdAt: number
  isUnlocked: boolean
}

export interface CreateLetterReq {
  title: string
  content: string
  emotion: Emotion
  unlockAt: number
}

export interface CreateLetterRes {
  id: string
  title: string
  emotion: Emotion
  unlockAt: number
  createdAt: number
}

export interface GetLetterRes {
  id: string
  title: string
  content: string
  emotion: Emotion
  unlockAt: number
  createdAt: number
  isUnlocked: boolean
}

export interface LetterListRes {
  letters: LetterListItem[]
  total: number
}

export interface RegisterReq {
  username: string
  password: string
}

export interface LoginReq {
  username: string
  password: string
}

export interface AuthRes {
  token: string
  user: {
    id: string
    username: string
  }
}

export interface ServerTimeRes {
  serverTime: number
}
