import initSqlJs from 'sql.js'
import type { SqlJsStatic, Database as SqlJsDatabase } from 'sql.js'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', '..', 'festival.db')

type Database = SqlJsDatabase

let db: Database | null = null

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

const saveDatabase = (database: Database) => {
  try {
    const data = database.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (error) {
    console.warn('Warning: Failed to save database to file, using in-memory only:', error)
  }
}

export const initDB = async (): Promise<void> => {
  const SQL: SqlJsStatic = await initSqlJs()
  
  let existingData: Uint8Array | null = null
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath)
      existingData = new Uint8Array(fileBuffer)
    }
  } catch (error) {
    console.warn('Warning: Could not load existing database:', error)
  }
  
  if (existingData) {
    db = new SQL.Database(existingData)
  } else {
    db = new SQL.Database()
  }

  db.run(`
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

  db.run(`
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

  const countResult = db.exec('SELECT COUNT(*) as count FROM stages')
  const count = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0
  
  if (count === 0) {
    const stages = [
      ['1', 'Electric Dreams', 'Neon Pulse', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neon', '2026-06-20T20:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', '#6a1b9a', 'nebula'],
      ['2', 'Synthwave Nights', 'RetroWave', 'https://api.dicebear.com/7.x/avataaars/svg?seed=retro', '2026-06-20T21:30:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', '#006064', 'cosmic'],
      ['3', 'Bass Drop Arena', 'Subsonic', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bass', '2026-06-20T23:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', '#4a148c', 'galaxy'],
      ['4', 'Ambient Space', 'Echo Chamber', 'https://api.dicebear.com/7.x/avataaars/svg?seed=echo', '2026-06-21T20:00:00', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', '#1a237e', 'stars']
    ]

    const stmt = db.prepare(`
      INSERT INTO stages (id, name, artistName, artistAvatar, performanceTime, audioUrl, backgroundColor, particlePreset)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stages.forEach(stage => {
      stmt.bind(stage)
      stmt.step()
      stmt.reset()
    })
    
    stmt.free()
  }

  saveDatabase(db)
}

const rowToStage = (row: any[]): Stage => ({
  id: row[0] as string,
  name: row[1] as string,
  artistName: row[2] as string,
  artistAvatar: row[3] as string,
  performanceTime: row[4] as string,
  audioUrl: row[5] as string,
  backgroundColor: row[6] as string,
  particlePreset: row[7] as string,
  createdAt: row[8] as string
})

const rowToTicket = (row: any[]): Ticket => ({
  id: row[0] as string,
  userId: row[1] as string,
  stageId: row[2] as string,
  nickname: row[3] as string,
  hash: row[4] as string,
  seatNumber: row[5] as string,
  createdAt: row[6] as string
})

export const getAllStages = (): Stage[] => {
  if (!db) return []
  
  const results = db.exec('SELECT * FROM stages ORDER BY performanceTime ASC')
  if (results.length === 0) return []
  
  return results[0].values.map(rowToStage)
}

export const getStageById = (id: string): Stage | undefined => {
  if (!db) return undefined
  
  const stmt = db.prepare('SELECT * FROM stages WHERE id = ?')
  stmt.bind([id])
  
  if (stmt.step()) {
    const row = stmt.getAsObject() as any
    stmt.free()
    return {
      id: row.id,
      name: row.name,
      artistName: row.artistName,
      artistAvatar: row.artistAvatar,
      performanceTime: row.performanceTime,
      audioUrl: row.audioUrl,
      backgroundColor: row.backgroundColor,
      particlePreset: row.particlePreset,
      createdAt: row.createdAt
    }
  }
  
  stmt.free()
  return undefined
}

export const createTicket = (ticket: Omit<Ticket, 'createdAt'>): Ticket => {
  if (!db) throw new Error('Database not initialized')
  
  const createdAt = new Date().toISOString()
  
  db.run(
    `INSERT INTO tickets (id, userId, stageId, nickname, hash, seatNumber, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ticket.id, ticket.userId, ticket.stageId, ticket.nickname, ticket.hash, ticket.seatNumber, createdAt]
  )

  saveDatabase(db)

  return {
    ...ticket,
    createdAt
  }
}

export const getTicketsByUserId = (userId: string): Ticket[] => {
  if (!db) return []
  
  const results = db.exec(
    `SELECT * FROM tickets WHERE userId = '${userId.replace(/'/g, "''")}' ORDER BY createdAt DESC`
  )
  if (results.length === 0) return []
  
  return results[0].values.map(rowToTicket)
}

export default db
