import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import StarRating from './StarRating';
import { Review, Book } from '../api';
import '../styles/ReviewWall.css';

interface ReviewWallProps {
  reviews: Review[];
  loading: boolean;
  selectedRatings: number[];
  sortBy: 'latest' | 'hottest';
  likedReviews: Map<string, boolean>;
  onRatingFilterChange: (rating: number) => void;
  onSortChange: (sort: 'latest' | 'hottest') => void;
  onLike: (reviewId: string) => void;
  selectedBook?: Book;
}

const COLUMN_GAP = 10;

function ReviewWall({
  reviews,
  loading,
  selectedRatings,
  sortBy,
  likedReviews,
  onRatingFilterChange,
  onSortChange,
  onLike,
  selectedBook
}: ReviewWallProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayReviews, setDisplayReviews] = useState<Review[]>([]);
  const [columnCount, setColumnCount] = useState(3);
  const prevReviewsRef = useRef<Review[]>([]);
  const prevBookIdRef = useRef<string | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [slideKey, setSlideKey] = useState(0);

  const getColumnCount = useCallback(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    if (width < 600) return 1;
    if (width < 900) return 2;
    return 3;
  }, []);

  useEffect(() => {
    setColumnCount(getColumnCount());
    const handleResize = () => {
      setColumnCount(getColumnCount());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getColumnCount]);

  useEffect(() => {
    const currentBookId = selectedBook?.id;
    if (prevBookIdRef.current !== undefined && prevBookIdRef.current !== currentBookId) {
      setSlideKey(k => k + 1);
    }
    prevBookIdRef.current = currentBookId;
  }, [selectedBook?.id]);

  useEffect(() => {
    if (prevReviewsRef.current.length > 0 && reviews !== prevReviewsRef.current) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayReviews(reviews);
        setIsTransitioning(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setDisplayReviews(reviews);
    }
    prevReviewsRef.current = reviews;
  }, [reviews]);

  const columns = useMemo(() => {
    const result: Review[][] = Array.from({ length: columnCount }, () => []);
    const columnHeights = new Array(columnCount).fill(0);

    displayReviews.forEach(review => {
      const estimatedHeight = 140 + Math.ceil(review.comment.length / 25) * 22;
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      result[shortestColumnIndex].push(review);
      columnHeights[shortestColumnIndex] += estimatedHeight + COLUMN_GAP;
    });

    return result;
  }, [displayReviews, columnCount]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  const renderReviewCard = (review: Review, index: number, columnIndex: number) => {
    const isLiked = likedReviews.get(review.id) || false;
    const globalIndex = columns.slice(0, columnIndex).reduce((acc, col) => acc + col.length, 0) + index;

    return (
      <div
        key={review.id}
        className={`review-card ${isTransitioning ? 'card-exit' : 'card-enter'}`}
        style={{ animationDelay: `${globalIndex * 0.05}s` }}
      >
        <div className="review-header">
          <div
            className="user-avatar"
            style={{ backgroundColor: review.userAvatar }}
          >
            {review.userName.charAt(0)}
          </div>
          <div className="user-info">
            <div className="user-name">{review.userName}</div>
            <div className="review-time">{formatTime(review.timestamp)}</div>
          </div>
        </div>

        <div className="review-rating">
          <StarRating rating={review.rating} size={16} animated={true} keyProp={review.id} />
          <span className="rating-text">{review.rating.toFixed(1)}</span>
        </div>

        <div className="review-comment">
          {review.comment}
        </div>

        <div className="review-footer">
          <button
            className={`like-button ${isLiked ? 'liked' : ''}`}
            onClick={() => onLike(review.id)}
            aria-label={isLiked ? '取消点赞' : '点赞'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isLiked ? '#E74C3C' : 'none'}
              stroke={isLiked ? '#E74C3C' : '#8B7355'}
              strokeWidth="2"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
            <span className="like-count">{review.likes}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="review-wall">
      <div className="wall-header">
        <h2 className="wall-title">
          {selectedBook ? `${selectedBook.title} · 书评` : '全部书评'}
        </h2>
      </div>

      <div className="filter-bar">
        <div className="filter-section">
          <span className="filter-label">评分筛选：</span>
          <div className="rating-filters">
            {[5, 4, 3, 2, 1].map(rating => (
              <button
                key={rating}
                className={`rating-chip ${selectedRatings.includes(rating) ? 'active' : ''}`}
                onClick={() => onRatingFilterChange(rating)}
              >
                {rating}星
              </button>
            ))}
          </div>
        </div>

        <div className="sort-section">
          <span className="filter-label">排序：</span>
          <button
            className={`sort-btn ${sortBy === 'latest' ? 'active' : ''}`}
            onClick={() => onSortChange('latest')}
          >
            最新
          </button>
          <button
            className={`sort-btn ${sortBy === 'hottest' ? 'active' : ''}`}
            onClick={() => onSortChange('hottest')}
          >
            最热
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="book-spinner">
            <svg width="80" height="80" viewBox="0 0 64 64" fill="none">
              <g className="book-rotate-group">
                <path
                  d="M32 8L40 24H24L32 8Z"
                  fill="#C49A6C"
                  className="book-page page-1"
                />
                <path
                  d="M32 16L40 32H24L32 16Z"
                  fill="#D4A574"
                  className="book-page page-2"
                />
                <path
                  d="M32 24L40 40H24L32 24Z"
                  fill="#E4B88A"
                  className="book-page page-3"
                />
                <path
                  d="M32 32L40 48H24L32 32Z"
                  fill="#F0CCA0"
                  className="book-page page-4"
                />
                <path
                  d="M24 48H40V52C40 54.2 36.4 56 32 56C27.6 56 24 54.2 24 52V48Z"
                  fill="#8B7355"
                />
              </g>
            </svg>
          </div>
          <p className="loading-text">正在加载书评...</p>
        </div>
      ) : displayReviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p className="empty-text">暂无符合条件的书评</p>
          <p className="empty-hint">试试调整筛选条件吧</p>
        </div>
      ) : (
        <div 
          key={slideKey}
          ref={containerRef}
          className={`masonry-container ${isTransitioning ? 'fading' : ''} slide-in`}
        >
          {columns.map((column, columnIndex) => (
            <div 
              key={columnIndex} 
              className="masonry-column"
              style={{ 
                flex: 1,
                minWidth: columnCount === 1 ? '100%' : '280px',
                gap: COLUMN_GAP
              }}
            >
              {column.map((review, index) => 
                renderReviewCard(review, index, columnIndex)
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewWall;
