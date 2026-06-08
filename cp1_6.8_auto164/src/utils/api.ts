import type {
  AudioMarkerData,
  RouteData,
  HeatmapData,
  AudioFeatures,
  CommentData,
  RatingData,
} from '@/types';

const BASE_URL = 'http://localhost:8000';

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${url}`, options);
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async uploadAudio(
    routeId: string,
    lat: number,
    lng: number,
    audioBlob: Blob,
    locationName?: string,
  ): Promise<AudioMarkerData> {
    const form = new FormData();
    form.append('routeId', routeId);
    form.append('lat', String(lat));
    form.append('lng', String(lng));
    form.append('audio', audioBlob);
    if (locationName) form.append('locationName', locationName);
    return this.request<AudioMarkerData>('/api/audio/upload', {
      method: 'POST',
      body: form,
    });
  }

  async getAudio(id: string): Promise<AudioMarkerData> {
    return this.request<AudioMarkerData>(`/api/audio/${id}`);
  }

  async deleteAudio(id: string): Promise<void> {
    return this.request<void>(`/api/audio/${id}`, { method: 'DELETE' });
  }

  streamAudioUrl(id: string): string {
    return `${BASE_URL}/api/audio/${id}/stream`;
  }

  async saveRoute(data: {
    name: string;
    description?: string;
    markers: { lat: number; lng: number; audioId: string; order: number }[];
  }): Promise<RouteData> {
    return this.request<RouteData>('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getRoutes(): Promise<RouteData[]> {
    return this.request<RouteData[]>('/api/routes');
  }

  async getRoute(id: string): Promise<RouteData> {
    return this.request<RouteData>(`/api/routes/${id}`);
  }

  async deleteRoute(id: string): Promise<void> {
    return this.request<void>(`/api/routes/${id}`, { method: 'DELETE' });
  }

  async getHeatmapData(): Promise<HeatmapData> {
    return this.request<HeatmapData>('/api/analysis/heatmap');
  }

  async getAudioFeatures(id: string): Promise<AudioFeatures> {
    return this.request<AudioFeatures>(`/api/analysis/audio/${id}/features`);
  }

  async addComment(audioMarkerId: string, content: string): Promise<CommentData> {
    return this.request<CommentData>('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioMarkerId, content }),
    });
  }

  async getComments(audioMarkerId: string): Promise<CommentData[]> {
    return this.request<CommentData[]>(`/api/comments/${audioMarkerId}`);
  }

  async addRating(audioMarkerId: string, score: number): Promise<RatingData> {
    return this.request<RatingData>('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioMarkerId, score }),
    });
  }

  async getRating(audioMarkerId: string): Promise<RatingData> {
    return this.request<RatingData>(`/api/ratings/${audioMarkerId}`);
  }
}

export const api = new ApiClient();
