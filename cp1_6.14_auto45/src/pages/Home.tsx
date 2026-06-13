import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PollCard from '../components/PollCard';
import { Poll } from '../types';

const Home: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const ITEM_HEIGHT = 96;
  const BUFFER = 5;

  const loadPolls = useCallback(async (offset: number, limit: number) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/polls', {
        params: { offset, limit },
      });
      setPolls(res.data.polls);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to load polls:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolls(0, 100);
  }, [loadPolls]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const end = Math.min(total, Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) + BUFFER);
    setVisibleRange({ start, end });
  }, [total]);

  const visiblePolls = polls.slice(visibleRange.start, visibleRange.end);
  const offsetY = visibleRange.start * ITEM_HEIGHT;
  const totalHeight = total * ITEM_HEIGHT;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>投票列表</h1>
        <Link to="/create" style={styles.createButton}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          创建投票
        </Link>
      </div>

      <div
        ref={containerRef}
        style={styles.listContainer}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visiblePolls.map((poll) => (
              <div key={poll.id} style={{ marginBottom: '16px' }}>
                <PollCard poll={poll} />
              </div>
            ))}
          </div>
        </div>

        {loading && polls.length === 0 && (
          <div style={styles.loading}>加载中...</div>
        )}

        {!loading && polls.length === 0 && (
          <div style={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={styles.emptyIcon}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <p style={styles.emptyText}>暂无投票</p>
            <Link to="/create" style={styles.emptyCreate}>去创建第一个投票</Link>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    animation: 'fadeInUp 0.4s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    borderRadius: '24px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s ease',
  },
  listContainer: {
    height: 'calc(100vh - 200px)',
    overflowY: 'auto',
    backgroundColor: '#1e1e2e',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
  },
  emptyIcon: {
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '16px',
    marginBottom: '16px',
  },
  emptyCreate: {
    color: '#6366f1',
    fontSize: '14px',
  },
};

export default Home;
