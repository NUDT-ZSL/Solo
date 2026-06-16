import React, { useRef, useCallback, useEffect, useState } from 'react';
import CoffeeCard from '../components/CoffeeCard';
import CoffeeCardDetail from '../components/CoffeeCardDetail';
import { useApp } from '../context/AppContext';
import type { CoffeeLog, Comment } from '../types';
import { v4 as uuidv4 } from 'uuid';
import '../styles/cards.css';
import '../styles/modal.css';

const Home: React.FC = () => {
  const { logs, loadMoreLogs, hasMoreLogs, user } = useApp();
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});

  const selectedLog = selectedLogId ? logs.find((l) => l.id === selectedLogId) || null : null;

  const getLikeCount = (log: CoffeeLog) => {
    return likeCounts[log.id] !== undefined ? likeCounts[log.id] : log.likes;
  };

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMoreLogs && !loading) {
        setLoading(true);
        loadMoreLogs().finally(() => setLoading(false));
      }
    },
    [hasMoreLogs, loading, loadMoreLogs]
  );

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const handleToggleLike = (id: string) => {
    setLikedSet((prev) => {
      const next = new Set(prev);
      const isCurrentlyLiked = next.has(id);
      if (isCurrentlyLiked) {
        next.delete(id);
      } else {
        next.add(id);
      }
      const delta = isCurrentlyLiked ? -1 : 1;
      setLikeCounts((prevCounts) => {
        const baseLog = logs.find((l) => l.id === id);
        const current = prevCounts[id] !== undefined ? prevCounts[id] : baseLog?.likes || 0;
        return { ...prevCounts, [id]: Math.max(0, current + delta) };
      });
      return next;
    });
  };

  const handleAddComment = (logId: string, content: string) => {
    if (!user) return;
    const newComment: Comment = {
      id: uuidv4(),
      logId,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content,
      createdAt: new Date().toISOString(),
    };
    setCommentsMap((prev) => ({
      ...prev,
      [logId]: [...(prev[logId] || []), newComment],
    }));
  };

  const handleCardClick = (id: string) => {
    setSelectedLogId(id);
  };

  const handleCardLike = (id: string) => {
    handleToggleLike(id);
  };

  const handleCardComment = (id: string) => {
    setSelectedLogId(id);
  };

  const handleChallenge = (id: string) => {
    console.log('Add to challenge:', id);
  };

  const handleCloseDetail = () => {
    setSelectedLogId(null);
  };

  const handleDetailToggleLike = () => {
    if (selectedLogId) handleToggleLike(selectedLogId);
  };

  const handleDetailAddComment = (content: string) => {
    if (selectedLogId) handleAddComment(selectedLogId, content);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="page-header">
        <h1 className="page-title">品鉴广场</h1>
        <p className="page-subtitle">探索咖啡爱好者们的风味记录，点击卡片查看完整详情</p>
      </div>

      {logs.length === 0 && !loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : (
        <div className="masonry-container">
          {logs.map((log: CoffeeLog, index: number) => (
            <CoffeeCard
              key={log.id}
              log={log}
              index={index}
              isLiked={likedSet.has(log.id)}
              likeCount={getLikeCount(log)}
              onLike={handleCardLike}
              onComment={handleCardComment}
              onChallenge={handleChallenge}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      )}

      <div ref={observerRef} style={{ height: hasMoreLogs ? 100 : 0 }} />

      {!hasMoreLogs && logs.length > 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text)', opacity: 0.5 }}>
          — 已经到底啦 —
        </div>
      )}

      {selectedLog && (
        <CoffeeCardDetail
          log={selectedLog}
          onClose={handleCloseDetail}
          user={user}
          isLiked={likedSet.has(selectedLog.id)}
          likeCount={getLikeCount(selectedLog)}
          comments={commentsMap[selectedLog.id] || []}
          onToggleLike={handleDetailToggleLike}
          onAddComment={handleDetailAddComment}
        />
      )}
    </div>
  );
};

export default Home;
