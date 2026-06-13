import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { Book, ToastMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pollRef = useRef<number | null>(null);

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await axios.get('/api/books');
      setBooks(res.data);
    } catch (err) {
      console.error('获取图书列表失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const borrowBook = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await axios.post(`/api/books/${id}/borrow`);
      setBooks(prev => prev.map(b => (b.id === id ? (res.data as Book) : b)));
      showToast('success', '预约成功！');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error || '预约失败';
      showToast('error', msg);
      await fetchBooks();
      return false;
    }
  }, [fetchBooks, showToast]);

  const returnBook = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await axios.post(`/api/books/${id}/return`);
      setBooks(prev => prev.map(b => (b.id === id ? (res.data as Book) : b)));
      showToast('success', '还书成功！');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error || '还书失败';
      showToast('error', msg);
      return false;
    }
  }, [showToast]);

  useEffect(() => {
    fetchBooks();
    pollRef.current = window.setInterval(fetchBooks, 30000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [fetchBooks]);

  return { books, loading, toasts, borrowBook, returnBook, fetchBooks, showToast };
}
