import { useState, useEffect, useRef } from 'react';
import StarRating from './StarRating';
import { Review, Book } from '../api';
import '../styles/ReviewWall.css';

interface ReviewWallProps {
  reviews: Review[];
  loading: boolean;
  selectedRatings: number[];
  sortBy: 'latest' | 'hottest';
  likedReviews: Set<string>;
  onRatingFilterChange: (rating: number) => void;
  onSortChange: (sort: 'latest' | 'hottest') => void;
  onLike: (reviewId: string) => void;
  selectedBook?: Book;
}

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
  const prevReviewsRef = useRef<Review[]>([]);

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

  const renderReviewCard = (review: Review, index: number) => {
    const isLiked = likedReviews.has(review.id);

    return (
      <div
        key={review.id}
        className={`review-card ${isTransitioning ? 'card-exit' : 'card-enter'}`}
        style={{ animationDelay: `${index * 0.05}s` }}
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
          <StarRating rating={review.rating} size={16} animated={false} keyProp={review.id} />
          <span className="rating-text">{review.rating.toFixed(1)}</span>
        </div>

        <div className="review-comment">
          {review.comment}
        </div>

        <div className="review-footer">
          <button
            className={`like-button ${isLiked ? 'liked' : ''}`}
            onClick={() => onLike(review.id)}
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
            <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
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
            </svg>
          </div>
          <p className="loading-text">加载中...</p>
        </div>
      ) : displayReviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p className="empty-text">暂无符合条件的书评</p>
          <p className="empty-hint">试试调整筛选条件吧</p>
        </div>
      ) : (
        <div className={`masonry-container ${isTransitioning ? 'fading' : ''}`}>
          <div className="masonry-column">
            {displayReviews.filter((_, i) => i % 3 === 0).map((review, i) => 
              renderReviewCard(review, i * 3)
            )}
          </div>
          <div className="masonry-column">
            {displayReviews.filter((_, i) => i % 3 === 1).map((review, i) => 
              renderReviewCard(review, i * 3 + 1)
            )}
          </div>
          <div className="masonry-column">
            {displayReviews.filter((_, i) => i % 3 === 2).map((review, i) => 
              renderReviewCard(review, i * 3 + 2)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewWall;
