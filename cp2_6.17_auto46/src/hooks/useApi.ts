import { useState, useCallback, useEffect } from 'react';

interface UseApiOptions<T> {
  manual?: boolean;
  initialData?: T | null;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  request: (url: string, options?: RequestInit) => Promise<T | null>;
}

const BASE_URL = '/api';

function useApi<T>(
  url: string,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(options.initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!options.manual);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (reqUrl: string, reqOptions: RequestInit = {}): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(BASE_URL + reqUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...reqOptions.headers,
          },
          ...reqOptions,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const result = (await res.json()) as T;
        setData(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refetch = useCallback(async () => {
    await request(url);
  }, [url, request]);

  useEffect(() => {
    if (!options.manual) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refetch, request };
}

export default useApi;
