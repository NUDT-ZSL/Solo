import { useMemo } from 'react';
import type { Book } from '../types';
import { BookCard } from './BookCard';
import './BookList.css';

interface BookListProps {
  books: Book[];
  filter: string;
  onBorrow: (id: string) => Promise<boolean>;
  onCancel: (id: string) => Promise<boolean>;
  onRefresh: () => void;
}

export function BookList({ books, filter, onBorrow, onCancel, onRefresh }: BookListProps) {
  const filtered = useMemo(() => {
    if (!filter.trim()) return books;
    const kw = filter.trim().toLowerCase();
    return books.filter(
      b => b.title.toLowerCase().includes(kw) || b.author.toLowerCase().includes(kw)
    );
  }, [books, filter]);

  if (filtered.length === 0) {
    return (
      <div className="book-list-empty">
        <p className="empty-text">暂无图书</p>
        <button className="refresh-btn" onClick={onRefresh}>
          刷新列表
        </button>
      </div>
    );
  }

  return (
    <div className="book-list">
      {filtered.map((book, i) => (
        <BookCard
          key={book.id}
          book={book}
          index={i}
          onBorrow={onBorrow}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
