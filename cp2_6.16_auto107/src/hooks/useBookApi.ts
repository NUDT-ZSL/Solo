import { useState, useCallback } from 'react';
import type { Book, PageBlock } from '@/types';

const API_BASE = 'http://localhost:3001/api';

export function useBookApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(url: string): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${url}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBookList = useCallback((): Promise<Book[]> => {
    return request<Book[]>('/books');
  }, [request]);

  const getBookPage = useCallback((id: string, page: number): Promise<PageBlock[]> => {
    return request<PageBlock[]>(`/books/${id}/pages/${page}`);
  }, [request]);

  const searchBooks = useCallback((keyword: string): Promise<Book[]> => {
    const query = encodeURIComponent(keyword);
    return request<Book[]>(`/books/search?q=${query}`);
  }, [request]);

  return {
    loading,
    error,
    getBookList,
    getBookPage,
    searchBooks,
  };
}
