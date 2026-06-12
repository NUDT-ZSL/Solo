import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import LogCard from './LogCard';
import type { LogEntry, LogsResponse, DateItem } from './types';

const CARD_ESTIMATED_HEIGHT = 84;
const BUFFER_SIZE = 5;

function getRecentDates(): DateItem[] {
  const dates: DateItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];

    let label: string;
    if (i === 0) {
      label = `今天 ${month}/${day}`;
    } else if (i === 1) {
      label = `昨天 ${month}/${day}`;
    } else {
      label = `${weekday} ${month}/${day}`;
    }

    dates.push({
      date: dateStr,
      label,
      isToday: i === 0
    });
  }

  return dates;
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function App() {
  const dates = useMemo(() => getRecentDates(), []);
  const [selectedDate, setSelectedDate] = useState<string>(dates[0].date);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchQuery(value);
        setPage(1);
        setLogs([]);
        setHasMore(true);
      }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const fetchLogs = useCallback(
    async (pageNum: number, date: string, query: string, reset: boolean) => {
      if (loading) return;

      setLoading(true);
      try {
        const params = new URLSearchParams({
          date,
          page: String(pageNum)
        });
        if (query) {
          params.append('q', query);
        }

        const res = await fetch(`/api/logs?${params.toString()}`);
        const data: LogsResponse = await res.json();

        setLogs((prev) => (reset ? data.data : [...prev, ...data.data]));
        setHasMore(data.pagination.hasMore);
        setPage(pageNum);
      } catch (err) {
        console.error('获取日志失败:', err);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    setLogs([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    fetchLogs(1, selectedDate, searchQuery, true);
  }, [selectedDate, searchQuery]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setViewportHeight(container.clientHeight);
    };

    handleResize();
    container.addEventListener('scroll', handleScroll);
    container.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading && logs.length > 0) {
          fetchLogs(page + 1, selectedDate, searchQuery, false);
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '200px'
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, selectedDate, searchQuery, logs.length, fetchLogs]);

  const startIndex = Math.max(0, Math.floor(scrollTop / CARD_ESTIMATED_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(
    logs.length,
    Math.ceil((scrollTop + viewportHeight) / CARD_ESTIMATED_HEIGHT) + BUFFER_SIZE
  );

  const visibleLogs = logs.slice(startIndex, endIndex);
  const totalHeight = logs.length * CARD_ESTIMATED_HEIGHT + (logs.length * 12);
  const offsetY = startIndex * CARD_ESTIMATED_HEIGHT + (startIndex * 12);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          backgroundColor: '#1e1e2e',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px'
        }}
      >
        <div style={{ marginBottom: '32px', padding: '0 8px' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em'
            }}
          >
            LogPage
          </h1>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            操作日志看板
          </p>
        </div>

        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0 8px',
            marginBottom: '12px'
          }}
        >
          选择日期
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {dates.map((d) => {
            const isSelected = d.date === selectedDate;
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                style={{
                  height: '45px',
                  borderRadius: '8px',
                  border: 'none',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 150ms ease',
                  backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                  color: isSelected ? '#ffffff' : '#9ca3af',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#9ca3af';
                  }
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ marginRight: '10px', flexShrink: 0 }}
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    stroke={isSelected ? '#ffffff' : '#6b7280'}
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3 9H21"
                    stroke={isSelected ? '#ffffff' : '#6b7280'}
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8 2V6M16 2V6"
                    stroke={isSelected ? '#ffffff' : '#6b7280'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{d.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 8px 0' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#6b7280',
              borderTop: '1px solid #2d2d3f',
              paddingTop: '16px'
            }}
          >
            共 {logs.length} 条日志
            {searchQuery && (
              <span style={{ color: '#3b82f6' }}>
                {' '}· 搜索: {searchQuery}
              </span>
            )}
          </div>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f9fafb',
          minWidth: 0
        }}
      >
        <header
          style={{
            padding: '20px 32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0
          }}
        >
          <div style={{ width: '60%', position: 'relative' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}
            >
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M20 20L16.65 16.65"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="搜索操作、账号或描述..."
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                padding: '12px 12px 12px 42px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 150ms ease',
                backgroundColor: '#ffffff',
                color: '#1f2937'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setPage(1);
                  setLogs([]);
                  setHasMore(true);
                }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            position: 'relative'
          }}
        >
          {initialLoading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px'
              }}
            >
              <LoadingSpinner />
            </div>
          ) : logs.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#9ca3af'
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                style={{ marginBottom: '16px', opacity: 0.5 }}
              >
                <path
                  d="M9 12H15M9 16H15M9 8H15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <p style={{ fontSize: '14px' }}>暂无日志数据</p>
            </div>
          ) : (
            <div style={{ position: 'relative', height: totalHeight }}>
              <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
                {visibleLogs.map((log, i) => (
                  <LogCard
                    key={log._id}
                    log={log}
                    searchQuery={searchQuery}
                    index={startIndex + i}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={sentinelRef} style={{ height: '1px' }} />

          {loading && !initialLoading && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '24px'
              }}
            >
              <LoadingSpinner />
            </div>
          )}

          {!hasMore && logs.length > 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '24px',
                color: '#9ca3af',
                fontSize: '13px'
              }}
            >
              已加载全部日志
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div
      style={{
        width: '36px',
        height: '36px',
        border: '3px solid #dbeafe',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}
    />
  );
}
