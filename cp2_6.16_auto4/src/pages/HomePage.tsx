import { useNavigate } from 'react-router-dom';
import { Search, Clock, BookOpen, Flame, BookMarked } from 'lucide-react';
import { useState } from 'react';
import { useBooks } from '../hooks/useBooks';
import type { Book } from '../types';

const DEFAULT_COVER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNCIgdmlld0JveD0iMCAwIDQwMCAyMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjI0IiBmaWxsPSIjZjZlOWQyIi8+CjxwYXRoIGQ9Ik0yMDAgNjRMMjQwIDk2SDE2MEwyMDAgNjRaIiBmaWxsPSIjZThkNGI1Ii8+CjxyZWN0IHg9IjE2MCIgeT0iOTYiIHdpZHRoPSI4MCIgaGVpZ2h0PSI2NCIgZmlsbD0iI2U4ZDRiNSIvPgo8dGV4dCB4PSIyMDAiIHk9IjE4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzhiN2Q2YiIgZm9udC1mYW1pbHk9Ik5vdG8gU2VyaWYgU0MiIGZvbnQtc2l6ZT0iMTQiPuaVsOWtpuS4nOabtTwvdGV4dD4KPC9zdmc+';

function HomePage() {
  const navigate = useNavigate();
  const { books, loading, error, searchQuery, sortBy, handleSearch, handleSort } = useBooks();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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

  const handleImageError = (bookId: string) => {
    setImageErrors((prev) => ({ ...prev, [bookId]: true }));
  };

  const getHeatLevel = (count: number) => {
    if (count >= 30) return 'high';
    if (count >= 10) return 'medium';
    return 'low';
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
              <div className="book-card-cover-wrapper">
                <img
                  src={imageErrors[book.id] ? DEFAULT_COVER : book.coverUrl}
                  alt={book.title}
                  className="book-card-cover"
                  loading="lazy"
                  onError={() => handleImageError(book.id)}
                />
                {book.driftCount >= 20 && (
                  <div className="drift-heat-badge">
                    <Flame size={14} />
                    <span>热门</span>
                  </div>
                )}
              </div>
              <div className="book-card-content">
                <h3 className="book-card-title">{book.title}</h3>
                <p className="book-card-author">{book.author}</p>
                <div className="book-card-footer">
                  <span className={`status-tag status-${book.status}`}>
                    {getStatusLabel(book.status)}
                  </span>
                  <span className={`drift-count drift-heat-${getHeatLevel(book.driftCount)}`}>
                    <BookOpen size={14} />
                    <span className="drift-count-number">{book.driftCount}</span>
                    <span className="drift-count-label">次漂流</span>
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
