import axios, { AxiosProgressEvent } from 'axios';
import type { Photo, Tag, PhotoListResponse, CropArea } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export interface UploadProgressCallback {
  (progress: number): void;
}

export async function getPhotos(
  limit: number = 20,
  offset: number = 0,
  tagFilter: string[] = []
): Promise<PhotoListResponse> {
  const params: Record<string, string | number> = {
    limit,
    offset,
  };
  if (tagFilter.length > 0) {
    params.tags = tagFilter.join(',');
  }
  const response = await api.get<PhotoListResponse>('/photos', { params });
  return response.data;
}

export async function getPhoto(id: string): Promise<Photo> {
  const response = await api.get<Photo>(`/photos/${id}`);
  return response.data;
}

export async function deletePhoto(id: string): Promise<{ success: boolean }> {
  const response = await api.delete<{ success: boolean }>(`/photos/${id}`);
  return response.data;
}

export async function uploadPhoto(
  file: File,
  title: string,
  tags: string[],
  captureDate: string,
  cropArea?: CropArea,
  onProgress?: UploadProgressCallback
): Promise<Photo> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title || file.name.replace(/\.[^.]+$/, ''));
  formData.append('tags', JSON.stringify(tags));
  formData.append('captureDate', captureDate || new Date().toISOString().slice(0, 10));
  if (cropArea) {
    formData.append('cropArea', JSON.stringify(cropArea));
  }

  const response = await api.post<Photo>('/photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    },
  });

  return response.data;
}

export async function getTags(): Promise<Tag[]> {
  const response = await api.get<Tag[]>('/tags');
  return response.data;
}

export async function createTag(name: string): Promise<Tag> {
  const response = await api.post<Tag>('/tags', { name });
  return response.data;
}

export async function deleteTag(name: string): Promise<{ success: boolean }> {
  const response = await api.delete<{ success: boolean }>(`/tags/${encodeURIComponent(name)}`);
  return response.data;
}
