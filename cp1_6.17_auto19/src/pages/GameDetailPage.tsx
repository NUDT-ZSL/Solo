import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import StarRating from '../components/StarRating';
import Toast from '../components/Toast';
import { fetchGameDetail, submitRating } from '../business/DataFetcher';
import { aggregateRatings, formatDate, formatDateTime } from '../business/RatingAggregator';
import type { GameDetail as GameDetailType, Tag, RatingItem } from '../business/types';

interface GameDetailPageProps {
  onTagClick: (tag: Tag) => void;
}

const COMMENTS_PAGE_SIZE = 5;

export default function GameDetailPage({ onTagClick }: GameDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hoverScore, setHoverScore] = useState(0);
  const [selectedScore, setSelectedScore] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const [visibleCount, setVisibleCount] = useState(COMMENTS_PAGE_SIZE);
  const [localRatings, setLocalRatings] = useState<RatingItem[]>([]);
  const [aggregated, setAggregated] = useState({ average: 0, count: 0, distribution: [0, 0, 0, 0, 0] });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchGameDetail(id)
      .then((data) => {
        setGame(data);
        setLocalRatings(data.ratings);
        setAggregated(data.rating);
        setError(null);
      })
      .catch((e) => {
        setError(e.message || '加载失败');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setVisibleCount(COMMENTS_PAGE_SIZE);
    setSelectedScore(0);
    setHoverScore(0);
    setCommentText('');
  }, [id]);

  const computedAggregate = localRatings.length > 0
    ? aggregateRatings(localRatings)
    : aggregated;

  const showToastMessage = (msg: string) => {
    setToast(null);
    setToastKey((k) => k + 1);
    setTimeout(() => setToast(msg), 10);
  };

  const handleSubmit = useCallback(async () => {
    if (!id || selectedScore === 0 || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitRating({
        gameId: id,
        rating: selectedScore,
        comment: commentText.trim(),
        timestamp: Date.now(),
      });
      setLocalRatings((prev) => [result.rating, ...prev]);
      setAggregated(result.aggregated);
      setSelectedScore(0);
      setCommentText('');
      showToastMessage('评分提交成功');
    } catch (e: any) {
      showToastMessage(e.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [id, selectedScore, commentText, submitting]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          正在加载游戏详情...
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="page-container">
        <Link to="/" className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回作品集
        </Link>
        <div className="loading-spinner" style={{ color: '#e74c3c' }}>
          {error || '游戏不存在'}
        </div>
      </div>
    );
  }

  const visibleRatings = localRatings.slice(0, visibleCount);
  const hasMore = visibleCount < localRatings.length;
  const totalCount = computedAggregate.count;

  return (
    <div className="page-container">
      <Link to="/" className="back-btn" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回
      </Link>

      <div className="detail-layout">
        <div className="detail-cover-wrap">
          <img
            src={game.coverUrl}
            alt={game.title}
            className="detail-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.background = '#f0f0f0';
            }}
          />
        </div>

        <div>
          <h1 className="detail-title">{game.title}</h1>

          <div className="detail-meta">
            <span>发布日期：{formatDate(game.releaseDate)}</span>
            <span>·</span>
            <span>评分人数：{totalCount} 人</span>
          </div>

          <div className="detail-tags">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="tag-chip"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="detail-description">{game.description}</p>

          <div className="rating-section">
            <div className="rating-section-title">评分与评论</div>

            <div className="aggregated-info">
              <div className="aggregated-average">
                {computedAggregate.average.toFixed(1)}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <StarRating
                  value={computedAggregate.average}
                  size="md"
                  showScore
                  count={totalCount}
                />
              </div>
            </div>

            <div className="aggregated-detail">
              {[5, 4, 3, 2, 1].map((star) => {
                const idx = star - 1;
                const count = computedAggregate.distribution[idx] || 0;
                const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                return (
                  <div key={star} className="distribution-bar">
                    <span className="distribution-bar-label">{star}★</span>
                    <div className="distribution-bar-track">
                      <div
                        className="distribution-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="distribution-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>

            <div className="rating-form-card">
              <div className="rating-form-title">发表评价</div>
              <div className="rating-form-row">
                <span className="rating-form-label">选择评分：</span>
                <StarRating
                  value={selectedScore}
                  size="lg"
                  interactive
                  hoverValue={hoverScore}
                  onHover={setHoverScore}
                  onClick={setSelectedScore}
                />
                {selectedScore > 0 && (
                  <span className="rating-form-hint">
                    {selectedScore} 星
                  </span>
                )}
              </div>
              <div className="rating-form-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <span className="rating-form-label">评论内容：</span>
                <textarea
                  className="comment-input"
                  placeholder="写下你对这款游戏的短评（可选）..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={500}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="rating-form-actions">
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={selectedScore === 0 || submitting}
                >
                  {submitting ? '提交中...' : '提交评分'}
                </button>
                {selectedScore === 0 && (
                  <span style={{ fontSize: 12, color: '#999' }}>请先选择星级评分</span>
                )}
              </div>
            </div>
          </div>

          <div className="comments-section">
            <div className="comments-title">
              用户评论（{localRatings.length}）
            </div>

            {localRatings.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#999', fontSize: 14 }}>
                暂无评论，快来抢沙发！
              </div>
            ) : (
              <>
                {visibleRatings.map((rating) => (
                  <div key={rating.id} className="comment-card">
                    <div className="comment-card-header">
                      <div className="comment-card-stars">
                        <StarRating value={rating.score} size="sm" />
                      </div>
                      <span className="comment-card-date">
                        {formatDateTime(rating.createdAt)}
                      </span>
                    </div>
                    {rating.comment && (
                      <p className="comment-card-content">{rating.comment}</p>
                    )}
                  </div>
                ))}

                {hasMore && (
                  <button
                    className="load-more-btn"
                    onClick={() => setVisibleCount((c) => c + COMMENTS_PAGE_SIZE)}
                  >
                    加载更多（剩余 {localRatings.length - visibleCount} 条）
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          key={toastKey}
          message={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
