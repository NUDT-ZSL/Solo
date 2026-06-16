import React, { useCallback } from 'react';
import { ChapterEvent } from '../types';

interface TimelineProps {
  events: ChapterEvent[];
  highlightedEventId: string | null;
  onEventClick: (event: ChapterEvent) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  events,
  highlightedEventId,
  onEventClick
}) => {
  const handleClick = useCallback((event: ChapterEvent) => {
    onEventClick(event);
  }, [onEventClick]);

  if (events.length === 0) {
    return (
      <div className="timeline-panel">
        <div className="timeline-header">时间线</div>
        <div className="empty-state" style={{ padding: '24px' }}>
          <div className="empty-state-text" style={{ fontSize: '14px' }}>暂无时间线数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-panel">
      <div className="timeline-header">时间线</div>
      <div className="timeline-list">
        {events.map((event) => (
          <div
            key={event.id}
            className={`timeline-item ${highlightedEventId === event.id ? 'highlighted' : ''}`}
            onClick={() => handleClick(event)}
          >
            <div className="timeline-dot" />
            <div className="timeline-chapter">{event.chapterTitle}</div>
            <div className="timeline-title">第 {event.chapter} 章</div>
            <div className="timeline-summary">{event.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;
