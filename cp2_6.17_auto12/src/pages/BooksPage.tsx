import { useState, useMemo } from 'react';
import { useBookData } from '../hooks/useBookData';
import { BookCard } from '../components/BookCard';
import { useUser } from '../context/UserContext';

export function BooksPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { books, loading, error, reserve } = useBookData(debouncedSearch);
  const { user, refresh } = useUser();

  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleReserve = async (bookId: string) => {
    if (!user) return;
    const result = await reserve(bookId, user.id);
    if (result.success) {
      refresh();
    } else {
      alert(result.message);
    }
  };

  const styles = `
    .books-page {
      padding: 92px 32px 48px;
      max-width: 1280px;
      margin: 0 auto;
    }
    .books-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .books-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
    }
    .books-search {
      position: relative;
    }
    .books-search input {
      width: 320px;
      padding: 10px 16px 10px 40px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s ease;
      background: white;
    }
    .books-search input:focus {
      border-color: #8b5cf6;
    }
    .books-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
      font-size: 16px;
    }
    .books-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, 200px);
      gap: 24px;
      justify-content: start;
    }
    .books-loading,
    .books-error,
    .books-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 48px;
      color: #6b7280;
      font-size: 14px;
    }
    @media (max-width: 768px) {
      .books-page {
        padding: 92px 16px 32px;
      }
      .books-search input {
        width: 100%;
      }
      .books-search {
        width: 100%;
      }
      .books-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 16px;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="books-page page-fade-in">
        <div className="books-header">
          <h1>图书列表</h1>
          <div className="books-search">
            <span className="books-search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索书名或作者..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="books-grid">
          {loading && <div className="books-loading">加载中...</div>}
          {error && <div className="books-error">{error}</div>}
          {!loading && !error && books.length === 0 && (
            <div className="books-empty">暂无图书</div>
          )}
          {books.map((book, i) => (
            <BookCard
              key={book.id}
              book={book}
              onReserve={handleReserve}
              delay={i * 50}
            />
          ))}
        </div>
      </div>
    </>
  );
}
