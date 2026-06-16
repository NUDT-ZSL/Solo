import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import type { ServiceRecord } from '../types';

interface RecordsListProps {
  records: ServiceRecord[];
}

const ITEM_HEIGHT = 52;
const BUFFER_SIZE = 5;

const RecordsList: React.FC<RecordsListProps> = ({ records }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(360);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      if (container) {
        setViewportHeight(container.clientHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const virtualState = useMemo(() => {
    const totalHeight = records.length * ITEM_HEIGHT;
    const visibleCount = Math.ceil(viewportHeight / ITEM_HEIGHT);
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(records.length, startIndex + visibleCount + BUFFER_SIZE * 2);
    const visibleItems = records.slice(startIndex, endIndex);
    const topPadding = startIndex * ITEM_HEIGHT;

    return {
      totalHeight,
      startIndex,
      endIndex,
      visibleItems,
      topPadding,
    };
  }, [records, scrollTop, viewportHeight]);

  if (records.length === 0) {
    return (
      <div className="records-virtual-list">
        <div className="empty-state">暂无服务记录</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-title" style={{ fontSize: 16 }}>
        📝 服务记录（共 {records.length} 条）
      </div>
      <div
        ref={containerRef}
        className="records-virtual-list"
        onScroll={handleScroll}
        style={{ overflowY: 'auto' }}
      >
        <div
          style={{
            height: virtualState.totalHeight,
            position: 'relative',
            width: '100%',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${virtualState.topPadding}px)`,
            }}
          >
            {virtualState.visibleItems.map((record) => (
              <div
                key={record.id}
                className="record-item"
                style={{
                  height: ITEM_HEIGHT,
                  boxSizing: 'border-box',
                }}
              >
                <div className="record-info">
                  <div style={{ fontWeight: 500, color: '#2D3748' }}>
                    {record.volunteerName} · {record.activityName}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{record.date}</div>
                </div>
                <div className="record-hours">{record.hours}h</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordsList;
