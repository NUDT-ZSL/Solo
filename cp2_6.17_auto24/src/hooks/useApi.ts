import { useState, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '请求失败';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, []);

  const get = useCallback((url: string) => {
    return request(url, { method: 'GET' });
  }, [request]);

  const post = useCallback((url: string, body?: unknown) => {
    return request(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [request]);

  const put = useCallback((url: string, body?: unknown) => {
    return request(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [request]);

  const del = useCallback((url: string) => {
    return request(url, { method: 'DELETE' });
  }, [request]);

  return {
    ...state,
    get,
    post,
    put,
    del,
    request,
  };
}
