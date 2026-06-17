import React, { useState, useCallback, useEffect, useRef } from 'react';
import FrameUploader from './FrameUploader';
import AnimationPlayer from './AnimationPlayer';
import ExportTools from './ExportTools';
import { Frame } from './types';

const App: React.FC = () => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fps, setFps] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fpsHighlight, setFpsHighlight] = useState(false);
  const currentIndexRef = useRef(currentIndex);
  const fpsHighlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (frames.length > 0 && currentIndex >= frames.length) {
      setCurrentIndex(frames.length - 1);
    }
  }, [frames.length, currentIndex]);

  useEffect(() => {
    return () => {
      if (fpsHighlightTimerRef.current) {
        clearTimeout(fpsHighlightTimerRef.current);
      }
    };
  }, []);

  const handleFramesChange = useCallback((newFrames: Frame[]) => {
    setFrames(newFrames);
    if (newFrames.length === 0) {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, []);

  const handleFramesReorder = useCallback((newFrames: Frame[]) => {
    setFrames(newFrames);
    setCurrentIndex(0);
    if (newFrames.length >= 2) {
      setIsPlaying(true);
    }
  }, []);

  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleNextFrame = useCallback(() => {
    setCurrentIndex((prev) => {
      if (frames.length === 0) return prev;
      return (prev + 1) % frames.length;
    });
  }, [frames.length]);

  const handlePrevFrame = useCallback(() => {
    setCurrentIndex((prev) => {
      if (frames.length === 0) return prev;
      return (prev - 1 + frames.length) % frames.length;
    });
  }, [frames.length]);

  const handleTogglePlay = useCallback(() => {
    if (frames.length < 2) return;
    setIsPlaying((prev) => !prev);
  }, [frames.length]);

  const handleFpsChange = useCallback((newFps: number) => {
    setFps(newFps);
    setFpsHighlight(true);
    if (fpsHighlightTimerRef.current) {
      clearTimeout(fpsHighlightTimerRef.current);
    }
    fpsHighlightTimerRef.current = window.setTimeout(() => {
      setFpsHighlight(false);
    }, 500);
  }, []);

  const firstFrame = frames[0];
  const frameSize = firstFrame ? `${firstFrame.width} × ${firstFrame.height}` : '--';

  return (
    <div className="app">
      <header className="top-bar">
        <div className="app-title">帧动画编辑器</div>
        <div className="info-items">
          <div className="info-item">
            <span className="info-label">总帧数</span>
            <span className="info-value">{frames.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">当前帧</span>
            <span className="info-value">
              {frames.length > 0 ? currentIndex + 1 : 0} / {frames.length}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">尺寸</span>
            <span className="info-value">{frameSize}</span>
          </div>
        </div>
        <ExportTools frames={frames} fps={fps} />
      </header>

      <div className="main-content">
        <aside className="side-panel">
          <FrameUploader
            frames={frames}
            onFramesChange={handleFramesChange}
            onFramesReorder={handleFramesReorder}
            selectedIndex={currentIndex}
            onSelect={handleSelect}
          />
        </aside>

        <main className="preview-area">
          <AnimationPlayer
            frames={frames}
            currentIndex={currentIndex}
            onNextFrame={handleNextFrame}
            onPrevFrame={handlePrevFrame}
            fps={fps}
            fpsHighlight={fpsHighlight}
            onFpsChange={handleFpsChange}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
