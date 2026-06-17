import React, { useEffect, useRef, useState } from 'react';
import { Frame } from './types';

interface AnimationPlayerProps {
  frames: Frame[];
  currentIndex: number;
  onNextFrame: () => void;
  onPrevFrame: () => void;
  fps: number;
  fpsHighlight?: boolean;
  onFpsChange: (fps: number) => void;
  onFpsChangeComplete?: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  frames,
  currentIndex,
  onNextFrame,
  onPrevFrame,
  fps,
  fpsHighlight = false,
  onFpsChange,
  onFpsChangeComplete,
  isPlaying,
  onTogglePlay,
}) => {
  const intervalRef = useRef<number | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const onNextFrameRef = useRef(onNextFrame);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    onNextFrameRef.current = onNextFrame;
  }, [onNextFrame]);

  useEffect(() => {
    const prevPlaying = isPlayingRef.current;
    isPlayingRef.current = isPlaying;
    if (prevPlaying !== isPlaying) {
      console.log(`Play state changed: ${prevPlaying} -> ${isPlaying}`);
    }
  }, [isPlaying]);

  useEffect(() => {
    intervalRef.current = null;

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

  const handleSliderMouseUp = () => {
    if (onFpsChangeComplete) {
      onFpsChangeComplete();
    }
  };

  const handleSliderKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (onFpsChangeComplete) {
        onFpsChangeComplete();
      }
    }
  };

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
          className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
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
            onMouseUp={handleSliderMouseUp}
            onKeyUp={handleSliderKeyUp}
            className="fps-slider"
          />
          <span className={`fps-value ${fpsHighlight ? 'highlight' : ''}`}>
            {fps} fps
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnimationPlayer;
