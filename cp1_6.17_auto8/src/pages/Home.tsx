import React, { useRef, useCallback, useEffect, useState } from 'react';
import CoffeeCard from '../components/CoffeeCard';
import { useApp } from '../context/AppContext';
import type { CoffeeLog } from '../types';
import '../styles/cards.css';

const Home: React.FC = () => {
  const { logs, loadMoreLogs, hasMoreLogs } = useApp();
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

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

  const handleLike = (id: string) => {
    console.log('Like:', id);
  };

  const handleComment = (id: string) => {
    console.log('Comment:', id);
  };

  const handleChallenge = (id: string) => {
    console.log('Add to challenge:', id);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="page-header">
        <h1 className="page-title">品鉴广场</h1>
        <p className="page-subtitle">探索咖啡爱好者们的风味记录，点击风味标签查看详情</p>
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
              onLike={handleLike}
              onComment={handleComment}
              onChallenge={handleChallenge}
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
    </div>
  );
};

export default Home;
