import axios, { AxiosProgressEvent } from 'axios';
import type { ImageItem, NetworkData, SortOption, ColorOption } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export async function uploadImage(
  file: File,
  title: string,
  onProgress?: (percent: number) => void
): Promise<ImageItem> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('title', title);

  const res = await api.post<ImageItem>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total && onProgress) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    }
  });
  return res.data;
}

export async function getImages(
  sort: SortOption = 'newest',
  color: ColorOption = 'all'
): Promise<ImageItem[]> {
  const res = await api.get<ImageItem[]>('/images', {
    params: { sort, color }
  });
  return res.data;
}

export async function getImage(id: string): Promise<ImageItem> {
  const res = await api.get<ImageItem>(`/images/${id}`);
  return res.data;
}

export async function getNetwork(id: string): Promise<NetworkData> {
  const res = await api.get<NetworkData>(`/images/${id}/network`);
  return res.data;
}

export async function deleteImage(id: string): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(`/images/${id}`);
  return res.data;
}
