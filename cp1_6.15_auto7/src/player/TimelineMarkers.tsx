import React, { useState, useRef, useEffect } from 'react';
import type { SummaryItem, Speaker, Bookmark } from '../types';
import { formatTime } from '../summary/AISummaryEngine';

interface TimelineMarkersProps {
  summaries: SummaryItem[];
  bookmarks: Bookmark[];
  speakers: Speaker[];
  duration: number;
  onSeek: (time: number) => void;
  currentTime: number;
}

interface HoverInfo {
  type: 'summary' | 'bookmark';
  id: string;
  x: number;
  y: number;
}

const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
  summaries,
  bookmarks,
  speakers,
  duration,
  onSeek,
  currentTime
}) => {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const speakerMap = new Map(speakers.map((s) => [s.id, s]));

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverInfo((prev) =>
      prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev
    );
  };

  useEffect(() => {
    const handleClickOutside = () => setHoverInfo(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderSummaryMarkers = () => {
    if (duration <= 0) return null;

    return summaries.map((summary) => {
      const speaker = speakerMap.get(summary.speakerId);
      const left = (summary.startTime / duration) * 100;
      const width = Math.max(2, ((summary.endTime - summary.startTime) / duration) * 100 - 0.4);
      const isActive = currentTime >= summary.startTime && currentTime < summary.endTime;

      return (
        <div
          key={summary.id}
          className="timeline-marker"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: speaker?.color ?? '#e94560',
            opacity: isActive ? 1 : 0.7,
            transform: isActive ? 'scaleY(1.3)' : 'scaleY(1)',
            boxShadow: isActive ? `0 0 8px ${speaker?.color ?? '#e94560'}` : 'none'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(summary.startTime);
          }}
          onMouseEnter={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            setHoverInfo({
              type: 'summary',
              id: summary.id,
              x: rect ? e.clientX - rect.left : 0,
              y: rect ? e.clientY - rect.top : 0
            });
          }}
          onMouseLeave={() => setHoverInfo(null)}
          onMouseMove={handleMouseMove}
        />
      );
    });
  };

  const renderBookmarkMarkers = () => {
    if (duration <= 0) return null;

    return bookmarks.map((bookmark) => {
      const left = (bookmark.timestamp / duration) * 100;

      return (
        <div
          key={`bm-${bookmark.id}`}
          className="bookmark-marker"
          style={{ left: `${left}%` }}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(bookmark.timestamp);
          }}
          onMouseEnter={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            setHoverInfo({
              type: 'bookmark',
              id: bookmark.id,
              x: rect ? e.clientX - rect.left : 0,
              y: rect ? e.clientY - rect.top : 0
            });
          }}
          onMouseLeave={() => setHoverInfo(null)}
          onMouseMove={handleMouseMove}
          title={bookmark.text}
        >
          <div className="bookmark-dot" />
        </div>
      );
    });
  };

  const renderHoverCard = () => {
    if (!hoverInfo) return null;

    let content: React.ReactNode = null;

    if (hoverInfo.type === 'summary') {
      const summary = summaries.find((s) => s.id === hoverInfo.id);
      if (!summary) return null;
      const speaker = speakerMap.get(summary.speakerId);
      content = (
        <>
          <div className="hover-card-speaker" style={{ color: speaker?.color }}>
            🎙️ {speaker?.name ?? '未知发言人'}
          </div>
          <div className="hover-card-topic">{summary.topic}</div>
          <div className="hover-card-time">
            ⏱️ {formatTime(summary.startTime)} - {formatTime(summary.endTime)}
          </div>
        </>
      );
    } else {
      const bookmark = bookmarks.find((b) => b.id === hoverInfo.id);
      if (!bookmark) return null;
      content = (
        <>
          <div className="hover-card-speaker" style={{ color: '#e94560' }}>📝 备注</div>
          <div className="hover-card-topic">{bookmark.text}</div>
          <div className="hover-card-time">⏱️ {formatTime(bookmark.timestamp)}</div>
        </>
      );
    }

    return (
      <div
        className="hover-card"
        style={{
          left: `${hoverInfo.x}px`,
          top: `${hoverInfo.y - 10}px`
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="timeline-markers-wrapper" ref={containerRef}>
      <div className="timeline-markers-container">
        {renderSummaryMarkers()}
      </div>
      <div className="timeline-bookmarks-container">
        {renderBookmarkMarkers()}
      </div>
      {renderHoverCard()}

      <style>{`
        .timeline-markers-wrapper {
          position: relative;
          width: 100%;
          height: 32px;
          margin-top: 6px;
        }
        .timeline-markers-container {
          position: relative;
          width: 100%;
          height: 14px;
          display: flex;
          align-items: center;
        }
        .timeline-bookmarks-container {
          position: absolute;
          top: 18px;
          left: 0;
          width: 100%;
          height: 12px;
        }
        .timeline-marker {
          position: absolute;
          height: 12px;
          top: 1px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid rgba(255, 255, 255, 0.9);
          z-index: 1;
        }
        .timeline-marker:hover {
          opacity: 1 !important;
          transform: scaleY(1.2);
        }
        .bookmark-marker {
          position: absolute;
          top: 0;
          transform: translateX(-50%);
          cursor: pointer;
          z-index: 2;
        }
        .bookmark-dot {
          width: 10px;
          height: 10px;
          background-color: #e94560;
          border-radius: 50%;
          border: 2px solid #fff;
          transition: transform 0.2s ease;
        }
        .bookmark-marker:hover .bookmark-dot {
          transform: scale(1.4);
        }
        .hover-card {
          position: absolute;
          transform: translate(-50%, -100%);
          background: rgba(15, 52, 96, 0.95);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 10px 14px;
          min-width: 180px;
          max-width: 260px;
          z-index: 100;
          pointer-events: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        .hover-card-speaker {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .hover-card-topic {
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 4px;
          word-break: break-word;
        }
        .hover-card-time {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};

export default TimelineMarkers;
