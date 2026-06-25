import React, { useRef, useEffect, useCallback, useState } from 'react';

interface TranscriptViewerProps {
  transcript: string;
  timestamps: { time: number; text: string }[];
  currentTime: number;
  onTimeClick: (time: number) => void;
  onTranscriptChange: (text: string) => void;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  timestamps,
  currentTime,
  onTimeClick,
  onTranscriptChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const findActiveIndex = useCallback(() => {
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (currentTime >= timestamps[i].time) {
        return i;
      }
    }
    return -1;
  }, [currentTime, timestamps]);

  const activeIndex = findActiveIndex();

  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return;
    const segmentEls = containerRef.current.querySelectorAll('[data-segment]');
    const target = segmentEls[activeIndex] as HTMLElement;
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    target.style.backgroundColor = '#fff176';
    target.style.transition = 'background-color 1.5s ease';

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      target.style.backgroundColor = '#fff9c4';
    }, 1500);

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [activeIndex]);

  const handleSegmentClick = (time: number) => {
    onTimeClick(time);
  };

  const handleInput = () => {
    if (containerRef.current) {
      onTranscriptChange(containerRef.current.innerText);
    }
  };

  if (timestamps.length === 0 && !transcript) {
    return (
      <div
        style={{
          padding: 24,
          color: '#888',
          textAlign: 'center',
          fontSize: 14,
        }}
      >
        暂无转录稿内容
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      style={{
        padding: 16,
        minHeight: 200,
        maxHeight: 400,
        overflowY: 'auto',
        lineHeight: 1.8,
        fontSize: 14,
        color: '#e0e0e0',
        outline: 'none',
        background: '#1e1e1e',
        borderRadius: 8,
        border: '1px solid #333',
      }}
    >
      {timestamps.length > 0
        ? timestamps.map((ts, i) => (
            <span
              key={i}
              data-segment
              onClick={() => handleSegmentClick(ts.time)}
              style={{
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 4,
                backgroundColor:
                  i === activeIndex ? '#fff9c4' : 'transparent',
                transition: 'background-color 0.3s ease',
              }}
            >
              <span
                style={{
                  color: '#42a5f5',
                  fontSize: 12,
                  marginRight: 6,
                  userSelect: 'none',
                }}
              >
                {formatTime(ts.time)}
              </span>
              {ts.text}
            </span>
          ))
        : transcript}
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default TranscriptViewer;
