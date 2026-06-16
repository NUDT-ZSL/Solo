import { useNavigate } from 'react-router-dom';
import { Search, Clock, BookOpen } from 'lucide-react';
import dayjs from 'dayjs';
import { useBooks } from '../hooks/useBooks';
import type { Book } from '../types';

function HomePage() {
  const navigate = useNavigate();
  const { books, loading, error, searchQuery, sortBy, handleSearch, handleSort } = useBooks();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return '可申请';
      case 'drifting':
        return '漂流中';
      case 'offline':
        return '已下架';
      default:
        return status;
    }
  };

  const handleBookClick = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  return (
    <div className="home-page page-transition">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="搜索书名或作者..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => handleSort(e.target.value)}
        >
          <option value="publishTime">按发布时间排序</option>
          <option value="driftCount">按漂流次数排序</option>
        </select>
      </div>

      {loading && (
        <div className="loading-spinner">
          <div>加载中...</div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && !error && books.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div>暂无图书</div>
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="book-grid">
          {books.map((book: Book) => (
            <div
              key={book.id}
              className="book-card"
              onClick={() => handleBookClick(book.id)}
            >
              <img
                src={book.coverUrl}
                alt={book.title}
                className="book-card-cover"
                loading="lazy"
              />
              <div className="book-card-content">
                <h3 className="book-card-title">{book.title}</h3>
                <p className="book-card-author">{book.author}</p>
                <div className="book-card-footer">
                  <span className={`status-tag status-${book.status}`}>
                    {getStatusLabel(book.status)}
                  </span>
                  <span className="drift-count">
                    <BookOpen size={14} />
                    {book.driftCount} 次漂流
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
