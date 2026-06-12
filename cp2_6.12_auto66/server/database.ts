import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

export function initDatabase() {
  const dbPath = path.join(process.cwd(), 'data.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      song_name TEXT NOT NULL,
      artist TEXT NOT NULL,
      submitter TEXT NOT NULL,
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 4,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      vote_type TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proposal_id, session_id),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_proposals_upvotes ON proposals(upvotes DESC);
    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
  `);

  console.log('📊 数据库初始化完成');

  const count = db.prepare('SELECT COUNT(*) as count FROM proposals').get() as { count: number };
  if (count.count === 0) {
    seedData();
  }

  return db;
}

function seedData() {
  const sampleProposals = [
    { id: '1', song_name: 'Bohemian Rhapsody', artist: 'Queen', submitter: '音乐狂人', upvotes: 42, downvotes: 3 },
    { id: '2', song_name: 'Hotel California', artist: 'Eagles', submitter: '摇滚爱好者', upvotes: 38, downvotes: 5 },
    { id: '3', song_name: 'Stairway to Heaven', artist: 'Led Zeppelin', submitter: '吉他少年', upvotes: 35, downvotes: 2 },
    { id: '4', song_name: 'Imagine', artist: 'John Lennon', submitter: '和平鸽', upvotes: 28, downvotes: 4 },
    { id: '5', song_name: 'Smells Like Teen Spirit', artist: 'Nirvana', submitter: '朋克青年', upvotes: 22, downvotes: 8 },
    { id: '6', song_name: 'Billie Jean', artist: 'Michael Jackson', submitter: '舞王粉丝', upvotes: 30, downvotes: 3 },
  ];

  const insert = db.prepare(`
    INSERT INTO proposals (id, song_name, artist, submitter, upvotes, downvotes, duration)
    VALUES (?, ?, ?, ?, ?, ?, 4)
  `);

  const transaction = db.transaction((proposals: typeof sampleProposals) => {
    for (const p of proposals) {
      insert.run(p.id, p.song_name, p.artist, p.submitter, p.upvotes, p.downvotes);
    }
  });

  transaction(sampleProposals);
  console.log('🌱 已插入示例数据');
}

export function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

export default db;
