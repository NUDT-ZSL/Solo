import axios from 'axios';
import type { TravelLocation, UserProfile } from '../types';
import { mockLocations, mockUser } from '../data/mockData';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

const USE_MOCK = true;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchLocations(): Promise<TravelLocation[]> {
  if (USE_MOCK) {
    await delay(400);
    return mockLocations;
  }
  try {
    const response = await api.get<TravelLocation[]>('/locations');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    throw error;
  }
}

export async function fetchLocationDetail(id: string): Promise<TravelLocation> {
  if (USE_MOCK) {
    await delay(200);
    const location = mockLocations.find((loc) => loc.id === id);
    if (!location) {
      throw new Error(`Location with id ${id} not found`);
    }
    return location;
  }
  try {
    const response = await api.get<TravelLocation>(`/locations/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch location detail:', error);
    throw error;
  }
}

export async function fetchUserProfile(): Promise<UserProfile> {
  if (USE_MOCK) {
    await delay(300);
    return mockUser;
  }
  try {
    const response = await api.get<UserProfile>('/user/profile');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}

export async function addNote(locationId: string, content: string): Promise<{ id: string; content: string; createdAt: string }> {
  if (USE_MOCK) {
    await delay(300);
    return {
      id: `note-${Date.now()}`,
      content,
      createdAt: new Date().toISOString().split('T')[0],
    };
  }
  try {
    const response = await api.post(`/locations/${locationId}/notes`, { content });
    return response.data;
  } catch (error) {
    console.error('Failed to add note:', error);
    throw error;
  }
}
