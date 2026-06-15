import axios from 'axios';
import type { Plant, CareRecord, Reminder } from './types';

const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 5000,
});

export async function getPlants(): Promise<Plant[]> {
  const res = await api.get('/api/plants');
  return res.data;
}

export async function addPlant(data: { name: string; type: string; wateringFrequency: number }): Promise<Plant> {
  const res = await api.post('/api/plants', data);
  return res.data;
}

export async function getPlantDetail(id: string): Promise<Plant> {
  const res = await api.get(`/api/plants/${id}`);
  return res.data;
}

export async function updatePlant(id: string, data: Partial<Plant>): Promise<Plant> {
  const res = await api.put(`/api/plants/${id}`, data);
  return res.data;
}

export async function deletePlant(id: string): Promise<void> {
  await api.delete(`/api/plants/${id}`);
}

export async function addRecord(plantId: string, data: { type: string; date: string; note: string }): Promise<CareRecord> {
  const res = await api.post(`/api/plants/${plantId}/records`, data);
  return res.data;
}

export async function getReminders(): Promise<Reminder[]> {
  const res = await api.get('/api/reminders');
  return res.data;
}

export async function markReminderRead(id: string): Promise<Reminder> {
  const res = await api.put(`/api/reminders/${id}/read`);
  return res.data;
}

export async function markAllRemindersRead(): Promise<void> {
  await api.put('/api/reminders/read-all');
}

export async function quickWater(plantId: string): Promise<{ success: boolean; lastWatered: string }> {
  const res = await api.put(`/api/plants/${plantId}/water`);
  return res.data;
}
