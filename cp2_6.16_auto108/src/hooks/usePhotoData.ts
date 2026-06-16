import { useState, useCallback } from 'react';
import type { Photo, UpdateSmellRequest } from '../types';

const API_BASE = '/api';

export function usePhotoData() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/photos`);
      if (!res.ok) throw new Error('Failed to fetch photos');
      const data = (await res.json()) as Photo[];
      setPhotos(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPhotoById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/photos/${id}`);
      if (!res.ok) throw new Error('Failed to fetch photo');
      const data = (await res.json()) as Photo;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePhotoSmell = useCallback(async (id: string, data: UpdateSmellRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/photos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update photo');
      const updated = (await res.json()) as Photo;
      setPhotos((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPhotos = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/photos/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search photos');
      const data = (await res.json()) as Photo[];
      setPhotos(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    photos,
    loading,
    error,
    fetchPhotos,
    fetchPhotoById,
    updatePhotoSmell,
    searchPhotos,
  };
}
