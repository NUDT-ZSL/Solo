import Datastore from 'nedb-promises';
import path from 'path';

export interface ScoreRecord {
  _id?: string;
  playerName: string;
  time: number;
  createdAt: Date;
}

const dbPath = path.join(__dirname, '..', '..', 'data', 'scores.db');
const db = Datastore.create(dbPath);

export async function addScore(playerName: string, time: number): Promise<ScoreRecord> {
  const record: ScoreRecord = {
    playerName,
    time,
    createdAt: new Date()
  };
  
  const result = await db.insert(record);
  return result as ScoreRecord;
}

export async function getTopScores(limit: number = 100): Promise<ScoreRecord[]> {
  const scores = await db
    .find({})
    .sort({ time: 1 })
    .limit(limit);
  
  return scores as ScoreRecord[];
}

export async function getBestScore(playerName: string): Promise<ScoreRecord | null> {
  const scores = await db
    .find({ playerName })
    .sort({ time: 1 })
    .limit(1);
  
  return scores.length > 0 ? (scores[0] as ScoreRecord) : null;
}

export { db };
