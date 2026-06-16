import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import type { ServiceRecord } from '../types';

interface RecordsListProps {
  records: ServiceRecord[];
}

const ITEM_HEIGHT = 52;
const BUFFER = 3;

const RecordsList: React.FC<RecordsListProps> = ({ records }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(360);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { startIndex, endIndex, items, topOffset } = useMemo(() => {
    const totalHeight = records.length * ITEM_HEIGHT;
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + BUFFER * 2;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const end = Math.min(records.length, start + visibleCount);
    const visibleItems = records.slice(start, end);

    return {
      startIndex: start,
      endIndex: end,
      items: visibleItems,
      topOffset: start * ITEM_HEIGHT,
      totalHeight,
    };
  }, [scrollTop, containerHeight, records]);

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
      >
        <div style={{ height: records.length * ITEM_HEIGHT, position: 'relative' }}>
          <div style={{ transform: `translateY(${topOffset}px)` }}>
            {items.map((record, index) => (
              <div
                key={record.id}
                className="record-item"
                style={{ height: ITEM_HEIGHT }}
                data-index={startIndex + index}
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
