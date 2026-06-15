import { useState, useEffect, useCallback } from 'react';
import type { TravelLocation, UserProfile } from '../types';
import { fetchLocations, fetchLocationDetail, fetchUserProfile, addNote } from '../services/api';

interface UseTravelDataReturn {
  locations: TravelLocation[];
  selectedLocation: TravelLocation | null;
  userProfile: UserProfile | null;
  loading: boolean;
  locationsLoading: boolean;
  detailLoading: boolean;
  error: string | null;
  selectLocation: (id: string | null) => Promise<void>;
  addLocationNote: (locationId: string, content: string) => Promise<void>;
  refreshLocations: () => Promise<void>;
}

export function useTravelData(): UseTravelDataReturn {
  const [locations, setLocations] = useState<TravelLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<TravelLocation | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [locs, user] = await Promise.all([fetchLocations(), fetchUserProfile()]);
      setLocations(locs);
      setUserProfile(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
      setLocationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const refreshLocations = useCallback(async () => {
    setLocationsLoading(true);
    setError(null);
    try {
      const locs = await fetchLocations();
      setLocations(locs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新地点列表失败');
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const selectLocation = useCallback(async (id: string | null) => {
    if (id === null) {
      setSelectedLocation(null);
      return;
    }
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await fetchLocationDetail(id);
      setSelectedLocation(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载地点详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const addLocationNote = useCallback(async (locationId: string, content: string) => {
    setError(null);
    try {
      const newNote = await addNote(locationId, content);
      setSelectedLocation((prev) => {
        if (!prev || prev.id !== locationId) return prev;
        return { ...prev, notes: [...prev.notes, newNote] };
      });
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId
            ? { ...loc, notes: [...loc.notes, newNote] }
            : loc
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加笔记失败');
      throw err;
    }
  }, []);

  return {
    locations,
    selectedLocation,
    userProfile,
    loading,
    locationsLoading,
    detailLoading,
    error,
    selectLocation,
    addLocationNote,
    refreshLocations,
  };
}
