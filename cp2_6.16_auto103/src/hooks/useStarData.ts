import { useState, useEffect } from 'react';
import type { StarData } from '../types';
import { fetchStars } from '../api';

interface UseStarDataResult {
  stars: StarData[];
  loading: boolean;
  error: Error | null;
}

export function useStarData(
  ra: number,
  dec: number,
  fieldSize: number
): UseStarDataResult {
  const [stars, setStars] = useState<StarData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStars() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchStars(ra, dec, fieldSize);
        if (!cancelled) {
          setStars(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStars();

    return () => {
      cancelled = true;
    };
  }, [ra, dec, fieldSize]);

  return { stars, loading, error };
}
