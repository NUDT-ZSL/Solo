import { useState, useEffect } from 'react';
import type { Flower, Occasion } from '../types';

interface UseFlowerDataReturn {
  flowers: Flower[];
  occasions: Occasion[];
  loading: boolean;
  error: string | null;
}

export function useFlowerData(): UseFlowerDataReturn {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [flowersRes, occasionsRes] = await Promise.all([
          fetch('/api/flowers'),
          fetch('/api/occasions'),
        ]);

        if (!flowersRes.ok || !occasionsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const flowersData = await flowersRes.json();
        const occasionsData = await occasionsRes.json();

        setFlowers(flowersData);
        setOccasions(occasionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { flowers, occasions, loading, error };
}
