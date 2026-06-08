import axios from 'axios';
import type { Card } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export async function fetchCards(): Promise<Card[]> {
  const res = await api.get<Card[]>('/cards');
  return res.data;
}

export async function createCard(data: {
  title: string;
  description: string;
  color: string;
}): Promise<Card> {
  const res = await api.post<Card>('/cards', data);
  return res.data;
}

export async function voteCard(
  cardId: string,
  type: 'up' | 'down'
): Promise<Card> {
  const res = await api.post<Card>(`/cards/${cardId}/vote`, { type });
  return res.data;
}
