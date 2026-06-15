import { Record, RECORD_TYPE_CONFIG } from '../types';
import { useEffect, useState } from 'react';

interface RecordTimelineProps {
  records: Record[];
}

export default function RecordTimeline({ records }: RecordTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(records.length);

  useEffect(() => {
    setVisibleCount(records.length);
  }, [records.length]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const formatValue = (record: Record) => {
    if (record.value === undefined) return '';
    switch (record.type) {
      case 'weight':
        return `${record.value} kg`;
      case 'walk':
        return `${record.value} 分钟`;
      case 'feeding':
        return `${record.value} g`;
      default:
        return '';
    }
  };

  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div className="empty-state-text">暂无护理记录</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          点击右上角"添加记录"开始记录吧
        </div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {records.map((record, index) => {
        const config = RECORD_TYPE_CONFIG[record.type];
        const animationDelay = `${index * 0.1}s`;

        return (
          <div
            key={record.id}
            className="timeline-item"
            style={{
              animation: `fadeInUp 0.4s ease ${animationDelay} forwards`,
            }}
          >
            <div className={`timeline-dot dot-${record.type}`} />
            <div className="record-card">
              <div className="record-header">
                <span className={`record-type-tag tag-${record.type}`}>
                  {config.label}
                </span>
                <span className="record-time">{formatTime(record.timestamp)}</span>
              </div>
              {record.note && (
                <div className="record-note">{record.note}</div>
              )}
              {record.value !== undefined && (
                <div className="record-value">{formatValue(record)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
