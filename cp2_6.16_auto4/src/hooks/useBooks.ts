import { useState, useEffect, useCallback, useRef } from 'react';
import type { Book, DriftRecord } from '../types';
import { getBooks, getBookById, getDriftRecords, applyDrift, updateBookStatus } from '../api';

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('publishTime');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooks = useCallback(async (search?: string, sort?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBooks(search, sort);
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图书列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks(undefined, sortBy);
  }, [fetchBooks, sortBy]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        fetchBooks(value || undefined, sortBy);
      }, 200);
    },
    [fetchBooks, sortBy]
  );

  const handleSort = useCallback(
    (value: string) => {
      setSortBy(value);
      fetchBooks(searchQuery || undefined, value);
    },
    [fetchBooks, searchQuery]
  );

  const refetch = useCallback(() => {
    fetchBooks(searchQuery || undefined, sortBy);
  }, [fetchBooks, searchQuery, sortBy]);

  return {
    books,
    loading,
    error,
    searchQuery,
    sortBy,
    handleSearch,
    handleSort,
    refetch,
  };
}

export function useBookDetail(bookId: string | undefined) {
  const [book, setBook] = useState<Book | null>(null);
  const [driftRecords, setDriftRecords] = useState<DriftRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchBookDetail = useCallback(async () => {
    if (!bookId) return;

    setLoading(true);
    setError(null);
    try {
      const [bookData, recordsData] = await Promise.all([
        getBookById(bookId),
        getDriftRecords(bookId),
      ]);
      setBook(bookData);
      setDriftRecords(recordsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图书详情失败');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchBookDetail();
  }, [fetchBookDetail]);

  const handleApply = useCallback(
    async (applicantId: string, applicantName: string, location: string) => {
      if (!bookId) return { success: false, message: '图书ID无效' };

      setApplying(true);
      try {
        const result = await applyDrift(bookId, { applicantId, applicantName, location });
        if (result.success) {
          await fetchBookDetail();
        }
        return result;
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : '申请失败',
        };
      } finally {
        setApplying(false);
      }
    },
    [bookId, fetchBookDetail]
  );

  const handleUpdateStatus = useCallback(
    async (status: string) => {
      if (!bookId) return null;

      try {
        const updatedBook = await updateBookStatus(bookId, status);
        setBook(updatedBook);
        return updatedBook;
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新状态失败');
        return null;
      }
    },
    [bookId]
  );

  return {
    book,
    driftRecords,
    loading,
    error,
    applying,
    handleApply,
    handleUpdateStatus,
    refetch: fetchBookDetail,
  };
}
