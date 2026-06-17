import type { Video, Marker } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getVideos: () => request<Video[]>('/api/videos'),

  uploadVideo: (file: File): Promise<Video> => {
    const formData = new FormData();
    formData.append('video', file);
    return fetch('/api/videos', {
      method: 'POST',
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error('上传失败');
      return res.json();
    });
  },

  deleteVideo: (id: string) =>
    request<{ success: boolean }>(`/api/videos/${id}`, { method: 'DELETE' }),

  getMarkers: (videoId: string) =>
    request<Marker[]>(`/api/videos/${videoId}/markers`),

  createMarker: (data: { videoId: string; timestamp: number; label: string; color: string }) =>
    request<Marker>('/api/markers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateMarker: (id: string, data: Partial<Marker>) =>
    request<Marker>(`/api/markers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteMarker: (id: string) =>
    request<{ success: boolean }>(`/api/markers/${id}`, { method: 'DELETE' }),

  reorderMarkers: (ids: string[]) =>
    request<{ success: boolean }>('/api/markers/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids })
    })
};
