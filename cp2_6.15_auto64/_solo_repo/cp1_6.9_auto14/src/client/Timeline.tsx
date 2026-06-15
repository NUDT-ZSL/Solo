import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { DiaryEntry } from '../shared/types';

interface TimelineProps {
  diaries: DiaryEntry[];
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  renderJournal: (diary: DiaryEntry, isActive: boolean) => ReactNode;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekdays[date.getDay()]}`;
}

const Timeline: React.FC<TimelineProps> = ({
  diaries,
  currentIndex,
  setCurrentIndex,
  renderJournal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  const CARD_WIDTH = 420;
  const CARD_GAP = 40;
  const THUMBNAIL_WIDTH = 210;

  const goToIndex = useCallback(
    (targetIndex: number, animate = true) => {
      if (isAnimating && animate) return;
      const clampedIndex = Math.max(0, Math.min(diaries.length - 1, targetIndex));
      if (clampedIndex === currentIndex && !animate) return;

      if (animate) {
        setIsAnimating(true);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = window.setTimeout(() => {
          setIsAnimating(false);
          setCurrentIndex(clampedIndex);
        }, 400);
      }
      setCurrentIndex(clampedIndex);
    },
    [currentIndex, diaries.length, isAnimating, setCurrentIndex]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (isAnimating) return;
      if (e.deltaX > 30 || e.deltaY > 30) {
        goToIndex(currentIndex + 1);
      } else if (e.deltaX < -30 || e.deltaY < -30) {
        goToIndex(currentIndex - 1);
      }
    },
    [currentIndex, goToIndex, isAnimating]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setDragDelta(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    setDragDelta(delta);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragDelta) > 80) {
      goToIndex(currentIndex + (dragDelta < 0 ? 1 : -1));
    }
    setDragDelta(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (Math.abs(dragDelta) > 80) {
        goToIndex(currentIndex + (dragDelta < 0 ? 1 : -1));
      }
      setDragDelta(0);
    }
  };

  const [touchStartX, setTouchStartX] = useState(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setDragDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX;
    setDragDelta(delta);
  };

  const handleTouchEnd = () => {
    if (Math.abs(dragDelta) > 80) {
      goToIndex(currentIndex + (dragDelta < 0 ? 1 : -1));
    }
    setDragDelta(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToIndex(currentIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        goToIndex(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, goToIndex]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  const getCardStyle = (index: number): React.CSSProperties => {
    const offset = index - currentIndex;
    const dragFactor = dragDelta / (CARD_WIDTH + CARD_GAP);
    const adjustedOffset = offset - (isDragging ? dragFactor : 0);
    const absOffset = Math.abs(adjustedOffset);

    let translateX = adjustedOffset * (CARD_WIDTH + CARD_GAP);
    let scale = 1;
    let opacity = 1;
    let rotateY = 0;
    let zIndex = 10 - absOffset;

    if (absOffset >= 1) {
      scale = 0.5;
      opacity = 0.7;
      translateX = adjustedOffset * (THUMBNAIL_WIDTH + CARD_GAP + CARD_WIDTH / 2 - THUMBNAIL_WIDTH / 2);
    }

    if (isAnimating && absOffset < 0.5) {
      rotateY = (adjustedOffset < 0 ? -1 : 1) * 90 * (1 - absOffset * 2);
    }

    return {
      transform: `translateX(${translateX}px) scale(${scale}) perspective(1200px) rotateY(${rotateY}deg)`,
      opacity,
      zIndex,
      transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  return (
    <div className="timeline-outer">
      <div
        className="timeline-container"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="timeline-track">
          {diaries.map((diary, index) => (
            <div
              key={diary.id}
              className="timeline-card-slot"
              style={getCardStyle(index)}
            >
              {renderJournal(diary, index === currentIndex)}
            </div>
          ))}
        </div>

        <div className="timeline-dates">
          {diaries.map((diary, index) => {
            const offset = index - currentIndex;
            const dragFactor = dragDelta / (CARD_WIDTH + CARD_GAP);
            const adjustedOffset = offset - (isDragging ? dragFactor : 0);
            const absOffset = Math.abs(adjustedOffset);

            let translateX = adjustedOffset * (CARD_WIDTH + CARD_GAP);
            let opacity = absOffset <= 1.5 ? 1 - absOffset * 0.3 : 0;

            if (absOffset >= 1) {
              translateX = adjustedOffset * (THUMBNAIL_WIDTH + CARD_GAP + CARD_WIDTH / 2 - THUMBNAIL_WIDTH / 2);
            }

            return (
              <div
                key={`date-${diary.id}`}
                className={`timeline-date-label ${index === currentIndex ? 'active' : ''}`}
                style={{
                  transform: `translateX(${translateX}px)`,
                  opacity,
                  transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {formatDateLabel(diary.date)}
              </div>
            );
          })}
        </div>

        <div className="timeline-nav">
          <button
            className="nav-btn prev"
            onClick={() => goToIndex(currentIndex - 1)}
            disabled={currentIndex === 0 || isAnimating}
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            className="nav-btn next"
            onClick={() => goToIndex(currentIndex + 1)}
            disabled={currentIndex === diaries.length - 1 || isAnimating}
            aria-label="下一张"
          >
            ›
          </button>
        </div>

        <div className="timeline-indicators">
          {diaries.map((_, index) => (
            <button
              key={index}
              className={`indicator-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToIndex(index)}
              aria-label={`跳转到第${index + 1}张`}
            />
          ))}
        </div>
      </div>

      <div className="timeline-hint">
        ← 左右滑动 / 鼠标拖拽 / 键盘方向键 切换卡片 →
      </div>
    </div>
  );
};

export default Timeline;
