import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Proposal {
  id: string;
  song_name: string;
  artist: string;
  submitter: string;
  upvotes: number;
  downvotes: number;
  duration: number;
  created_at: string;
}

export function getAllProposals(sessionId?: string): (Proposal & { userVote?: string | null })[] {
  const db = getDb();

  if (sessionId) {
    const query = `
      SELECT p.*, v.vote_type as user_vote
      FROM proposals p
      LEFT JOIN votes v ON p.id = v.proposal_id AND v.session_id = ?
      ORDER BY p.upvotes DESC
    `;
    const rows = db.prepare(query).all(sessionId) as any[];
    return rows.map(row => ({
      id: row.id,
      song_name: row.song_name,
      artist: row.artist,
      submitter: row.submitter,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      duration: row.duration,
      created_at: row.created_at,
      userVote: row.user_vote || null,
    }));
  }

  const rows = db.prepare('SELECT * FROM proposals ORDER BY upvotes DESC').all() as Proposal[];
  return rows;
}

export function createProposal(songName: string, artist: string, submitter: string): Proposal {
  const db = getDb();
  const id = uuidv4();

  const result = db.prepare(`
    INSERT INTO proposals (id, song_name, artist, submitter, upvotes, downvotes, duration)
    VALUES (?, ?, ?, 0, 0, 4)
  `).run(id, songName, artist, submitter);

  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as Proposal;
  return proposal;
}

export function getProposalById(id: string): Proposal | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as Proposal | undefined;
}

export function getTopProposals(limit: number = 10): Proposal[] {
  const db = getDb();
  return db.prepare('SELECT * FROM proposals ORDER BY upvotes DESC LIMIT ?').all(limit) as Proposal[];
}

export function updateVoteCount(proposalId: string, upvotes: number, downvotes: number) {
  const db = getDb();
  db.prepare('UPDATE proposals SET upvotes = ?, downvotes = ? WHERE id = ?').run(upvotes, downvotes, proposalId);
}

export function getResults(): Proposal[] {
  const db = getDb();
  return db.prepare('SELECT * FROM proposals ORDER BY upvotes DESC').all() as Proposal[];
}
