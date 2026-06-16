import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlants } from '../hooks/usePlants';
import { useDiaries } from '../hooks/useDiaries';
import { Diary } from '../types';
import './PlantDetailPage.css';

const ITEM_HEIGHT = 180;
const VISIBLE_ITEMS = 5;

function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plants } = usePlants();
  const { diaries, loading, likeDiary, addComment } = useDiaries(id || null);

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const plant = plants.find(p => p.id === id);

  const getDaysAdopted = (adoptedAt: string | null) => {
    if (!adoptedAt) return 0;
    const now = new Date();
    const adopted = new Date(adoptedAt);
    const diff = now.getTime() - adopted.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLike = async (diaryId: string) => {
    try {
      await likeDiary(diaryId);
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleCommentChange = (diaryId: string, value: string) => {
    setCommentInputs(prev => ({ ...prev, [diaryId]: value }));
  };

  const handleCommentSubmit = async (diaryId: string) => {
    const content = commentInputs[diaryId]?.trim();
    if (!content) return;

    try {
      await addComment(diaryId, content);
      setCommentInputs(prev => ({ ...prev, [diaryId]: '' }));
    } catch (err) {
      console.error('Comment failed:', err);
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const getVisibleDiaries = () => {
    if (!diaries || diaries.length === 0) return [];

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2);
    const endIndex = Math.min(
      diaries.length,
      Math.ceil((scrollTop + VISIBLE_ITEMS * ITEM_HEIGHT) / ITEM_HEIGHT) + 2
    );

    return diaries.slice(startIndex, endIndex).map((diary, index) => ({
      diary,
      index: startIndex + index
    }));
  };

  const visibleDiaries = getVisibleDiaries();
  const totalHeight = diaries.length * ITEM_HEIGHT;

  if (loading && diaries.length === 0) {
    return (
      <div className="plant-detail-page">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <div className="loading-container">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="plant-detail-page">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <div className="error-container">
          <p>未找到该植物</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plant-detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="plant-header-card">
        <div className="header-image">
          🌿 {plant.name}
        </div>
        <div className="header-info">
          <h2 className="plant-name">{plant.name}</h2>
          <p className="plant-meta">
            <span>🌱 已陪伴 {getDaysAdopted(plant.adoptedAt)} 天</span>
            <span className="meta-divider">·</span>
            <span>📝 {diaries.length} 篇日记</span>
          </p>
          <div className="header-growth">
            <div className="growth-info">
              <span className="growth-label">生长分值</span>
              <span className="growth-value">{plant.growthScore}/100</span>
            </div>
            <div className="growth-bar-large">
              <div
                className="growth-fill"
                style={{ width: `${plant.growthScore}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="diaries-section">
        <h3 className="section-title">📖 成长日记</h3>

        {diaries.length === 0 ? (
          <div className="empty-diaries">
            <div className="empty-icon">📝</div>
            <p>还没有日记，去写第一篇日记吧！</p>
            <button
              className="write-first-btn"
              onClick={() => navigate('/mine')}
            >
              去写日记
            </button>
          </div>
        ) : (
          <div
            className="diaries-list-container"
            ref={containerRef}
            onScroll={handleScroll}
            style={{ height: `${VISIBLE_ITEMS * ITEM_HEIGHT + 40}px` }}
          >
            <div
              className="diaries-list-inner"
              style={{ height: totalHeight }}
            >
              {visibleDiaries.map(({ diary, index }) => (
                <DiaryItem
                  key={diary.id}
                  diary={diary}
                  index={index}
                  formatDate={formatDate}
                  onLike={handleLike}
                  commentValue={commentInputs[diary.id] || ''}
                  onCommentChange={handleCommentChange}
                  onCommentSubmit={handleCommentSubmit}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DiaryItemProps {
  diary: Diary;
  index: number;
  formatDate: (date: string) => string;
  onLike: (id: string) => void;
  commentValue: string;
  onCommentChange: (id: string, value: string) => void;
  onCommentSubmit: (id: string) => void;
}

function DiaryItem({
  diary,
  index,
  formatDate,
  onLike,
  commentValue,
  onCommentChange,
  onCommentSubmit
}: DiaryItemProps) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div
      className="diary-item"
      style={{
        position: 'absolute',
        top: index * ITEM_HEIGHT,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT - 16
      }}
    >
      <div className="diary-header">
        <div className="avatar">
          {diary.userName.charAt(0)}
        </div>
        <div className="diary-meta">
          <span className="user-name">{diary.userName}</span>
          <span className="diary-date">{formatDate(diary.createdAt)}</span>
        </div>
        {diary.growthIncrease > 0 && (
          <span className="growth-badge">
            +{diary.growthIncrease} 🌱
          </span>
        )}
      </div>

      <div className="diary-content">
        <p>{diary.content}</p>
        {diary.image && (
          <div className="diary-image">
            <img src={diary.image} alt="日记配图" />
          </div>
        )}
      </div>

      <div className="diary-actions">
        <button
          className={`like-btn ${diary.likedBy.includes('user_001') ? 'liked' : ''}`}
          onClick={() => onLike(diary.id)}
        >
          <span className="heart-icon">❤</span>
          <span>{diary.likes}</span>
        </button>

        <button
          className="comment-toggle-btn"
          onClick={() => setShowComments(!showComments)}
        >
          💬 {diary.comments.length} 评论
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {diary.comments.length > 0 && (
            <div className="comments-list">
              {diary.comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-avatar">
                    {comment.userName.charAt(0)}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-name">{comment.userName}</span>
                      <span className="comment-time">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="comment-input-row">
            <input
              type="text"
              className="comment-input"
              placeholder="说点什么..."
              value={commentValue}
              onChange={(e) => onCommentChange(diary.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCommentSubmit(diary.id);
                }
              }}
            />
            <button
              className="comment-send-btn"
              onClick={() => onCommentSubmit(diary.id)}
              disabled={!commentValue.trim()}
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlantDetailPage;
