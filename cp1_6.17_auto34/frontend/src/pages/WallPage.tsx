import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, User } from '../types';
import { fetchPosts, toggleLike } from '../api';
import './WallPage.css';

interface WallPageProps {
  user: User;
  showToast: (msg: string) => void;
  refreshTrigger: number;
}

const WallPage: React.FC<WallPageProps> = ({ user, showToast, refreshTrigger }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [bouncingIds, setBouncingIds] = useState<Set<string>>(new Set());
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await fetchPosts();
      setPosts(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      showToast('加载失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts, refreshTrigger]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(async () => {
      await loadPosts();
      setRefreshing(false);
      setPullDistance(0);
      showToast('刷新成功');
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop <= 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  };

  const handleLike = async (post: Post) => {
    try {
      const updated = await toggleLike(post.id);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      const isLiked = updated.likes.includes(user.id);
      if (isLiked) {
        setBouncingIds((s) => {
          const next = new Set(s);
          next.add(post.id);
          return next;
        });
        setTimeout(() => {
          setBouncingIds((s) => {
            const next = new Set(s);
            next.delete(post.id);
            return next;
          });
        }, 300);
      }
    } catch {
      showToast('操作失败');
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  return (
    <div
      className="page-container wall-page"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="pull-refresh"
        style={{
          height: refreshing ? 60 : pullDistance,
          opacity: refreshing || pullDistance > 20 ? 1 : pullDistance / 60
        }}
      >
        <div
          className={`refresh-spinner ${refreshing ? 'spinning' : ''}`}
          style={{ transform: `rotate(${pullDistance * 6}deg)` }}
        >
          ↻
        </div>
        <span className="refresh-text">
          {refreshing ? '刷新中...' : pullDistance > 60 ? '松开刷新' : '下拉刷新'}
        </span>
      </div>

      <div className="page-content">
        <div className="wall-header">
          <h1 className="page-title">动态墙</h1>
          <p className="wall-subtitle">看看大家发现了什么隐藏美味</p>
        </div>

        {loading ? (
          <div className="loading-state">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p className="empty-text">暂无动态</p>
            <p className="empty-hint">解锁隐藏菜单后分享到这里吧</p>
          </div>
        ) : (
          <div className="wall-grid">
            {posts.map((post, idx) => {
              const isLiked = post.likes.includes(user.id);
              const isBouncing = bouncingIds.has(post.id);
              return (
                <div
                  key={post.id}
                  className="wall-card"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="wall-card-user">
                    {post.userAvatar ? (
                      <img src={post.userAvatar} alt={post.userName} className="wall-avatar" />
                    ) : (
                      <div className="wall-avatar placeholder">{post.userName.charAt(0)}</div>
                    )}
                    <div>
                      <div className="wall-username">{post.userName}</div>
                      <div className="wall-time">{formatTime(post.createdAt)}</div>
                    </div>
                  </div>
                  <div className="wall-card-image">
                    <svg viewBox="0 0 120 120" width="80" height="80">
                      <defs>
                        <linearGradient id={`g-${post.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8D6E63" />
                          <stop offset="100%" stopColor="#5D4037" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M30 40h60c0 28-13 44-30 44S30 68 30 40z"
                        fill={`url(#g-${post.id})`}
                        stroke="#3E2723"
                        strokeWidth="2.5"
                      />
                      <ellipse cx="60" cy="40" rx="30" ry="5" fill="#3E2723" />
                      <path
                        d="M90 43c8 2 13 11 13 22s-5 20-13 22"
                        fill="none"
                        stroke="#3E2723"
                        strokeWidth="2.5"
                      />
                      <ellipse cx="60" cy="40" rx="22" ry="3.5" fill="#FF8A65" />
                      <path
                        d="M50 22c3-7 10-7 13 0M62 18c3-7 10-7 13 0"
                        stroke="#BCAAA4"
                        strokeWidth="1.5"
                        fill="none"
                        opacity="0.8"
                      />
                    </svg>
                  </div>
                  <h3 className="wall-card-title">{post.hiddenMenu.name}</h3>
                  <p className="wall-card-story">{post.hiddenMenu.story}</p>
                  <div className="wall-card-actions">
                    <button
                      className={`like-btn ${isBouncing ? 'bounce' : ''}`}
                      onClick={() => handleLike(post)}
                    >
                      <span className={`like-icon ${isLiked ? 'liked' : ''}`}>
                        {isLiked ? '♥' : '♡'}
                      </span>
                      <span className="like-count">{post.likes.length}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WallPage;
