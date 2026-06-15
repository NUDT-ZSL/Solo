import { useMemo, useState } from 'react';
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
  const [activeCategory, setActiveCategory] = useState<string>('全部');

  const categories = useMemo(() => {
    const set = new Set(books.map(b => b.category));
    return ['全部', ...Array.from(set)];
  }, [books]);

  const filtered = useMemo(() => {
    let result = books;

    if (activeCategory !== '全部') {
      result = result.filter(b => b.category === activeCategory);
    }

    if (filter.trim()) {
      const kw = filter.trim().toLowerCase();
      result = result.filter(
        b => b.title.toLowerCase().includes(kw) || b.author.toLowerCase().includes(kw)
      );
    }

    return result;
  }, [books, filter, activeCategory]);

  if (filtered.length === 0) {
    return (
      <div className="book-list-wrapper">
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-tab ${cat === activeCategory ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="book-list-empty">
          <p className="empty-text">暂无图书</p>
          <button className="refresh-btn" onClick={onRefresh}>
            刷新列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="book-list-wrapper">
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-tab ${cat === activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
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
    </div>
  );
}
