import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { User, Session, Letter } from '../../shared/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', 'data')

interface StoreData {
  users: User[]
  sessions: Session[]
  letters: Letter[]
}

const DEFAULT_DATA: StoreData = {
  users: [],
  sessions: [],
  letters: [],
}

class JsonStore {
  private data: StoreData
  private readonly filePath: string
  private flushTimer: NodeJS.Timeout | null = null
  private dirty = false

  constructor() {
    this.filePath = path.join(DATA_DIR, 'store.json')
    this.ensureDir()
    this.data = this.load()
    this.startAutoFlush()
  }

  private ensureDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(this.filePath)) {
      this.writeAtomic(DEFAULT_DATA)
    }
  }

  private load(): StoreData {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      return JSON.parse(raw) as StoreData
    } catch {
      return { ...DEFAULT_DATA }
    }
  }

  private writeAtomic(data: StoreData): void {
    const tempPath = `${this.filePath}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tempPath, this.filePath)
  }

  private scheduleFlush(): void {
    this.dirty = true
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flush()
      }, 1000)
    }
  }

  flush(): void {
    if (this.dirty) {
      this.writeAtomic(this.data)
      this.dirty = false
    }
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  private startAutoFlush(): void {
    setInterval(() => {
      this.flush()
    }, 5000)
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id)
  }

  findUserByUsername(username: string): User | undefined {
    return this.data.users.find((u) => u.username === username)
  }

  createUser(user: User): User {
    this.data.users.push(user)
    this.scheduleFlush()
    return user
  }

  findSessionByToken(token: string): Session | undefined {
    return this.data.sessions.find((s) => s.token === token)
  }

  createSession(session: Session): Session {
    this.data.sessions.push(session)
    this.scheduleFlush()
    return session
  }

  deleteSessionByToken(token: string): void {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token)
    this.scheduleFlush()
  }

  findLetterById(id: string): Letter | undefined {
    return this.data.letters.find((l) => l.id === id)
  }

  findLettersByUserId(userId: string): Letter[] {
    return this.data.letters
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  createLetter(letter: Letter): Letter {
    this.data.letters.push(letter)
    this.scheduleFlush()
    return letter
  }

  updateLetter(id: string, updates: Partial<Letter>): Letter | undefined {
    const idx = this.data.letters.findIndex((l) => l.id === id)
    if (idx === -1) return undefined
    this.data.letters[idx] = { ...this.data.letters[idx], ...updates }
    this.scheduleFlush()
    return this.data.letters[idx]
  }

  deleteLetter(id: string): boolean {
    const before = this.data.letters.length
    this.data.letters = this.data.letters.filter((l) => l.id !== id)
    if (this.data.letters.length !== before) {
      this.scheduleFlush()
      return true
    }
    return false
  }

  countLettersByUserId(userId: string): number {
    return this.data.letters.filter((l) => l.userId === userId).length
  }
}

export const jsonStore = new JsonStore()
