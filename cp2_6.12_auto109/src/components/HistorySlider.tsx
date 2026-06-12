import React, { useState, useRef, useEffect } from 'react';
import { History, Play } from 'lucide-react';

interface HistorySliderProps {
  maxIndex: number;
  currentIndex: number;
  isReplayMode: boolean;
  onReplayIndexChange: (index: number) => void;
  onReplayModeChange: (enabled: boolean) => void;
}

const HistorySlider: React.FC<HistorySliderProps> = ({
  maxIndex,
  currentIndex,
  isReplayMode,
  onReplayIndexChange,
  onReplayModeChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsDragging(true);
    if (!isReplayMode) {
      onReplayModeChange(true);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    let clientX: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const x = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.round(progress * maxIndex);
    onReplayIndexChange(index);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchend', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchend', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  const progress = maxIndex > 0 ? (currentIndex / maxIndex) * 100 : 0;

  return (
    <div className="history-slider-container">
      <div className="history-slider">
        <div className="slider-icon">
          <History size={18} />
        </div>
        <div
          ref={sliderRef}
          className="slider-track"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
        >
          <div className="slider-progress" style={{ width: `${progress}%` }} />
          <div
            className="slider-thumb"
            style={{ left: `${progress}%` }}
          />
        </div>
        <div className="slider-info">
          {isReplayMode ? `${currentIndex}/${maxIndex}` : `${maxIndex} 操作`}
        </div>
        {isReplayMode && (
          <button
            className="resume-btn"
            onClick={() => onReplayModeChange(false)}
            title="返回实时"
          >
            <Play size={16} />
          </button>
        )}
      </div>

      {isReplayMode && (
        <div className="replay-banner">
          <span>历史回放模式</span>
        </div>
      )}

      <style>{`
        .history-slider-container {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
        }

        .history-slider {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(18, 18, 18, 0.95);
          border-radius: 12px;
