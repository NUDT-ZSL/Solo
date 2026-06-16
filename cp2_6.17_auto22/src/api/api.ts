import type { Artist, Song, TourCity, Favorite, City, SearchResult } from '../types';

const base = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(base + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  getArtists: () => request<Artist[]>('/artists'),
  getArtist: (id: string) => request<Artist>(`/artists/${id}`),
  getSongs: (artistId: string) => request<Song[]>(`/artists/${artistId}/songs`),
  addSong: (artistId: string, data: { title: string; lyrics: string; genre: string[] }) =>
    request<Song>(`/artists/${artistId}/songs`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getTourCities: (artistId: string) => request<TourCity[]>(`/artists/${artistId}/tour`),
  addTourCity: (artistId: string, data: { name: string; lat: number; lng: number; popularity?: number; date: string }) =>
    request<TourCity>(`/artists/${artistId}/tour`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteTourCity: (cityId: string) =>
    request<{ success: boolean }>(`/tour/${cityId}`, { method: 'DELETE' }),
  search: (q: string) => request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
  getFavorites: () => request<Array<Favorite & { artist: Artist }>>('/favorites'),
  addFavorite: (artistId: string) =>
    request<Favorite>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ artistId })
    }),
  deleteFavorite: (artistId: string) =>
    request<{ success: boolean }>(`/favorites/${artistId}`, { method: 'DELETE' }),
  getCities: (search?: string) =>
    request<City[]>(search ? `/cities?search=${encodeURIComponent(search)}` : '/cities')
};
