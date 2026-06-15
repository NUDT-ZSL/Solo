import axios from 'axios';
import type { SessionSummary, FlashSession } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export async function getSessions(): Promise<SessionSummary[]> {
  const response = await api.get<SessionSummary[]>('/sessions');
  return response.data;
}

export async function getSessionDetail(id: string): Promise<FlashSession> {
  const response = await api.get<FlashSession>(`/sessions/${id}`);
  return response.data;
}
