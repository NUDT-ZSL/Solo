import type { Plant, CareType, NeedCareItem } from './types';

const API_BASE = '/api';

export async function fetchPlants(): Promise<Plant[]> {
  const res = await fetch(`${API_BASE}/plants`);
  return res.json();
}

export async function fetchPlant(id: string): Promise<Plant> {
  const res = await fetch(`${API_BASE}/plants/${id}`);
  return res.json();
}

export async function updatePlant(id: string, data: Partial<Plant>): Promise<Plant> {
  const res = await fetch(`${API_BASE}/plants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addCareRecord(
  id: string,
  type: CareType,
  operator = '主人',
): Promise<Plant> {
  const res = await fetch(`${API_BASE}/plants/${id}/care`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, operator }),
  });
  return res.json();
}

export async function fetchNeedCare(): Promise<NeedCareItem[]> {
  const res = await fetch(`${API_BASE}/plants/need-care`);
  return res.json();
}
