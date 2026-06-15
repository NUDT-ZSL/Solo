import { getDb, saveDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Proposal {
  id: string;
  songName: string;
  artist: string;
  submitter: string;
  upvotes: number;
  downvotes: number;
  duration: number;
  createdAt: string;
}

function mapRowToProposal(row: any[]): Proposal {
  return {
    id: row[0] as string,
    songName: row[1] as string,
    artist: row[2] as string,
    submitter: row[3] as string,
    upvotes: row[4] as number,
    downvotes: row[5] as number,
    duration: row[6] as number,
    createdAt: row[7] as string,
  };
}

export function getAllProposals(voterId?: string): (Proposal & { userVote?: string | null })[] {
  const db = getDb();

  if (voterId) {
    const query = `
      SELECT p.*, v.voteType as user_vote
      FROM proposals p
      LEFT JOIN votes v ON p.id = v.proposalId AND v.voterId = ?
      ORDER BY p.upvotes DESC
    `;
    const stmt = db.prepare(query);
    stmt.bind([voterId]);
    const results: (Proposal & { userVote?: string | null })[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push({
        id: row.id,
        songName: row.songName,
        artist: row.artist,
        submitter: row.submitter,
        upvotes: row.upvotes,
        downvotes: row.downvotes,
        duration: row.duration,
        createdAt: row.createdAt,
        userVote: row.user_vote || null,
      });
    }
    stmt.free();
    return results;
  }

  const result = db.exec('SELECT * FROM proposals ORDER BY upvotes DESC');
  if (result.length === 0) return [];

  return result[0].values.map(row => mapRowToProposal(row));
}

export function createProposal(songName: string, artist: string, submitter: string): Proposal {
  const db = getDb();
  const id = uuidv4();

  const stmt = db.prepare(
    'INSERT INTO proposals (id, songName, artist, submitter, upvotes, downvotes, duration, createdAt) VALUES (?, ?, ?, 0, 0, 4, CURRENT_TIMESTAMP)'
  );
  stmt.run([id, songName, artist, submitter]);
  stmt.free();

  saveDb();

  return getProposalById(id)!;
}

export function getProposalById(id: string): Proposal | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM proposals WHERE id = ?');
  stmt.bind([id]);

  let proposal: Proposal | undefined;

  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    proposal = {
      id: row.id,
      songName: row.songName,
      artist: row.artist,
      submitter: row.submitter,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      duration: row.duration,
      createdAt: row.createdAt,
    };
  }
  stmt.free();
  return proposal;
}

export function getTopProposals(limit: number = 10): Proposal[] {
  const db = getDb();
  const result = db.exec(`SELECT * FROM proposals ORDER BY upvotes DESC LIMIT ${limit}`);
  if (result.length === 0) return [];
  return result[0].values.map(row => mapRowToProposal(row));
}

export function updateVoteCount(proposalId: string, upvotes: number, downvotes: number) {
  const db = getDb();
  const stmt = db.prepare('UPDATE proposals SET upvotes = ?, downvotes = ? WHERE id = ?');
  stmt.run([upvotes, downvotes, proposalId]);
  stmt.free();
  saveDb();
}

export function getResults(): Proposal[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM proposals ORDER BY upvotes DESC');
  if (result.length === 0) return [];
  return result[0].values.map(row => mapRowToProposal(row));
}
