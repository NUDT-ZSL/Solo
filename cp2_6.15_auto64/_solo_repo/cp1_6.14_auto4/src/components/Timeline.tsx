import { useRef, useCallback, useEffect, useState } from 'react';
import type { CaptureFrame } from '../types';
import { VIEWPORTS } from '../types';

interface TimelineProps {
  captures: CaptureFrame[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isRecording: boolean;
  isPaused: boolean;
}

export default function Timeline({
  captures,
  selectedIndex,
  onSelect,
  isRecording,
  isPaused,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartIndex = useRef(0);

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartIndex.current = index;
      onSelect(index);
    },
    [onSelect]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;
      const deltaX = e.clientX - dragStartX.current;
      const thumbWidth = 120 + 4;
      const deltaIndex = Math.round(deltaX / thumbWidth);
      const newIndex = Math.max(
        0,
        Math.min(captures.length - 1, dragStartIndex.current + deltaIndex)
      );
      onSelect(newIndex);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, captures.length, onSelect]);

  useEffect(() => {
    if (selectedIndex >= 0 && scrollRef.current) {
      const thumb = scrollRef.current.children[selectedIndex] as HTMLElement;
      if (thumb) {
        thumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedIndex]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMinutes().toString().padStart(2, '0')}:${d
      .getSeconds()
      .toString()
      .padStart(2, '0')}`;
  };

  if (captures.length === 0) return null;

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="timeline-title">录制时间轴</span>
        <span className="timeline-status">
          {isRecording
            ? isPaused
              ? '已暂停 (按空格继续)'
              : '录制中 (按空格暂停)'
            : `共 ${captures.length} 帧`}
        </span>
      </div>
      <div className="timeline-scroll" ref={scrollRef}>
        {captures.map((frame, i) => {
          const firstScreenshot =
            frame.screenshots[VIEWPORTS[0].name] ||
            Object.values(frame.screenshots)[0];
          return (
            <div
              key={frame.timestamp}
              className={`timeline-thumb-wrap ${selectedIndex === i ? 'active' : ''}`}
              onMouseDown={(e) => handleThumbMouseDown(e, i)}
              title={`${formatTime(frame.timestamp)} - Frame ${i + 1}`}
            >
              <img
                className="timeline-thumb"
                src={firstScreenshot}
                alt={`Frame ${i + 1}`}
                draggable={false}
              />
              <span className="timeline-thumb-label">
                {formatTime(frame.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="timeline-slider">
        <input
          type="range"
          min={0}
          max={captures.length - 1}
          value={selectedIndex >= 0 ? selectedIndex : 0}
          onChange={(e) => onSelect(parseInt(e.target.value, 10))}
          className="timeline-range"
        />
      </div>
    </div>
  );
}
