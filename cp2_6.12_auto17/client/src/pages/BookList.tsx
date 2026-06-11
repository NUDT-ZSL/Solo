import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Book } from '../types';
import BookCard from '../components/BookCard';

type SortType = 'newest' | 'oldest' | 'title';

const PAGE_SIZE = 12;

const BookList: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortType>('newest');
  const [sortAnimating, setSortAnimating] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sortTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
        sort,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      const response = await axios.get('/api/books', { params });
      setBooks(response.data.books);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sort]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSortChange = (newSort: SortType) => {
    if (newSort === sort) return;

    setSortAnimating(true);
    if (sortTimerRef.current) {
      clearTimeout(sortTimerRef.current);
    }

    setPage(1);
    setTimeout(() => {
      setSort(newSort);
      sortTimerRef.current = setTimeout(() => {
        setSortAnimating(false);
      }, 400);
    }, 200);
  };

  return (
    <div>
      <h1 className="page-title">图书浏览</h1>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索书名、作者或ISBN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="sort-buttons">
          <button
            className={`sort-btn ${sort === 'newest' ? 'active' : ''}`}
            onClick={() => handleSortChange('newest')}
          >
            最近优先
          </button>
          <button
            className={`sort-btn ${sort === 'oldest' ? 'active' : ''}`}
            onClick={() => handleSortChange('oldest')}
          >
            最旧优先
          </button>
          <button
            className={`sort-btn ${sort === 'title' ? 'active' : ''}`}
            onClick={() => handleSortChange('title')}
          >
            书名 A-Z
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">没有找到相关图书</p>
        </div>
      ) : (
        <>
          <div className={`books-grid ${sortAnimating ? 'sorting' : ''}`}>
            {books.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                animationDelay={sortAnimating ? index * 30 : index * 50}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`page-btn ${page === pageNum ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BookList;
