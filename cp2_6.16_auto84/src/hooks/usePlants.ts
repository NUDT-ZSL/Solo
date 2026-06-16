import { useState, useEffect, useCallback } from 'react';
import { Plant } from '../types';

const API_BASE = '/api';

export function usePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/plants`);
      if (!response.ok) throw new Error('Failed to fetch plants');
      const data = await response.json();
      setPlants(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const adoptPlant = useCallback(async (plantId: string, userId: string, userName: string) => {
    try {
      const response = await fetch(`${API_BASE}/plants/${plantId}/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName })
      });
      if (!response.ok) throw new Error('Failed to adopt plant');
      const updatedPlant = await response.json();
      setPlants(prev => prev.map(p => p.id === plantId ? updatedPlant : p));
      return updatedPlant;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  return { plants, loading, error, refetch: fetchPlants, adoptPlant };
}
