import { useState, useCallback } from 'react';
import axios from 'axios';
import type { Book } from '../types';

interface Reservation {
  bookId: string;
  bookTitle: string;
  reservedAt: string;
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const fetchReservations = useCallback(async () => {
    try {
      const res = await axios.get('/api/books');
      const borrowed: Reservation[] = res.data
        .filter((b: Book) => b.status === 'borrowed')
        .map((b: Book) => ({
          bookId: b.id,
          bookTitle: b.title,
          reservedAt: b.dueDate || new Date().toISOString()
        }));
      setReservations(borrowed);
    } catch (err) {
      console.error('获取预约列表失败', err);
    }
  }, []);

  const addReservation = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      await axios.post(`/api/books/${bookId}/borrow`);
      await fetchReservations();
      return true;
    } catch (err) {
      console.error('添加预约失败', err);
      return false;
    }
  }, [fetchReservations]);

  const cancelReservation = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      await axios.post(`/api/books/${bookId}/return`);
      setReservations(prev => prev.filter(r => r.bookId !== bookId));
      return true;
    } catch (err) {
      console.error('取消预约失败', err);
      return false;
    }
  }, []);

  return { reservations, fetchReservations, addReservation, cancelReservation };
}
