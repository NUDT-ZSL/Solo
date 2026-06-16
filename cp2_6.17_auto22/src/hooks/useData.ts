import { useEffect, useState } from 'react';
import { api } from '../api/api';
import type { Artist, Song, TourCity, Favorite, City, SearchResult } from '../types';
import { useStore } from '../store/useStore';

export function useArtists() {
  const [artists, setArtists] = useState<(Artist & { songCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getArtists();
      setArtists(data as unknown as (Artist & { songCount: number })[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { artists, loading, error, refetch: load };
}

export function useArtist(id: string | undefined) {
  const [artist, setArtist] = useState<(Artist & { songCount: number }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getArtist(id)
      .then(a => setArtist(a as unknown as Artist & { songCount: number }))
      .finally(() => setLoading(false));
  }, [id]);

  return { artist, loading };
}

export function useSongs(artistId: string | undefined) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!artistId) return;
    setLoading(true);
    try {
      const data = await api.getSongs(artistId);
      setSongs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [artistId]);

  const addSong = async (data: { title: string; lyrics: string; genre: string[] }) => {
    if (!artistId) return null;
    const song = await api.addSong(artistId, data);
    setSongs(prev => [...prev, song]);
    return song;
  };

  return { songs, loading, addSong, refetch: load };
}

export function useTourCities(artistId: string | undefined) {
  const [cities, setCities] = useState<TourCity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!artistId) return;
    setLoading(true);
    try {
      const data = await api.getTourCities(artistId);
      setCities(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [artistId]);

  const addCity = async (data: Omit<TourCity, 'id' | 'artistId'>) => {
    if (!artistId) return null;
    const city = await api.addTourCity(artistId, data);
    setCities(prev => [...prev, city]);
    return city;
  };

  const removeCity = async (cityId: string) => {
    await api.deleteTourCity(cityId);
    setCities(prev => prev.filter(c => c.id !== cityId));
  };

  return { cities, loading, addCity, removeCity, refetch: load, setCities };
}

export function useFavorites() {
  const { setFavorites, addFavorite, removeFavorite, favorites, isFavorite } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFavorites()
      .then(data => setFavorites(data))
      .finally(() => setLoading(false));
  }, [setFavorites]);

  const toggle = async (artist: Artist) => {
    const fav = isFavorite(artist.id);
    if (fav) {
      await api.deleteFavorite(artist.id);
      removeFavorite(artist.id);
    } else {
      const data = await api.addFavorite(artist.id);
      addFavorite({ ...data, artist });
    }
  };

  return { favorites, loading, isFavorite, toggle };
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.search(q);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search, setResults };
}

export function useCitySearch() {
  const [cities, setCities] = useState<City[]>([]);

  const search = async (q: string) => {
    const data = await api.getCities(q);
    setCities(data);
  };

  useEffect(() => {
    search('');
  }, []);

  return { cities, search };
}
