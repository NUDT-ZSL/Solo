import { ScoreData, VersionRecord } from './types';

const API_BASE = '/api';

export async function saveScore(data: ScoreData): Promise<{ version: number }> {
  const res = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save score');
  return res.json();
}

export async function loadScore(id: string): Promise<ScoreData> {
  const res = await fetch(`${API_BASE}/scores/${id}`);
  if (!res.ok) throw new Error('Failed to load score');
  return res.json();
}

export async function getVersions(id: string): Promise<VersionRecord[]> {
  const res = await fetch(`${API_BASE}/scores/${id}/versions`);
  if (!res.ok) throw new Error('Failed to get versions');
  return res.json();
}

export async function getVersion(id: string, version: number): Promise<VersionRecord> {
  const res = await fetch(`${API_BASE}/scores/${id}/versions/${version}`);
  if (!res.ok) throw new Error('Failed to get version');
  return res.json();
}

export async function listScores(): Promise<ScoreData[]> {
  const res = await fetch(`${API_BASE}/scores`);
  if (!res.ok) throw new Error('Failed to list scores');
  return res.json();
}
