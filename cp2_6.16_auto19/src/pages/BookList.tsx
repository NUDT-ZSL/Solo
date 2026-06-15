import { useState, useEffect } from 'react';
import { booksAPI } from '../services/api';
import { Book } from '../types';
import BookCard from '../components/BookCard';
import { TAGS } from '../utils/distance';
import './BookList.css';

export default function BookList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setBooks([]);
    setPage(1);
    setHasMore(true);
    fetchBooks(1);
  }, [search, selectedTags]);

  const fetchBooks = async (pageNum: number) => {
    setLoading(true);
    try {
      const result = await booksAPI.getAll({
        search: search || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        page: pageNum,
        limit: 12,
      });
      if (pageNum === 1) {
        setBooks(result.books);
      } else {
        setBooks((prev) => [...prev, ...result.books]);
      }
      setHasMore(result.pagination.page < result.pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('获取图书列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedTags([]);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchBooks(page + 1);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <i className="fas fa-book-open" style={{ color: '#ff6b35' }}></i>
          发现好书
        </h1>
        <p className="page-subtitle">在附近找到你想要交换的图书</p>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="搜索书名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button
              className="clear-btn"
              onClick={() => setSearch('')}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <div className="tag-filter">
          <button
            className="tag-dropdown-btn"
            onClick={() => setShowTagDropdown(!showTagDropdown)}
          >
            <i className="fas fa-tags"></i>
            标签筛选
            {selectedTags.length > 0 && (
              <span className="tag-count">{selectedTags.length}</span>
            )}
            <i className={`fas fa-chevron-down ${showTagDropdown ? 'up' : ''}`}></i>
          </button>

          {showTagDropdown && (
            <div className="tag-dropdown">
              <div className="tag-dropdown-header">
                <span>选择标签</span>
                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])}>
                    清除
                  </button>
                )}
              </div>
              <div className="tag-dropdown-list">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    className={`tag-option-dropdown ${
                      selectedTags.includes(tag) ? 'selected' : ''
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {selectedTags.includes(tag) && <i className="fas fa-check"></i>}
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedTags.length > 0 && (
          <div className="selected-tags">
            {selectedTags.map((tag) => (
              <span key={tag} className="selected-tag">
                {tag}
                <button onClick={() => toggleTag(tag)}>
                  <i className="fas fa-times"></i>
                </button>
              </span>
            ))}
            <button className="clear-all-btn" onClick={clearFilters}>
              清除全部
            </button>
          </div>
        )}
      </div>

      {loading && books.length === 0 ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i>
          <h3>暂无图书</h3>
          <p>试试调整筛选条件，或者发布你的第一本书吧</p>
        </div>
      ) : (
        <>
          <div className="masonry">
            {books.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                delay={index * 50}
              />
            ))}
          </div>

          {hasMore && (
            <div className="load-more">
              <button
                className="btn btn-secondary"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    加载中...
                  </>
                ) : (
                  '加载更多'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
