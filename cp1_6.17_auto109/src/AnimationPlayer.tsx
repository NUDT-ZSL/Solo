import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './types';

interface AnimationPlayerProps {
  frames: Frame[];
  currentIndex: number;
  onNextFrame: () => void;
  onPrevFrame: () => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  frames,
  currentIndex,
  onNextFrame,
  onPrevFrame,
  fps,
  onFpsChange,
  isPlaying,
  onTogglePlay,
}: AnimationPlayerProps) => {
  const intervalRef = useRef<number | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const onNextFrameRef = useRef(onNextFrame);

  useEffect(() => {
    onNextFrameRef.current = onNextFrame;
  }, [onNextFrame]);

  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      const interval = 1000 / fps;
      intervalRef.current = window.setInterval(() => {
        onNextFrameRef.current();
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, fps, frames.length]);

  useEffect(() => {
    setFadeKey((prev) => prev + 1);
  }, [currentIndex]);

  const currentFrame = frames[currentIndex];

  return (
    <div className="animation-player">
      <div className="preview-container">
        {currentFrame ? (
          <div className="preview-wrapper">
            <div className="checkerboard-bg" />
            <img
              key={fadeKey}
              src={currentFrame.url}
              alt={`Frame ${currentIndex + 1}`}
              className="preview-image fade-in"
              style={{
                maxWidth: '400px',
                maxHeight: '400px',
              }}
            />
          </div>
        ) : (
          <div className="empty-preview">
            <div className="empty-icon">🖼️</div>
            <div className="empty-text">请上传图片帧开始编辑</div>
          </div>
        )}
      </div>

      <div className="controls-bar">
        <button
          className="control-btn prev-btn"
          onClick={onPrevFrame}
          disabled={frames.length === 0}
        >
          ⏮
        </button>

        <button
          className="control-btn play-btn"
          onClick={onTogglePlay}
          disabled={frames.length < 2}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>

        <button
          className="control-btn next-btn"
          onClick={onNextFrame}
          disabled={frames.length === 0}
        >
          ⏭
        </button>

        <div className="fps-control">
          <span className="fps-label">帧率</span>
          <input
            type="range"
            min="5"
            max="24"
            step="1"
            value={fps}
            onChange={(e) => onFpsChange(Number(e.target.value))}
            className="fps-slider"
          />
          <span className="fps-value">{fps} fps</span>
        </div>
      </div>
    </div>
  );
};

export default AnimationPlayer;
