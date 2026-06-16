import axios from 'axios';
import type { Paper, Reviewer, ReviewScore, ConflictFlag, SummaryItem } from './business/ReviewMatch';

const api = axios.create({ baseURL: '/api' });

export async function fetchPapers(): Promise<Paper[]> {
  const res = await api.get<Paper[]>('/papers');
  return res.data;
}

export async function createPaper(data: {
  title: string;
  abstract: string;
  keywords: string[];
  authors: string[];
}): Promise<Paper> {
  const res = await api.post<Paper>('/papers', data);
  return res.data;
}

export async function assignReviewers(paperId: string, reviewerIds: string[]): Promise<Paper> {
  const res = await api.put<Paper>(`/papers/${paperId}/assign`, { reviewerIds });
  return res.data;
}

export async function batchAssign(assignments: { paperId: string; reviewerIds: string[] }[]): Promise<Paper[]> {
  const res = await api.post<Paper[]>('/papers/batch-assign', { assignments });
  return res.data;
}

export async function fetchReviewers(): Promise<Reviewer[]> {
  const res = await api.get<Reviewer[]>('/reviewers');
  return res.data;
}

export async function createReviewer(data: {
  name: string;
  email: string;
  expertise: string[];
}): Promise<Reviewer> {
  const res = await api.post<Reviewer>('/reviewers', data);
  return res.data;
}

export async function fetchReviewerPapers(reviewerId: string): Promise<Paper[]> {
  const res = await api.get<Paper[]>(`/reviewers/${reviewerId}/papers`);
  return res.data;
}

export async function fetchScores(): Promise<ReviewScore[]> {
  const res = await api.get<ReviewScore[]>('/scores');
  return res.data;
}

export async function fetchPaperScores(paperId: string): Promise<ReviewScore[]> {
  const res = await api.get<ReviewScore[]>(`/scores/paper/${paperId}`);
  return res.data;
}

export async function submitScore(data: {
  paperId: string;
  reviewerId: string;
  scores: ReviewScore['scores'];
  comment: string;
}): Promise<ReviewScore> {
  const res = await api.post<ReviewScore>('/scores', data);
  return res.data;
}

export async function arbitrateScore(scoreId: string, arbitratedScores: ReviewScore['scores']): Promise<ReviewScore> {
  const res = await api.put<ReviewScore>(`/scores/${scoreId}/arbitrate`, { arbitratedScores });
  return res.data;
}

export async function fetchConflicts(): Promise<ConflictFlag[]> {
  const res = await api.get<ConflictFlag[]>('/conflicts');
  return res.data;
}

export async function fetchPaperConflicts(paperId: string): Promise<ConflictFlag[]> {
  const res = await api.get<ConflictFlag[]>(`/conflicts/paper/${paperId}`);
  return res.data;
}

export async function resolveConflict(paperId: string, dimension: string, arbitratedScore: number): Promise<ConflictFlag> {
  const res = await api.put<ConflictFlag>(`/conflicts/${paperId}/${dimension}/resolve`, { arbitratedScore });
  return res.data;
}

export async function fetchSummary(): Promise<SummaryItem[]> {
  const res = await api.get<SummaryItem[]>('/summary');
  return res.data;
}
