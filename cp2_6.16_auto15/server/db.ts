import sqlite3 from 'sqlite3'

export class DatabaseManager {
  private db: sqlite3.Database | null = null

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('./rehearsal.db', (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async init(): Promise<void> {
    if (!this.db) throw new Error('Database not open')
    
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        instrument TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    const createEnsembleRecordsTable = `
      CREATE TABLE IF NOT EXISTS ensemble_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        total_duration INTEGER NOT NULL,
        instrument_activity TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `

    await new Promise<void>((resolve, reject) => {
      this.db!.exec(createSessionsTable, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    await new Promise<void>((resolve, reject) => {
      this.db!.exec(createEnsembleRecordsTable, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async createSession(id: string, instrument: string): Promise<void> {
    if (!this.db) throw new Error('Database not open')
    
    return new Promise((resolve, reject) => {
      const stmt = this.db!.prepare('INSERT INTO sessions (id, instrument) VALUES (?, ?)')
      stmt.run(id, instrument, (err) => {
        if (err) reject(err)
        else resolve()
      })
      stmt.finalize()
    })
  }

  async saveEnsembleRecord(sessionId: string, mode: string, totalDuration: number, instrumentActivity: string): Promise<number> {
    if (!this.db) throw new Error('Database not open')
    
    return new Promise((resolve, reject) => {
      const stmt = this.db!.prepare(
        'INSERT INTO ensemble_records (session_id, mode, total_duration, instrument_activity) VALUES (?, ?, ?, ?)'
      )
      stmt.run(sessionId, mode, totalDuration, instrumentActivity, function(err) {
        if (err) reject(err)
        else resolve(this.lastID)
      })
      stmt.finalize()
    })
  }

  async getEnsembleRecords(sessionId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not open')
    
    return new Promise((resolve, reject) => {
      this.db!.all(
        'SELECT * FROM ensemble_records WHERE session_id = ? ORDER BY created_at DESC',
        [sessionId],
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        }
      )
    })
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
