import axios from 'axios';
import type { ScentMark, UserFootprint } from './types';

const api = axios.create({
  baseURL: '',
});

export async function fetchMarks(scentType?: string, userId?: string): Promise<ScentMark[]> {
  const params: Record<string, string> = {};
  if (scentType) params.scent_type = scentType;
  if (userId) params.user_id = userId;
  const res = await api.get('/api/marks', { params });
  return res.data;
}

export async function fetchMark(id: string): Promise<ScentMark> {
  const res = await api.get(`/api/marks/${id}`);
  return res.data;
}

export async function createMark(data: {
  lat: number;
  lng: number;
  description: string;
  scent_type: string;
  user_id: string;
  audio?: File;
}): Promise<ScentMark> {
  const formData = new FormData();
  formData.append('lat', data.lat.toString());
  formData.append('lng', data.lng.toString());
  formData.append('description', data.description);
  formData.append('scent_type', data.scent_type);
  formData.append('user_id', data.user_id);
  if (data.audio) formData.append('audio', data.audio);
  const res = await api.post('/api/marks', formData);
  return res.data;
}

export async function deleteMark(id: string): Promise<void> {
  await api.delete(`/api/marks/${id}`);
}

export async function fetchFootprint(userId: string): Promise<UserFootprint> {
  const res = await api.get(`/api/footprint/${userId}`);
  return res.data;
}

export async function fetchScentTypes(): Promise<string[]> {
  const res = await api.get('/api/scent_types');
  return res.data;
}
