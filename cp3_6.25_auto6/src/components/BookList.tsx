import { useState, useMemo, useCallback } from 'react';
import { Book } from '../types';

interface BookListProps {
  books: Book[];
  loading: boolean;
  error: string | null;
  onBorrow: (bookId: string) => void;
}

function BookList({ books, loading, error, onBorrow }: BookListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredBooks = useMemo(() => {
    if (!debouncedSearch.trim()) return books;
    const term = debouncedSearch.toLowerCase();
    return books.filter(
      book =>
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term)
    );
  }, [books, debouncedSearch]);

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="page">
      <h1 className="page-title">书籍列表</h1>
      <input
        type="text"
        className="search-box"
        placeholder="搜索书名或作者..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <div className="book-grid">
        {filteredBooks.map((book) => {
          const isAvailable = book.availableCopies > 0;
          return (
            <div key={book.id} className="book-card">
              <div className="book-cover">
                {book.title.charAt(0)}
              </div>
              <span className={`status-tag ${isAvailable ? 'available' : 'unavailable'}`}>
                {isAvailable ? '可借阅' : '已借出'}
              </span>
              <div>
                <div className="book-title">{book.title}</div>
                <div className="book-author">{book.author}</div>
                <div className="book-isbn">ISBN: {book.isbn}</div>
              </div>
              <div className={`book-availability ${isAvailable ? 'available' : 'unavailable'}`}>
                可借: {book.availableCopies} / {book.totalCopies}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => onBorrow(book.id)}
                disabled={!isAvailable}
              >
                {isAvailable ? '借阅' : '暂无库存'}
              </button>
            </div>
          );
        })}
      </div>
      {filteredBooks.length === 0 && (
        <div className="empty-state">
          {debouncedSearch ? '没有找到匹配的书籍' : '暂无书籍数据'}
        </div>
      )}
    </div>
  );
}

export default BookList;
