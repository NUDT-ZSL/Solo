import axios from 'axios';
import type { Photo, PhotoDetail, Comment } from './types';

const api = axios.create({
  baseURL: '/api',
});

export const uploadPhotos = async (files: File[]): Promise<Photo[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('photos', file);
  });
  const response = await api.post<Photo[]>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getPhotos = async (limit?: number, offset?: number): Promise<Photo[]> => {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append('limit', String(limit));
  if (offset !== undefined) params.append('offset', String(offset));
  const response = await api.get<Photo[]>(`/photos${params ? `?${params}` : ''}`);
  return response.data;
};

export const getPhotoDetail = async (id: string): Promise<PhotoDetail> => {
  const response = await api.get<PhotoDetail>(`/photo/${id}`);
  return response.data;
};

export const addComment = async (id: string, content: string): Promise<Comment> => {
  const response = await api.post<Comment>(`/photo/${id}/comment`, { content });
  return response.data;
};

export const getTopPhotos = async (limit: number = 10): Promise<Photo[]> => {
  const response = await api.get<Photo[]>(`/photos?limit=${limit}&sort=score`);
  return response.data;
};
