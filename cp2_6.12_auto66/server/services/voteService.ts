import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { getProposalById, updateVoteCount } from './proposalService';

export interface VoteResult {
  upvotes: number;
  downvotes: number;
  userVote: string | null;
}

export function handleVote(proposalId: string, voteType: 'up' | 'down', sessionId: string): VoteResult {
  const db = getDb();

  const proposal = getProposalById(proposalId);
  if (!proposal) {
    throw new Error('提案不存在');
  }

  const existingVote = db.prepare(
    'SELECT * FROM votes WHERE proposal_id = ? AND session_id = ?'
  ).get(proposalId, sessionId) as any;

  let upvotes = proposal.upvotes;
  let downvotes = proposal.downvotes;
  let newUserVote: string | null = voteType;

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      db.prepare('DELETE FROM votes WHERE id = ?').run(existingVote.id);
      if (voteType === 'up') {
        upvotes--;
      } else {
        downvotes--;
      }
      newUserVote = null;
    } else {
      db.prepare('UPDATE votes SET vote_type = ? WHERE id = ?').run(voteType, existingVote.id);
      if (voteType === 'up') {
        upvotes++;
        downvotes--;
      } else {
        downvotes++;
        upvotes--;
      }
    }
  } else {
    const voteId = uuidv4();
    db.prepare(
      'INSERT INTO votes (id, proposal_id, vote_type, session_id) VALUES (?, ?, ?, ?)'
    ).run(voteId, proposalId, voteType, sessionId);
    if (voteType === 'up') {
      upvotes++;
    } else {
      downvotes++;
    }
  }

  updateVoteCount(proposalId, upvotes, downvotes);

  return {
    upvotes,
    downvotes,
    userVote: newUserVote,
  };
}

export function getVotesByProposal(proposalId: string): { upvotes: number; downvotes: number } {
  const db = getDb();
  const result = db.prepare(`
    SELECT
      SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) as upvotes,
      SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) as downvotes
    FROM votes
    WHERE proposal_id = ?
  `).get(proposalId) as any;

  return {
    upvotes: result.upvotes || 0,
    downvotes: result.downvotes || 0,
  };
}

export function getUserVote(proposalId: string, sessionId: string): string | null {
  const db = getDb();
  const vote = db.prepare(
    'SELECT vote_type FROM votes WHERE proposal_id = ? AND session_id = ?'
  ).get(proposalId, sessionId) as any;

  return vote ? vote.vote_type : null;
}
