interface User {
  id: string
  email: string
  password: string
}

interface SpectrumData {
  high: number
  mid: number
  low: number
  mfcc: number[]
}

interface Voiceprint {
  id: string
  userId: string
  filename: string
  createdAt: string
  spectrum: SpectrumData
  story: string
  tags: string[]
  favorited: boolean
}

export { type User, type SpectrumData, type Voiceprint }

export const users = new Map<string, User>()
export const voiceprints = new Map<string, Voiceprint>()
