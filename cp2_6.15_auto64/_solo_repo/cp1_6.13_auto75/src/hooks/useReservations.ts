import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import type { Book } from '../types';

export interface Reservation {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  category: string;
  reservedAt: string;
  dueDate: string | null;
}

interface UseReservationsOptions {
  onSyncBooks?: (books: Book[]) => void;
}

export function useReservations(options: UseReservationsOptions = {}) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const prevReservationsRef = useRef<Reservation[]>([]);

  const fetchReservations = useCallback(async (): Promise<Book[] | null> => {
    try {
      const res = await axios.get('/api/books');
      const books: Book[] = res.data;
      const borrowed: Reservation[] = books
        .filter(b => b.status === 'borrowed')
        .map(b => ({
          bookId: b.id,
          bookTitle: b.title,
          bookAuthor: b.author,
          category: b.category,
          reservedAt: b.dueDate || new Date().toISOString(),
          dueDate: b.dueDate
        }));
      setReservations(borrowed);
      prevReservationsRef.current = borrowed;

      if (options.onSyncBooks) {
        options.onSyncBooks(books);
      }
      return books;
    } catch (err) {
      console.error('获取预约列表失败', err);
      return null;
    }
  }, [options]);

  const addReservation = useCallback(async (bookId: string, bookData?: Partial<Book>): Promise<boolean> => {
    prevReservationsRef.current = [...reservations];

    const optimisticReservation: Reservation = {
      bookId,
      bookTitle: bookData?.title || '未知图书',
      bookAuthor: bookData?.author || '',
      category: bookData?.category || '',
      reservedAt: new Date().toISOString(),
      dueDate: null
    };

    setReservations(prev => [...prev, optimisticReservation]);

    try {
      const res = await axios.post(`/api/books/${bookId}/borrow`);
      const updatedBook: Book = res.data;

      setReservations(prev =>
        prev.map(r =>
          r.bookId === bookId
            ? { ...r, dueDate: updatedBook.dueDate, reservedAt: updatedBook.dueDate || r.reservedAt }
            : r
        )
      );

      if (options.onSyncBooks) {
        const booksRes = await axios.get('/api/books');
        options.onSyncBooks(booksRes.data);
      }

      return true;
    } catch (err) {
      console.error('添加预约失败，回滚状态', err);
      setReservations(prevReservationsRef.current);
      return false;
    }
  }, [reservations, options]);

  const cancelReservation = useCallback(async (bookId: string): Promise<boolean> => {
    prevReservationsRef.current = [...reservations];

    setReservations(prev => prev.filter(r => r.bookId !== bookId));

    try {
      await axios.post(`/api/books/${bookId}/return`);

      if (options.onSyncBooks) {
        const booksRes = await axios.get('/api/books');
        options.onSyncBooks(booksRes.data);
      }

      return true;
    } catch (err) {
      console.error('取消预约失败，回滚状态', err);
      setReservations(prevReservationsRef.current);
      return false;
    }
  }, [reservations, options]);

  const hasReservation = useCallback((bookId: string) => {
    return reservations.some(r => r.bookId === bookId);
  }, [reservations]);

  return {
    reservations,
    fetchReservations,
    addReservation,
    cancelReservation,
    hasReservation
  };
}
