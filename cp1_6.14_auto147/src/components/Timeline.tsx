import React, { useState, useEffect, useRef } from 'react';
import type { TimelineEntry } from '../data-service';

interface TimelineProps {
  entries: TimelineEntry[];
  selectedId: number | null;
  onSelect: (entry: TimelineEntry) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BATCH_SIZE = 20;

const Timeline: React.FC<TimelineProps> = ({ entries, selectedId, onSelect }) => {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [animateIds, setAnimateIds] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleCountRef = useRef(visibleCount);

  visibleCountRef.current = visibleCount;

  const visibleEntries = entries.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    setAnimateIds(new Set());
    const ids = entries.slice(0, BATCH_SIZE).map(e => e.id!);
    requestAnimationFrame(() => {
      setAnimateIds(new Set(ids));
    });
  }, [entries]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (ioEntries) => {
        if (ioEntries[0]?.isIntersecting && visibleCountRef.current < entries.length) {
          const nextCount = Math.min(visibleCountRef.current + BATCH_SIZE, entries.length);
          const newIds = entries.slice(visibleCountRef.current, nextCount).map(e => e.id!);
          setVisibleCount(nextCount);
          requestAnimationFrame(() => {
            setAnimateIds(prev => {
              const next = new Set(prev);
              newIds.forEach(id => next.add(id));
              return next;
            });
          });
        }
      },
      { root: containerRef.current, rootMargin: '100px' }
    );

    observerRef.current = observer;

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <svg width="120" height="90" viewBox="0 0 120 90" style={{ opacity: 0.3 }}>
          <rect x="10" y="30" width="100" height="50" rx="6" fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="4 3"/>
          <line x1="60" y1="5" x2="60" y2="30" stroke="#9ca3af" strokeWidth="2"/>
          <circle cx="60" cy="5" r="4" fill="none" stroke="#9ca3af" strokeWidth="2"/>
          <rect x="25" y="45" width="30" height="4" rx="2" fill="#d1d5db"/>
          <rect x="25" y="55" width="45" height="4" rx="2" fill="#d1d5db"/>
          <rect x="25" y="65" width="38" height="4" rx="2" fill="#d1d5db"/>
        </svg>
        <div style={styles.emptyText}>暂无记录</div>
        <div style={styles.emptyHint}>时间轴将在这里显示您的重要时刻</div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: MONTH_NAMES[date.getMonth()]
    };
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.axisLine} />

      <div style={styles.cardsWrapper}>
        {visibleEntries.map((entry, index) => {
          const { day, month } = formatDate(entry.date);
          const isSelected = selectedId === entry.id;
          const shouldAnimate = animateIds.has(entry.id!);

          return (
            <div
              key={entry.id}
              onClick={() => onSelect(entry)}
              style={{
                ...styles.cardWrapper,
                opacity: shouldAnimate ? 1 : 0,
                transform: shouldAnimate ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.3s ease ${index * 0.02}s, transform 0.3s ease ${index * 0.02}s`
              }}
            >
              <div style={styles.card}>
                <div style={{
                  ...styles.dateBadge,
                  background: isSelected ? '#1d4ed8' : '#3b82f6',
                  boxShadow: isSelected ? '0 4px 12px rgba(29, 78, 216, 0.3)' : '0 2px 8px rgba(59, 130, 246, 0.25)'
                }}>
                  <div style={styles.dateDay}>{day}</div>
                  <div style={styles.dateMonth}>{month}</div>
                </div>

                <div style={styles.cardContent}>
                  <div style={{
                    ...styles.cardTitle,
                    color: isSelected ? '#1e40af' : '#111827'
                  }}>
                    {entry.title}
                  </div>
                  <div style={styles.cardSummary}>
                    {entry.summary}
                  </div>
                  {entry.tags.length > 0 && (
                    <div style={styles.tagRow}>
                      {entry.tags.map((tag, i) => (
                        <span key={i} style={styles.tagPill}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                ...styles.connectorDot,
                background: isSelected ? '#3b82f6' : '#d1d5db',
                boxShadow: isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'
              }} />
            </div>
          );
        })}
      </div>

      {visibleCount < entries.length && (
        <div ref={sentinelRef} style={{ height: 1, width: 1 }} />
      )}

      {visibleCount >= entries.length && entries.length > 0 && (
        <div style={styles.endMarker}>
          <div style={styles.endLine} />
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="#f1f5f9" stroke="#d1d5db" strokeWidth="1.5"/>
            <path d="M12 19L16 23L24 15" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={styles.endText}>已到达时间轴起点</div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    padding: '40px 40px 60px 40px',
    boxSizing: 'border-box'
  } as React.CSSProperties,
  axisLine: {
    position: 'absolute',
    left: '50%',
    top: 40,
    bottom: 40,
    width: 2,
    background: '#d1d5db',
    transform: 'translateX(-50%)',
    zIndex: 0
  },
  cardsWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 1100,
    margin: '0 auto',
    zIndex: 1
  },
  cardWrapper: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 32,
    cursor: 'pointer'
  },
  card: {
    width: '100%',
    maxWidth: 500,
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    padding: 20,
    display: 'flex',
    gap: 18,
    position: 'relative',
    transition: 'all 0.2s ease-in-out',
    border: '1px solid transparent'
  } as React.CSSProperties,
  dateBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  dateDay: {
    color: 'white',
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  dateMonth: {
    color: 'white',
    fontSize: 12,
    fontWeight: 500,
    marginTop: 3,
    opacity: 0.95,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.4,
    color: '#111827',
    transition: 'color 0.2s ease-in-out',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 1.6,
    color: '#6b7280',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  } as React.CSSProperties,
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4
  },
  tagPill: {
    background: '#eff6ff',
    color: '#1e40af',
    fontSize: 12,
    fontWeight: 500,
    padding: '3px 10px',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  connectorDot: {
    position: 'absolute',
    left: '50%',
    top: 38,
    width: 12,
    height: 12,
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    border: '2px solid white',
    transition: 'all 0.2s ease-in-out'
  } as React.CSSProperties,
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 16,
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: 500,
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  emptyHint: {
    fontSize: 13,
    color: '#c8ccd6',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  endMarker: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingBottom: 20
  },
  endLine: {
    width: 2,
    height: 24,
    background: 'linear-gradient(to bottom, #d1d5db, transparent)'
  },
  endText: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  }
};

export default Timeline;
