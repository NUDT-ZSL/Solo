import React, { useState, useEffect, useRef } from 'react';
import type { CoffeeLog, Comment, User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import '../styles/modal.css';

interface CoffeeCardDetailProps {
  log: CoffeeLog;
  onClose: () => void;
  user: User | null;
  isLiked: boolean;
  likeCount: number;
  comments: Comment[];
  onToggleLike: () => void;
  onAddComment: (content: string) => void;
}

const CoffeeCardDetail: React.FC<CoffeeCardDetailProps> = ({
  log,
  onClose,
  user,
  isLiked,
  likeCount,
  comments,
  onToggleLike,
  onAddComment,
}) => {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (showCommentInput && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [showCommentInput, comments.length]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handleSubmitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setCommentText('');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
          <img src={log.photoUrl} alt={log.beanName} className="modal-photo" />
        </div>

        <div className="modal-body" ref={bodyRef}>
          <h2 className="modal-title">{log.beanName}</h2>
          <div className="modal-origin">📍 {log.origin} · {formatDate(log.createdAt)}</div>

          <div className="modal-meta-grid">
            <div className="meta-card">
              <div className="meta-card-label">烘焙度</div>
              <div className="meta-card-value">{log.roast}</div>
            </div>
            <div className="meta-card">
              <div className="meta-card-label">处理法</div>
              <div className="meta-card-value">{log.process}</div>
            </div>
            <div className="meta-card">
              <div className="meta-card-label">豆种</div>
              <div className="meta-card-value">{log.beanType || '其他'}</div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <span>🫘</span>
              <span>风味轮</span>
            </div>
            <div className="modal-flavors">
              {log.flavors.map((f) => (
                <span
                  key={f.name}
                  className="flavor-chip"
                  style={{ backgroundColor: f.color, cursor: 'default', borderColor: 'rgba(93, 64, 55, 0.2)' }}
                  title={`${f.category} - ${f.description}`}
                >
                  {f.name}
                </span>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <span>☕</span>
              <span>冲煮参数</span>
            </div>
            <div className="modal-brew-grid">
              <div className="brew-item">
                <div className="brew-item-label">水温</div>
                <div className="brew-item-value">{log.waterTemp}°C</div>
              </div>
              <div className="brew-item">
                <div className="brew-item-label">研磨度</div>
                <div className="brew-item-value">{log.grindSize}</div>
              </div>
              <div className="brew-item">
                <div className="brew-item-label">冲煮时间</div>
                <div className="brew-item-value">{log.brewTime}</div>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <span>📝</span>
              <span>冲煮备注</span>
            </div>
            <div className="modal-notes">{log.notes}</div>
          </div>

          <div className="modal-section comments-section">
            <div className="modal-section-title">
              <span>💬</span>
              <span>评论 ({comments.length})</span>
            </div>

            {showCommentInput && (
              <div className="comment-input-wrap">
                <input
                  type="text"
                  className="comment-input"
                  placeholder={user ? '写下你的评论...' : '请先登录'}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!user}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitComment();
                  }}
                  autoFocus
                />
                <button
                  className="comment-submit"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                >
                  发送
                </button>
              </div>
            )}

            {comments.length === 0 && !showCommentInput ? (
              <div className="comments-empty">还没有评论，来发表第一条吧～</div>
            ) : (
              <ul className="comments-list">
                {comments.map((c) => (
                  <li key={c.id} className="comment-item">
                    <img src={c.avatar} alt={c.username} className="comment-avatar" />
                    <div className="comment-body">
                      <div className="comment-header">
                        <span className="comment-author">{c.username}</span>
                        <span className="comment-time">{formatTime(c.createdAt)}</span>
                      </div>
                      <div className="comment-text">{c.content}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className={`modal-action-btn ${isLiked ? 'liked' : ''}`}
            onClick={onToggleLike}
          >
            <span className="action-icon">{isLiked ? '♥' : '♡'}</span>
            <span>{isLiked ? '已点赞' : '点赞'}</span>
            <span>({likeCount})</span>
          </button>
          <button
            className="modal-action-btn"
            onClick={() => setShowCommentInput(!showCommentInput)}
          >
            <span className="action-icon">💬</span>
            <span>{showCommentInput ? '收起' : '评论'}</span>
          </button>
          <button className="modal-action-btn">
            <span className="action-icon">🎯</span>
            <span>加入挑战</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoffeeCardDetail;
