import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data.sqlite');

export interface ScoreRecord {
  id?: number;
  nickname: string;
  score: number;
  difficulty: string;
  created_at?: string;
}

export interface TopScoreEntry {
  rank: number;
  nickname: string;
  score: number;
  difficulty: string;
  date: string;
}

class DatabaseManager {
  private db: Database | null = null;
  private SQL: any = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
    }

    this.db!.run(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        score INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    this.db!.run(`
      CREATE INDEX IF NOT EXISTS idx_scores_difficulty_score ON scores(difficulty, score DESC);
    `);
    this.db!.run(`
      CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
    `);

    this.save();
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }

  async insertScore(nickname: string, score: number, difficulty: string): Promise<boolean> {
    if (!this.db) await this.init();
    
    try {
      this.db!.run(
        `INSERT INTO scores (nickname, score, difficulty) VALUES (?, ?, ?)`,
        [nickname, score, difficulty]
      );
      this.save();
      return true;
    } catch (error) {
      console.error('Failed to insert score:', error);
      return false;
    }
  }

  async getTopScores(difficulty?: string, limit: number = 20): Promise<TopScoreEntry[]> {
    if (!this.db) await this.init();
    
    let query = `
      SELECT nickname, score, difficulty, created_at
      FROM scores
    `;
    const params: (string | number)[] = [];

    if (difficulty) {
      query += ` WHERE difficulty = ?`;
      params.push(difficulty);
    }

    query += ` ORDER BY score DESC, created_at ASC LIMIT ?`;
    params.push(limit);

    const rows = this.db!.exec(query, params)[0]?.values || [];

    return rows.map((row: any, index: number) => ({
      rank: index + 1,
      nickname: row[0],
      score: row[1],
      difficulty: row[2],
      date: row[3],
    }));
  }
}

const dbManager = new DatabaseManager();
export default dbManager;
