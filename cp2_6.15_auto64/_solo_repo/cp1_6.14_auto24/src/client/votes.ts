import axios from 'axios';
import { Book } from './books';

export interface VoteResultItem {
  book: Book;
  count: number;
  percent: number;
}

export interface VoteResult {
  vote: { _id: string; title: string; endsAt: number };
  result: VoteResultItem[];
  total: number;
}

export interface ActiveVote {
  _id: string;
  title: string;
  bookIds: string[];
  books: Book[];
  counts: Record<string, number>;
  result: VoteResultItem[];
  total: number;
  endsAt: number;
  createdAt: number;
  closed: boolean;
  userVoteMap: Record<string, string>;
}

export const getActiveVote = async (): Promise<ActiveVote | null> => {
  const res = await axios.get('/api/votes/active');
  return res.data;
};

export const createVote = async (
  title: string,
  bookIds: string[],
  userId: string,
  username: string,
  avatar: string
): Promise<{ _id: string }> => {
  const res = await axios.post('/api/votes', { title, bookIds, userId, username, avatar });
  return res.data;
};

export const castVote = async (voteId: string, userId: string, bookId: string): Promise<void> => {
  await axios.post(`/api/votes/${voteId}/vote`, { userId, bookId });
};

export const getVoteResult = async (id: string): Promise<VoteResult> => {
  const res = await axios.get(`/api/votes/${id}/result`);
  return res.data;
};
