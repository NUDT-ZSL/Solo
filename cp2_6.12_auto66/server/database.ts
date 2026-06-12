import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
let SQL: any = null;
let isVotingLocked = false;

export async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });

  const dbPath = path.join(process.cwd(), 'data.db');
  let dbData: Uint8Array | null = null;

  if (fs.existsSync(dbPath)) {
    dbData = new Uint8Array(fs.readFileSync(dbPath));
  }

  db = new SQL.Database(dbData);

  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      songName TEXT NOT NULL,
      artist TEXT NOT NULL,
      submitter TEXT NOT NULL,
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 4,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      proposalId TEXT NOT NULL,
      voterId TEXT NOT NULL,
      voteType TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proposalId, voterId),
      FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_proposals_upvotes ON proposals(upvotes DESC);
    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposalId);
  `);

  console.log('📊 数据库初始化完成');

  const count = db.exec('SELECT COUNT(*) as count FROM proposals')[0].values[0][0] as number;
  if (count === 0) {
    seedData();
  }

  saveDatabase();

  return db;
}

function seedData() {
  if (!db) return;

  const sampleProposals = [
    { id: '1', songName: 'Bohemian Rhapsody', artist: 'Queen', submitter: '音乐狂人', upvotes: 42, downvotes: 3 },
    { id: '2', songName: 'Hotel California', artist: 'Eagles', submitter: '摇滚爱好者', upvotes: 38, downvotes: 5 },
    { id: '3', songName: 'Stairway to Heaven', artist: 'Led Zeppelin', submitter: '吉他少年', upvotes: 35, downvotes: 2 },
    { id: '4', songName: 'Imagine', artist: 'John Lennon', submitter: '和平鸽', upvotes: 28, downvotes: 4 },
    { id: '5', songName: 'Smells Like Teen Spirit', artist: 'Nirvana', submitter: '朋克青年', upvotes: 22, downvotes: 8 },
    { id: '6', songName: 'Billie Jean', artist: 'Michael Jackson', submitter: '舞王粉丝', upvotes: 30, downvotes: 3 },
  ];

  const stmt = db.prepare(
    'INSERT INTO proposals (id, songName, artist, submitter, upvotes, downvotes, duration, createdAt) VALUES (?, ?, ?, ?, ?, ?, 4, CURRENT_TIMESTAMP)'
  );

  for (const p of sampleProposals) {
    stmt.run([p.id, p.songName, p.artist, p.submitter, p.upvotes, p.downvotes]);
  }

  stmt.free();
  console.log('🌱 已插入示例数据');
}

function saveDatabase() {
  if (!db) return;
  const dbPath = path.join(process.cwd(), 'data.db');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

export function saveDb() {
  saveDatabase();
}

export function setVotingLocked(locked: boolean) {
  isVotingLocked = locked;
}

export function isVotingLockedStatus() {
  return isVotingLocked;
}

export default db;
