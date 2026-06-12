import { io, Socket } from 'socket.io-client';
import type { Room, City } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export async function createRoom(userId: string, userName: string): Promise<Room> {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, userName }),
  });
  if (!response.ok) {
    throw new Error('Failed to create room');
  }
  return response.json();
}

export async function getRoom(roomCode: string): Promise<Room> {
  const response = await fetch(`/api/rooms/${roomCode}`);
  if (!response.ok) {
    throw new Error('Room not found');
  }
  return response.json();
}

export async function searchCities(query: string): Promise<City[]> {
  const response = await fetch(`/api/cities/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return response.json();
}

export function joinRoom(roomCode: string, userId: string, userName: string): void {
  const s = getSocket();
  s.emit('join-room', { roomCode, userId, userName });
}

export function addCity(cityId: string): void {
  const s = getSocket();
  s.emit('add-city', { cityId });
}

export function removeCity(cityId: string): void {
  const s = getSocket();
  s.emit('remove-city', { cityId });
}

export function startVoting(): void {
  const s = getSocket();
  s.emit('start-voting');
}

export function submitVote(cityId: string, vote: 'yes' | 'no'): void {
  const s = getSocket();
  s.emit('vote', { cityId, vote });
}

export function endVoting(): void {
  const s = getSocket();
  s.emit('end-voting');
}

export function reorderAttractions(cityId: string, attractionIds: string[]): void {
  const s = getSocket();
  s.emit('reorder-attractions', { cityId, attractionIds });
}

export function addAttraction(cityId: string, attraction: { name: string; description?: string; source?: string }): void {
  const s = getSocket();
  s.emit('add-attraction', { cityId, attraction });
}

export function removeAttraction(cityId: string, attractionId: string): void {
  const s = getSocket();
  s.emit('remove-attraction', { cityId, attractionId });
}

export function resetToSearch(): void {
  const s = getSocket();
  s.emit('reset-to-search');
}

export function generateUserId(): string {
  const stored = localStorage.getItem('travelsage_userId');
  if (stored) return stored;
  const newId = 'user_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('travelsage_userId', newId);
  return newId;
}

export function getUserName(): string {
  const stored = localStorage.getItem('travelsage_userName');
  if (stored) return stored;
  const defaultName = '旅行者' + Math.floor(Math.random() * 1000);
  localStorage.setItem('travelsage_userName', defaultName);
  return defaultName;
}

export function setUserName(name: string): void {
  localStorage.setItem('travelsage_userName', name);
}
