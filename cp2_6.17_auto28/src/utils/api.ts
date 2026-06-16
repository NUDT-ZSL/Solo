export interface BuildingParams {
  id: string;
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  color: string;
}

export interface SessionRecord {
  id: string;
  buildingId: string;
  month: number;
  day: number;
  hour: number;
  timestamp: string;
}

const API_BASE = '/api';

export async function fetchBuildings(): Promise<BuildingParams[]> {
  const res = await fetch(`${API_BASE}/buildings`);
  if (!res.ok) throw new Error('Failed to fetch buildings');
  return res.json();
}

export async function saveSession(record: Omit<SessionRecord, 'id' | 'timestamp'>): Promise<SessionRecord> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Failed to save session');
  return res.json();
}

export async function fetchSessions(): Promise<SessionRecord[]> {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}
