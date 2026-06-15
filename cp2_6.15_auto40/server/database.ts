import Database from 'better-sqlite3';
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
  private db: Database.Database;

  constructor() {
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        score INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_scores_difficulty_score ON scores(difficulty, score DESC);
      CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
    `);
  }

  insertScore(nickname: string, score: number, difficulty: string): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO scores (nickname, score, difficulty)
        VALUES (?, ?, ?)
      `);
      const result = stmt.run(nickname, score, difficulty);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to insert score:', error);
      return false;
    }
  }

  getTopScores(difficulty?: string, limit: number = 20): TopScoreEntry[] {
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

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as {
      nickname: string;
      score: number;
      difficulty: string;
      created_at: string;
    }[];

    return rows.map((row, index) => ({
      rank: index + 1,
      nickname: row.nickname,
      score: row.score,
      difficulty: row.difficulty,
      date: row.created_at,
    }));
  }
}

const dbManager = new DatabaseManager();
export default dbManager;
