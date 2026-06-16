import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types';
import { getBooks, reserveBook, addComment, addBook } from '../api';

export function useBookData(search?: string) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBooks(search);
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图书列表失败');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleReserve = useCallback(
    async (bookId: string, userId: string) => {
      try {
        await reserveBook(bookId, userId);
        await fetchBooks();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : '预约失败'
        };
      }
    },
    [fetchBooks]
  );

  const handleAddComment = useCallback(
    async (bookId: string, userId: string, nickname: string, content: string) => {
      try {
        await addComment(bookId, userId, nickname, content);
        await fetchBooks();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : '评论失败'
        };
      }
    },
    [fetchBooks]
  );

  const handleAddBook = useCallback(
    async (data: Partial<Book>) => {
      try {
        await addBook(data);
        await fetchBooks();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : '添加图书失败'
        };
      }
    },
    [fetchBooks]
  );

  return {
    books,
    loading,
    error,
    refetch: fetchBooks,
    reserve: handleReserve,
    addComment: handleAddComment,
    addBook: handleAddBook
  };
}
