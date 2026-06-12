import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface Level {
  id: string
  name: string
  difficulty: 'easy' | 'normal' | 'hard'
  bpm: number
  obstacleDensity: number
  baseSpeed: number
  duration: number
  theme: {
    backgroundStart: string
    backgroundEnd: string
    primaryColor: string
    secondaryColor: string
  }
}

export interface ScoreEntry {
  id: string
  playerName: string
  score: number
  levelId: string
  levelName: string
  maxCombo: number
  obstaclesCleared: number
  timestamp: number
}

interface Database {
  levels: Level[]
  scores: ScoreEntry[]
}

const defaultLevels: Level[] = [
  {
    id: 'easy-1',
    name: 'Easy',
    difficulty: 'easy',
    bpm: 100,
    obstacleDensity: 1,
    baseSpeed: 3,
    duration: 60,
    theme: {
      backgroundStart: '#1a1a4e',
      backgroundEnd: '#2a2a6e',
      primaryColor: '#6b9dff',
      secondaryColor: '#9d6bff'
    }
  },
  {
    id: 'normal-1',
    name: 'Normal',
    difficulty: 'normal',
    bpm: 128,
    obstacleDensity: 2,
    baseSpeed: 5,
    duration: 90,
    theme: {
      backgroundStart: '#2e1a1a',
      backgroundEnd: '#4e2a2a',
      primaryColor: '#ff6b35',
      secondaryColor: '#ff9d6b'
    }
  },
  {
    id: 'hard-1',
    name: 'Hard',
    difficulty: 'hard',
    bpm: 160,
    obstacleDensity: 3,
    baseSpeed: 7,
    duration: 120,
    theme: {
      backgroundStart: '#1a0a2e',
      backgroundEnd: '#2e1a4e',
      primaryColor: '#9d35ff',
      secondaryColor: '#ff359d'
    }
  }
]

export class LevelManager {
  private db: Low<Database>

  constructor() {
    const file = path.join(__dirname, '../../../data/db.json')
    const adapter = new JSONFile<Database>(file)
    this.db = new Low(adapter, { levels: defaultLevels, scores: [] })
  }

  async init(): Promise<void> {
    try {
      await this.db.read()
    } catch (e) {
      console.error('Failed to read database, initializing with defaults:', e)
      this.db.data = { levels: defaultLevels, scores: [] }
    }

    if (!this.db.data || !this.db.data.levels || this.db.data.levels.length === 0) {
      this.db.data = { levels: defaultLevels, scores: [] }
    }
    if (!this.db.data.scores) {
      this.db.data.scores = []
    }

    try {
      await this.db.write()
    } catch (e) {
      console.error('Failed to write database during init:', e)
    }
  }

  async getLevels(): Promise<Level[]> {
    try {
      await this.db.read()
      return this.db.data.levels || defaultLevels
    } catch (e) {
      console.error('Failed to read levels:', e)
      return defaultLevels
    }
  }

  async getLevelById(id: string): Promise<Level | undefined> {
    try {
      await this.db.read()
      return this.db.data.levels.find((l) => l.id === id)
    } catch (e) {
      console.error('Failed to read level by id:', e)
      return defaultLevels.find((l) => l.id === id)
    }
  }

  async addScore(
    playerName: string,
    score: number,
    levelId: string,
    levelName: string,
    maxCombo: number,
    obstaclesCleared: number
  ): Promise<ScoreEntry> {
    try {
      await this.db.read()
    } catch (e) {
      console.error('Failed to read database before adding score:', e)
      if (!this.db.data) {
        this.db.data = { levels: defaultLevels, scores: [] }
      }
    }

    const entry: ScoreEntry = {
      id: uuidv4(),
      playerName,
      score,
      levelId,
      levelName,
      maxCombo,
      obstaclesCleared,
      timestamp: Date.now()
    }

    this.db.data.scores.push(entry)

    try {
      await this.db.write()
    } catch (e) {
      console.error('Failed to write score to database:', e)
    }

    return entry
  }

  async getTopScores(limit: number = 10, levelId?: string): Promise<ScoreEntry[]> {
    try {
      await this.db.read()
    } catch (e) {
      console.error('Failed to read database for top scores:', e)
      return []
    }

    let scores = [...(this.db.data.scores || [])]

    if (levelId) {
      scores = scores.filter((s) => s.levelId === levelId)
    }

    scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.timestamp - b.timestamp
    })

    return scores.slice(0, Math.min(limit, 10))
  }

  async checkRank(score: number, levelId?: string): Promise<number> {
    try {
      await this.db.read()
    } catch (e) {
      console.error('Failed to read database for rank check:', e)
      return 1
    }

    let scores = [...(this.db.data.scores || [])]

    if (levelId) {
      scores = scores.filter((s) => s.levelId === levelId)
    }

    scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.timestamp - b.timestamp
    })

    const rank = scores.findIndex((s) => score > s.score)
    return rank === -1 ? scores.length + 1 : rank + 1
  }

  async isTop10(score: number, levelId?: string): Promise<boolean> {
    const rank = await this.checkRank(score, levelId)
    return rank <= 10
  }
}
