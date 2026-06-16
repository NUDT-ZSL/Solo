import { useState, useCallback } from 'react';
import type { Book } from '../types';
import { booksApi } from '../api';

export function useBooks() {
  const [data, setData] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const books = await booksApi.list();
      setData(books);
      return books;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const books = await booksApi.recent();
      setData(books);
      return books;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const addBook = useCallback(async (book: Omit<Book, 'id' | 'createdAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const newBook = await booksApi.create(book);
      setData((prev) => [newBook, ...prev]);
      return newBook;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchBooks = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const books = await booksApi.search(q);
      setData(books);
      return books;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, error, loading, fetchBooks, getRecent, addBook, searchBooks };
}
