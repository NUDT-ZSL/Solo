import axios from 'axios';
import type { User, Activity, Badge } from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function registerUser(name: string, avatarBase64: string): Promise<User> {
  const response = await api.post<User>('/users/register', { name, avatar: avatarBase64 });
  return response.data;
}

export interface CheckInData {
  date: string;
  hours: number;
  description: string;
}

export interface CheckInResponse {
  activity: Activity;
  user: User;
  newBadges: Badge[];
}

export async function checkIn(userId: string, data: CheckInData): Promise<CheckInResponse> {
  const response = await api.post<CheckInResponse>(`/users/${userId}/checkin`, data);
  return response.data;
}

export async function getUser(userId: string): Promise<User> {
  const response = await api.get<User>(`/users/${userId}`);
  return response.data;
}

export interface GetActivitiesResponse {
  activities: Activity[];
  hasMore: boolean;
}

export async function getActivities(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<GetActivitiesResponse> {
  const response = await api.get<GetActivitiesResponse>(`/users/${userId}/activities`, {
    params: { page, limit },
  });
  return response.data;
}

export async function getBadges(userId: string): Promise<Badge[]> {
  const response = await api.get<Badge[]>(`/users/${userId}/badges`);
  return response.data;
}

export async function getUsers(): Promise<User[]> {
  const response = await api.get<User[]>('/users');
  return response.data;
}

export default api;
