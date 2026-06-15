import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
let SQL: any = null;
let isVotingLocked = false;

export async function initDatabase() {
  if (db) return db;

  try {
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });
  } catch (err) {
    console.error('❌ sql.js 初始化失败:', err);
    try {
      const sqlJsPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist');
      SQL = await initSqlJs({
        locateFile: (file: string) => path.join(sqlJsPath, file).replace(/\\/g, '/'),
      });
    } catch (fallbackErr) {
      console.error('❌ sql.js 本地加载也失败:', fallbackErr);
      throw new Error('无法初始化 sql.js，请检查依赖安装');
    }
  }

  const dbPath = path.join(process.cwd(), 'data.db');
  let dbData: Uint8Array | null = null;

  try {
    if (fs.existsSync(dbPath)) {
      dbData = new Uint8Array(fs.readFileSync(dbPath));
    }
  } catch (err) {
    console.warn('⚠️ 读取现有数据库文件失败，将创建新数据库:', err);
    dbData = null;
  }

  try {
    db = new SQL.Database(dbData);
  } catch (err) {
    console.error('❌ 创建数据库实例失败:', err);
    throw new Error('无法创建数据库实例');
  }

  try {
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
  } catch (err) {
    console.error('❌ 创建表失败:', err);
    throw new Error('数据库表创建失败');
  }

  console.log('📊 数据库初始化完成');

  try {
    const countResult = db.exec('SELECT COUNT(*) as count FROM proposals');
    const count = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;
    if (count === 0) {
      seedData();
    }
  } catch (err) {
    console.warn('⚠️ 检查数据失败，尝试插入种子数据:', err);
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

  try {
    const stmt = db.prepare(
      'INSERT INTO proposals (id, songName, artist, submitter, upvotes, downvotes, duration, createdAt) VALUES (?, ?, ?, ?, ?, ?, 4, CURRENT_TIMESTAMP)'
    );

    for (const p of sampleProposals) {
      try {
        stmt.run([p.id, p.songName, p.artist, p.submitter, p.upvotes, p.downvotes]);
      } catch (rowErr) {
        console.warn(`⚠️ 插入种子数据失败 (${p.songName}):`, rowErr);
      }
    }
    stmt.free();
    console.log('🌱 已插入示例数据');
  } catch (err) {
    console.error('❌ 种子数据插入失败:', err);
  }
}

function saveDatabase() {
  if (!db) return;
  try {
    const dbPath = path.join(process.cwd(), 'data.db');
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error('❌ 保存数据库文件失败:', err);
  }
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
