import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'pollvault.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    options TEXT NOT NULL,
    deadline INTEGER,
    created_at INTEGER NOT NULL,
    participant_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    rating INTEGER,
    rank_position INTEGER,
    ip_prefix TEXT,
    voted_at INTEGER NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vote_sessions (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL,
    ip_prefix TEXT,
    voted_at INTEGER NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
  CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
`);

export type PollType = 'single' | 'multiple' | 'rating' | 'ranking';

export interface Poll {
  id: string;
  title: string;
  type: PollType;
  options: string[];
  deadline: number | null;
  created_at: number;
  participant_count: number;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_index: number;
  rating: number | null;
  rank_position: number | null;
  ip_prefix: string | null;
  voted_at: number;
}

export interface VoteRecord {
  sessionId: string;
  ip_prefix: string | null;
  voted_at: number;
  votes: { option_index: number; rating?: number; rank_position?: number }[];
}

function getIpPrefix(ip: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}..`;
  }
  return null;
}

export function createPoll(
  title: string,
  type: PollType,
  options: string[],
  deadline: number | null
): Poll {
  const id = uuidv4();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO polls (id, title, type, options, deadline, created_at, participant_count)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);
  stmt.run(id, title, type, JSON.stringify(options), deadline, now);
  return getPoll(id) as Poll;
}

export function getPoll(id: string): Poll | null {
  const stmt = db.prepare('SELECT * FROM polls WHERE id = ?');
  const row = stmt.get(id) as any;
  if (!row) return null;
  return {
    ...row,
    options: JSON.parse(row.options),
    deadline: row.deadline
  };
}

export function getPolls(limit: number = 20, offset: number = 0): Poll[] {
  const stmt = db.prepare(`
    SELECT * FROM polls
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(limit, offset) as any[];
  return rows.map(row => ({
    ...row,
    options: JSON.parse(row.options),
    deadline: row.deadline
  }));
}

export function getPollCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM polls');
  const row = stmt.get() as any;
  return row.count;
}

export function getPollResults(pollId: string): { optionIndex: number; count: number; avgRating?: number }[] {
  const poll = getPoll(pollId);
  if (!poll) return [];

  const results: { optionIndex: number; count: number; avgRating?: number }[] = [];

  if (poll.type === 'rating') {
    const stmt = db.prepare(`
      SELECT option_index, COUNT(*) as count, AVG(rating) as avg_rating
      FROM votes
      WHERE poll_id = ?
      GROUP BY option_index
    `);
    const rows = stmt.all(pollId) as any[];
    for (let i = 0; i < poll.options.length; i++) {
      const row = rows.find(r => r.option_index === i);
      results.push({
        optionIndex: i,
        count: row ? row.count : 0,
        avgRating: row ? row.avg_rating : 0
      });
    }
  } else if (poll.type === 'ranking') {
    const stmt = db.prepare(`
      SELECT option_index, 
             COUNT(*) as count,
             AVG(rank_position) as avg_rank
      FROM votes
      WHERE poll_id = ?
      GROUP BY option_index
      ORDER BY avg_rank ASC
    `);
    const rows = stmt.all(pollId) as any[];
    for (let i = 0; i < poll.options.length; i++) {
      const row = rows.find(r => r.option_index === i);
      results.push({
        optionIndex: i,
        count: row ? row.count : 0
      });
    }
  } else {
    const stmt = db.prepare(`
      SELECT option_index, COUNT(*) as count
      FROM votes
      WHERE poll_id = ?
      GROUP BY option_index
    `);
    const rows = stmt.all(pollId) as any[];
    for (let i = 0; i < poll.options.length; i++) {
      const row = rows.find(r => r.option_index === i);
      results.push({
        optionIndex: i,
        count: row ? row.count : 0
      });
    }
  }

  return results;
}

export function submitVote(
  pollId: string,
  selections: { optionIndex: number; rating?: number; rankPosition?: number }[],
  ip: string | null
): { success: boolean; message?: string } {
  const ipPrefix = getIpPrefix(ip);
  const sessionId = uuidv4();
  const now = Date.now();

  const insertVote = db.prepare(`
    INSERT INTO votes (id, poll_id, option_index, rating, rank_position, ip_prefix, voted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSession = db.prepare(`
    INSERT INTO vote_sessions (id, poll_id, ip_prefix, voted_at)
    VALUES (?, ?, ?, ?)
  `);

  const updateParticipantCount = db.prepare(`
    UPDATE polls SET participant_count = participant_count + 1 WHERE id = ?
  `);

  const getPollForUpdate = db.prepare(`
    SELECT * FROM polls WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    const pollRow = getPollForUpdate.get(pollId) as any;
    if (!pollRow) {
      throw new Error('投票不存在');
    }

    if (pollRow.deadline && now > pollRow.deadline) {
      throw new Error('投票已截止');
    }

    insertSession.run(sessionId, pollId, ipPrefix, now);

    for (const selection of selections) {
      const voteId = uuidv4();
      insertVote.run(
        voteId,
        pollId,
        selection.optionIndex,
        selection.rating || null,
        selection.rankPosition || null,
        ipPrefix,
        now
      );
    }

    updateParticipantCount.run(pollId);
  });

  try {
    transaction();
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || '投票失败' };
  }
}

export function getVoteRecords(pollId: string): VoteRecord[] {
  const sessionsStmt = db.prepare(`
    SELECT id, ip_prefix, voted_at
    FROM vote_sessions
    WHERE poll_id = ?
    ORDER BY voted_at DESC
  `);
  const sessions = sessionsStmt.all(pollId) as any[];

  const votesStmt = db.prepare(`
    SELECT option_index, rating, rank_position
    FROM votes
    WHERE poll_id = ? AND voted_at = ?
  `);

  const records: VoteRecord[] = [];
  for (const session of sessions) {
    const votes = votesStmt.all(pollId, session.voted_at) as any[];
    records.push({
      sessionId: session.id,
      ip_prefix: session.ip_prefix,
      voted_at: session.voted_at,
      votes: votes.map(v => ({
        option_index: v.option_index,
        rating: v.rating || undefined,
        rank_position: v.rank_position || undefined
      }))
    });
  }

  return records;
}

export function exportPollToCSV(pollId: string): string {
  const poll = getPoll(pollId);
  if (!poll) return '';

  const records = getVoteRecords(pollId);
  const results = getPollResults(pollId);

  let csv = '\uFEFF';

  csv += `投票标题: ${poll.title}\n`;
  csv += `投票类型: ${poll.type}\n`;
  csv += `参与人数: ${poll.participant_count}\n\n`;

  csv += '统计结果\n';
  csv += '选项,票数,平均评分\n';
  for (const r of results) {
    csv += `"${poll.options[r.optionIndex]}",${r.count},${r.avgRating?.toFixed(2) || '-'}\n`;
  }
  csv += '\n';

  csv += '投票明细\n';
  csv += '序号,IP段,投票时间,选项,评分,排名\n';
  records.forEach((record, idx) => {
    const time = new Date(record.voted_at).toLocaleString('zh-CN');
    record.votes.forEach((vote) => {
      csv += `${idx + 1},"${record.ip_prefix || '-'}","${time}","${poll.options[vote.option_index]}",${vote.rating || '-'},${vote.rank_position || '-'}\n`;
    });
  });

  return csv;
}

export default db;
