import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Book } from '../types';
import BookCard from '../components/BookCard';

type SortType = 'newest' | 'oldest' | 'title';

const PAGE_SIZE = 9;

const BookList: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortType>('newest');
  const [sortAnimating, setSortAnimating] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page,
          limit: PAGE_SIZE,
          sort,
        };
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        const response = await axios.get('/api/books', { params });
        setBooks(response.data.books);
        setTotal(response.data.total);
      } catch (error) {
        console.error('Failed to fetch books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [page, debouncedSearch, sort]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSortChange = (newSort: SortType) => {
    if (newSort === sort) return;

    if (sortTimerRef.current) {
      clearTimeout(sortTimerRef.current);
    }

    setSortAnimating(true);
    setPage(1);

    sortTimerRef.current = setTimeout(() => {
      setSort(newSort);
      setTimeout(() => {
        setSortAnimating(false);
      }, 500);
    }, 250);
  };

  const renderPaginationNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div>
      <h1 className="page-title">图书浏览</h1>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索书名、作者或ISBN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
                animationDelay={sortAnimating ? index * 40 : index * 60}
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

              {renderPaginationNumbers().map((pageNum, idx) =>
                typeof pageNum === 'number' ? (
                  <button
                    key={idx}
                    className={`page-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </button>
                ) : (
                  <span key={idx} className="page-ellipsis">
                    {pageNum}
                  </span>
                )
              )}

              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                下一页
              </button>
            </div>
          )}

          <div className="pagination-info" style={{ textAlign: 'center', color: '#666', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            共 {total} 本图书，当前第 {page} / {totalPages} 页
          </div>
        </>
      )}
    </div>
  );
};

export default BookList;
