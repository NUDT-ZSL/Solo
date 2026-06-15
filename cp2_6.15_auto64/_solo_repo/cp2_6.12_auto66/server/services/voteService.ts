import { getDb, saveDb, isVotingLockedStatus } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { getProposalById, updateVoteCount } from './proposalService';

export interface VoteResult {
  upvotes: number;
  downvotes: number;
  userVote: string | null;
  message?: string;
}

export function handleVote(proposalId: string, voteType: 'up' | 'down', voterId: string): VoteResult {
  if (isVotingLockedStatus()) {
    return {
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      message: '投票已锁定',
    };
  }

  const db = getDb();

  const proposal = getProposalById(proposalId);
  if (!proposal) {
    throw new Error('提案不存在');
  }

  const checkStmt = db.prepare('SELECT * FROM votes WHERE proposalId = ? AND voterId = ?');
  checkStmt.bind([proposalId, voterId]);

  let existingVote: any = null;
  if (checkStmt.step()) {
    existingVote = checkStmt.getAsObject();
  }
  checkStmt.free();

  let upvotes = proposal.upvotes;
  let downvotes = proposal.downvotes;
  let newUserVote: string | null = voteType;

  if (existingVote) {
    if (existingVote.voteType === voteType) {
      const deleteStmt = db.prepare('DELETE FROM votes WHERE id = ?');
      deleteStmt.run([existingVote.id]);
      deleteStmt.free();

      if (voteType === 'up') {
        upvotes = Math.max(0, upvotes - 1);
      } else {
        downvotes = Math.max(0, downvotes - 1);
      }
      newUserVote = null;
    } else {
      const updateStmt = db.prepare('UPDATE votes SET voteType = ? WHERE id = ?');
      updateStmt.run([voteType, existingVote.id]);
      updateStmt.free();

      if (voteType === 'up') {
        upvotes = upvotes + 1;
        downvotes = Math.max(0, downvotes - 1);
      } else {
        downvotes = downvotes + 1;
        upvotes = Math.max(0, upvotes - 1);
      }
    }
  } else {
    const voteId = uuidv4();
    const insertStmt = db.prepare(
      'INSERT INTO votes (id, proposalId, voterId, voteType, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
    );
    insertStmt.run([voteId, proposalId, voterId, voteType]);
    insertStmt.free();

    if (voteType === 'up') {
      upvotes = upvotes + 1;
    } else {
      downvotes = downvotes + 1;
    }
  }

  updateVoteCount(proposalId, upvotes, downvotes);
  saveDb();

  return {
    upvotes,
    downvotes,
    userVote: newUserVote,
  };
}

export function recalculateVoteCounts(proposalId: string): { upvotes: number; downvotes: number } {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      SUM(CASE WHEN voteType = 'up' THEN 1 ELSE 0 END) as upvotes,
      SUM(CASE WHEN voteType = 'down' THEN 1 ELSE 0 END) as downvotes
    FROM votes
    WHERE proposalId = ?
  `);
  stmt.bind([proposalId]);

  let upvotes = 0;
  let downvotes = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    upvotes = row.upvotes || 0;
    downvotes = row.downvotes || 0;
  }
  stmt.free();

  updateVoteCount(proposalId, upvotes, downvotes);
  saveDb();

  return { upvotes, downvotes };
}

export function getVotesByProposal(proposalId: string): { upvotes: number; downvotes: number } {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      SUM(CASE WHEN voteType = 'up' THEN 1 ELSE 0 END) as upvotes,
      SUM(CASE WHEN voteType = 'down' THEN 1 ELSE 0 END) as downvotes
    FROM votes
    WHERE proposalId = ?
  `);
  stmt.bind([proposalId]);

  let result = { upvotes: 0, downvotes: 0 };
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result = {
      upvotes: row.upvotes || 0,
      downvotes: row.downvotes || 0,
    };
  }
  stmt.free();

  return result;
}

export function getUserVote(proposalId: string, voterId: string): string | null {
  const db = getDb();
  const stmt = db.prepare('SELECT voteType FROM votes WHERE proposalId = ? AND voterId = ?');
  stmt.bind([proposalId, voterId]);

  let voteType: string | null = null;
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    voteType = row.voteType;
  }
  stmt.free();

  return voteType;
}
