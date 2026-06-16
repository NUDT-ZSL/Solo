import type { TeamMember, Task, TaskStatus } from '../utils/types';

const BASE_URL = '/api';

export async function getTeam(signal?: AbortSignal): Promise<TeamMember[]> {
  const res = await fetch(`${BASE_URL}/team`, { signal });
  if (!res.ok) throw new Error('Failed to fetch team');
  return res.json();
}

export async function likeMember(id: string, signal?: AbortSignal): Promise<{ likes: number }> {
  const res = await fetch(`${BASE_URL}/team/${id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
  if (!res.ok) throw new Error('Failed to like member');
  return res.json();
}

export async function getTasks(signal?: AbortSignal): Promise<Task[]> {
  const res = await fetch(`${BASE_URL}/tasks`, { signal });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  signal?: AbortSignal
): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    signal,
  });
  if (!res.ok) throw new Error('Failed to update task status');
  return res.json();
}

export async function claimTask(
  id: string,
  assigneeId: string,
  signal?: AbortSignal
): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assigneeId }),
    signal,
  });
  if (!res.ok) throw new Error('Failed to claim task');
  return res.json();
}

export interface TrendData {
  memberId: string;
  dailyContributions: number[];
  labels: string[];
}

export async function getMemberTrend(
  id: string,
  signal?: AbortSignal
): Promise<TrendData> {
  const res = await fetch(`${BASE_URL}/team/${id}/trend`, { signal });
  if (!res.ok) throw new Error('Failed to fetch member trend');
  return res.json();
}
