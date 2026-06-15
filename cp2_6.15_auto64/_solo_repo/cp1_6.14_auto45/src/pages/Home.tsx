import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PollCard from '../components/PollCard';
import { Poll } from '../types';

const POOL_SIZE = 25;
const ITEM_HEIGHT = 96;
const BUFFER = 5;
const PAGE_SIZE = 100;

const Home: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const visibleRangeRef = useRef({ start: 0, end: 20 });
  const [, forceUpdate] = useState({});

  const loadedPagesRef = useRef<Set<number>>(new Set());

  const loadPollsPage = useCallback(async (pageIndex: number) => {
    if (loadedPagesRef.current.has(pageIndex)) return;
    loadedPagesRef.current.add(pageIndex);

    const offset = pageIndex * PAGE_SIZE;
    try {
      const res = await axios.get('/api/polls', {
        params: { offset, limit: PAGE_SIZE },
      });

      const pollsData = res?.data?.polls;
      const totalData = res?.data?.total;

      if (!Array.isArray(pollsData)) {
        console.warn('Invalid polls data format:', res?.data);
        loadedPagesRef.current.delete(pageIndex);
        return;
      }

      setPolls(prev => {
        const newPolls = [...prev];
        pollsData.forEach((poll: Poll, idx: number) => {
          newPolls[offset + idx] = poll;
        });
        return newPolls;
      });

      if (pageIndex === 0 && typeof totalData === 'number') {
        setTotal(totalData);
      }
    } catch (err) {
      console.error('Failed to load polls:', err);
      loadedPagesRef.current.delete(pageIndex);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPollsPage(0).finally(() => setLoading(false));
  }, [loadPollsPage]);

  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = scrollTopRef.current;
    const clientHeight = containerRef.current.clientHeight;

    const visibleStart = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const visibleEnd = Math.min(total, Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) + BUFFER);

    const midPoint = Math.floor((visibleStart + visibleEnd) / 2 / PAGE_SIZE);
    for (let p = Math.max(0, midPoint - 1); p <= midPoint + 1; p++) {
      if (p * PAGE_SIZE < total) {
        loadPollsPage(p);
      }
    }

    if (
      visibleStart !== visibleRangeRef.current.start ||
      visibleEnd !== visibleRangeRef.current.end
    ) {
      visibleRangeRef.current = { start: visibleStart, end: visibleEnd };
      forceUpdate({});
    }

    animationFrameRef.current = null;
  }, [total, loadPollsPage]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    scrollTopRef.current = containerRef.current.scrollTop;

    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(updateVisibleRange);
    }
  }, [updateVisibleRange]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const visibleItems = useMemo(() => {
    const { start, end } = visibleRangeRef.current;
    const items: { index: number; poll: Poll | null }[] = [];

    const poolStart = start;
    const poolEnd = Math.min(start + POOL_SIZE, end);

    for (let i = poolStart; i < poolEnd; i++) {
      items.push({
        index: i,
        poll: polls[i] || null,
      });
    }

    return items;
  }, [polls]);

  const totalHeight = total * ITEM_HEIGHT;
  const offsetY = visibleRangeRef.current.start * ITEM_HEIGHT;

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
        <div style={{ height: totalHeight, position: 'relative', willChange: 'transform' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${offsetY}px)`,
              willChange: 'transform',
            }}
          >
            {visibleItems.map(({ index, poll }) => (
              <div
                key={`item-${index}`}
                style={{
                  height: ITEM_HEIGHT - 16,
                  marginBottom: '16px',
                  position: 'relative',
                }}
              >
                {poll ? (
                  <PollCard poll={poll} />
                ) : (
                  <div style={styles.skeleton} />
                )}
              </div>
            ))}
          </div>
        </div>

        {loading && polls.length === 0 && (
          <div style={styles.loading}>加载中...</div>
        )}

        {!loading && total === 0 && (
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
    WebkitOverflowScrolling: 'touch',
  },
  skeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a3e',
    borderRadius: '10px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
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

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.3; }
  }
`;
if (!document.getElementById('home-styles')) {
  styleSheet.id = 'home-styles';
  document.head.appendChild(styleSheet);
}

export default Home;
