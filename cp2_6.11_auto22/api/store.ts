import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, '..', 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const VOICEPRINTS_FILE = path.join(DATA_DIR, 'voiceprints.json')

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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data) as T
    }
  } catch {}
  return fallback
}

function saveJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const usersMap = new Map<string, User>()
const voiceprintsMap = new Map<string, Voiceprint>()

function loadStore(): void {
  const usersArr = loadJSON<{ id: string; email: string; password: string }[]>(USERS_FILE, [])
  for (const u of usersArr) usersMap.set(u.id, u)

  const vpArr = loadJSON<Voiceprint[]>(VOICEPRINTS_FILE, [])
  for (const vp of vpArr) voiceprintsMap.set(vp.id, vp)
}

loadStore()

function persistUsers(): void {
  saveJSON(USERS_FILE, Array.from(usersMap.values()))
}

function persistVoiceprints(): void {
  saveJSON(VOICEPRINTS_FILE, Array.from(voiceprintsMap.values()))
}

export const users = {
  get: (id: string) => usersMap.get(id),
  set: (id: string, user: User) => { usersMap.set(id, user); persistUsers() },
  values: () => usersMap.values(),
  findByEmail: (email: string): User | undefined => {
    for (const u of usersMap.values()) {
      if (u.email === email) return u
    }
    return undefined
  },
}

export const voiceprints = {
  get: (id: string) => voiceprintsMap.get(id),
  set: (id: string, vp: Voiceprint) => { voiceprintsMap.set(id, vp); persistVoiceprints() },
  delete: (id: string) => { voiceprintsMap.delete(id); persistVoiceprints() },
  values: () => voiceprintsMap.values(),
  getByUserId: (userId: string): Voiceprint[] => {
    const result: Voiceprint[] = []
    for (const vp of voiceprintsMap.values()) {
      if (vp.userId === userId) result.push(vp)
    }
    return result
  },
}
