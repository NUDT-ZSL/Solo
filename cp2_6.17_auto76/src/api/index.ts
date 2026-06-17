import { Member, ScoreRecord } from '@/utils/dataHelper';

const BASE = '/api';

export async function fetchMembers(): Promise<Member[]> {
  const res = await fetch(`${BASE}/members`);
  return res.json();
}

export async function fetchMemberScores(memberId: string): Promise<ScoreRecord[]> {
  const res = await fetch(`${BASE}/members/${memberId}/scores`);
  return res.json();
}

export async function fetchScores(params?: { from?: string; to?: string; songs?: string[] }): Promise<ScoreRecord[]> {
  const sp = new URLSearchParams();
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.songs && params.songs.length > 0) sp.set('songs', params.songs.join(','));
  const qs = sp.toString();
  const url = qs ? `${BASE}/scores?${qs}` : `${BASE}/scores`;
  const res = await fetch(url);
  return res.json();
}

export async function createScore(score: Omit<ScoreRecord, 'id'>): Promise<ScoreRecord> {
  const res = await fetch(`${BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(score),
  });
  return res.json();
}

export async function createMember(data: { name: string; voicePart: string }): Promise<Member> {
  const res = await fetch(`${BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
