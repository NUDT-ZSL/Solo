import axios from 'axios';
import type { Capsule, CreateCapsuleDto } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function createCapsule(data: CreateCapsuleDto): Promise<Capsule> {
  const response = await api.post<Capsule>('/capsules', data);
  return response.data;
}

export async function getCapsules(): Promise<Capsule[]> {
  const response = await api.get<Capsule[]>('/capsules');
  return response.data;
}

export async function getCapsuleById(id: string): Promise<Capsule> {
  const response = await api.get<Capsule>(`/capsules/${id}`);
  return response.data;
}

export async function openCapsule(id: string): Promise<Capsule> {
  const response = await api.put<Capsule>(`/capsules/${id}/open`);
  return response.data;
}

export function getCapsuleStatus(capsule: Capsule): 'locked' | 'unlocked' | 'expired' {
  const now = Date.now();
  const unlockTime = new Date(capsule.unlockDate).getTime();

  if (now < unlockTime) {
    return 'locked';
  }

  if (capsule.openedAt) {
    const openedTime = new Date(capsule.openedAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (now - openedTime >= twentyFourHours) {
      return 'expired';
    }
  }

  return 'unlocked';
}

export function formatCountdown(targetDate: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}
