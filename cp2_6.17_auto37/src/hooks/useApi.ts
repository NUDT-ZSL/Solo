import { useState, useCallback } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  request: (url: string, options?: RequestInit) => Promise<T | null>;
}

export function useApi<T = unknown>(): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (url: string, options: RequestInit = {}): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, request };
}
