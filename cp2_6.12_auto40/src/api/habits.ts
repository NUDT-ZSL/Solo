import type { Habit, HabitProgress, StatsResponse, CheckIn } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchHabits(): Promise<HabitProgress[]> {
  return request<HabitProgress[]>('/habits');
}

export function createHabit(habit: Omit<Habit, 'id' | 'createdAt'>): Promise<Habit> {
  return request<Habit>('/habits', {
    method: 'POST',
    body: JSON.stringify(habit)
  });
}

export function deleteHabit(id: string): Promise<void> {
  return request<void>(`/habits/${id}`, { method: 'DELETE' });
}

export function checkIn(habitId: string, value: number): Promise<CheckIn> {
  return request<CheckIn>(`/habits/${habitId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ value })
  });
}

export function getStats(range: 'weekly' | 'monthly' | 'quarterly' = 'weekly'): Promise<StatsResponse> {
  return request<StatsResponse>(`/stats?range=${range}`);
}
