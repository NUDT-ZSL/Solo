import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', '..', 'festival.db')

const db = new Database(dbPath)

export interface Stage {
  id: string
  name: string
  artistName: string
  artistAvatar: string
  performanceTime: string
  audioUrl: string
  backgroundColor: string
  particlePreset: string
  createdAt: string
}

export interface Ticket {
  id: string
  userId: string
  stageId: string
  nickname: string
  hash: string
  seatNumber: string
  createdAt: string
}

export const initDB = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      artistName TEXT NOT NULL,
      artistAvatar TEXT,
      performanceTime TEXT NOT NULL,
      audioUrl TEXT,
      backgroundColor TEXT,
      particlePreset TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      stageId TEXT NOT NULL,
      nickname TEXT NOT NULL,
      hash TEXT NOT NULL,
      seatNumber TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stageId) REFERENCES stages(id)
    )
  `)

  const count = db.prepare('SELECT COUNT(*) as count FROM stages').get() as { count: number }
  
  if (count.count === 0) {
    const stmt = db.prepare(`
      INSERT INTO stages (id, name, artistName, artistAvatar, performanceTime, audioUrl, backgroundColor, particlePreset)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const stages = [
      ['1', 'Electric Dreams', 'Neon Pulse', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neon', '2026-06-20T20:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', '#6a1b9a', 'nebula'],
      ['2', 'Synthwave Nights', 'RetroWave', 'https://api.dicebear.com/7.x/avataaars/svg?seed=retro', '2026-06-20T21:30:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', '#006064', 'cosmic'],
      ['3', 'Bass Drop Arena', 'Subsonic', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bass', '2026-06-20T23:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', '#4a148c', 'galaxy'],
      ['4', 'Ambient Space', 'Echo Chamber', 'https://api.dicebear.com/7.x/avataaars/svg?seed=echo', '2026-06-21T20:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', '#1a237e', 'stars']
    ]

    stages.forEach(stage => {
      stmt.run(stage)
    })
  }
}

export const getAllStages = (): Stage[] => {
  return db.prepare('SELECT * FROM stages ORDER BY performanceTime ASC').all() as Stage[]
}

export const getStageById = (id: string): Stage | undefined => {
  return db.prepare('SELECT * FROM stages WHERE id = ?').get(id) as Stage | undefined
}

export const createTicket = (ticket: Omit<Ticket, 'createdAt'>): Ticket => {
  const stmt = db.prepare(`
    INSERT INTO tickets (id, userId, stageId, nickname, hash, seatNumber)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  
  stmt.run(ticket.id, ticket.userId, ticket.stageId, ticket.nickname, ticket.hash, ticket.seatNumber)
  
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id) as Ticket
}

export const getTicketsByUserId = (userId: string): Ticket[] => {
  return db.prepare('SELECT * FROM tickets WHERE userId = ? ORDER BY createdAt DESC').all(userId) as Ticket[]
}

export default db
