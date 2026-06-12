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
    await this.db.read()
    if (!this.db.data || !this.db.data.levels || this.db.data.levels.length === 0) {
      this.db.data = { levels: defaultLevels, scores: [] }
      await this.db.write()
    }
    if (!this.db.data.scores) {
      this.db.data.scores = []
      await this.db.write()
    }
  }

  async getLevels(): Promise<Level[]> {
    await this.db.read()
    return this.db.data.levels
  }

  async getLevelById(id: string): Promise<Level | undefined> {
    await this.db.read()
    return this.db.data.levels.find((l) => l.id === id)
  }

  async addScore(
    playerName: string,
    score: number,
    levelId: string,
    levelName: string,
    maxCombo: number,
    obstaclesCleared: number
  ): Promise<ScoreEntry> {
    await this.db.read()
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
    await this.db.write()
    return entry
  }

  async getTopScores(limit: number = 10, levelId?: string): Promise<ScoreEntry[]> {
    await this.db.read()
    let scores = [...this.db.data.scores]
    if (levelId) {
      scores = scores.filter((s) => s.levelId === levelId)
    }
    scores.sort((a, b) => b.score - a.score)
    return scores.slice(0, limit)
  }

  async checkRank(score: number, levelId?: string): Promise<number> {
    await this.db.read()
    let scores = [...this.db.data.scores]
    if (levelId) {
      scores = scores.filter((s) => s.levelId === levelId)
    }
    scores.sort((a, b) => b.score - a.score)
    const rank = scores.findIndex((s) => score > s.score)
    return rank === -1 ? scores.length + 1 : rank + 1
  }
}
