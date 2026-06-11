import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLyricsStore } from './store/useLyricsStore';
import { formatTime } from './LyricsParser';
import { getAnimationStyle, getActiveLine } from './utils/animation';

export const AnimationPreview: React.FC = () => {
  const lyricsData = useLyricsStore((state) => state.lyricsData);
  const playerState = useLyricsStore((state) => state.playerState);
  const setPlayerState = useLyricsStore((state) => state.setPlayerState);
  const selectLine = useLyricsStore((state) => state.selectLine);
  
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);
  const fpsCounterRef = useRef({ count: 0, lastUpdate: 0 });

  const activeLine = lyricsData
    ? getActiveLine(lyricsData.lines, playerState.currentTime)
    : null;

  const renderFrame = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    fpsCounterRef.current.count++;
    if (timestamp - fpsCounterRef.current.lastUpdate >= 1000) {
      setFps(fpsCounterRef.current.count);
      fpsCounterRef.current.count = 0;
      fpsCounterRef.current.lastUpdate = timestamp;
    }

    setPlayerState((prev) => {
      if (!prev.isPlaying) return prev;
      
      const newTime = (prev.currentTime ?? 0) + deltaTime;
      
      if (newTime >= (prev.duration ?? 0)) {
        return {
          ...prev,
          currentTime: prev.duration,
          isPlaying: false,
        };
      }
      
      return {
        ...prev,
        currentTime: Math.round(newTime * 10) / 10,
      };
    });

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [setPlayerState]);

  useEffect(() => {
    if (playerState.isPlaying) {
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerState.isPlaying, renderFrame]);

  useEffect(() => {
    if (activeLine) {
      selectLine(activeLine.id);
    }
  }, [activeLine, selectLine]);

  const handlePlayPause = useCallback(() => {
    if (!lyricsData) return;
    
    if (playerState.currentTime >= playerState.duration) {
      setPlayerState({ currentTime: 0, isPlaying: true });
    } else {
      setPlayerState({ isPlaying: !playerState.isPlaying });
    }
  }, [lyricsData, playerState, setPlayerState]);

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setPlayerState({ 
      currentTime: Math.round(newTime * 10) / 10,
      isPlaying: false,
    });
  }, [setPlayerState]);

  if (!lyricsData) {
    return (
      <div className="preview-panel">
        <div className="panel-header">
          <h2>动画预览</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <p className="empty-state-text">
            上传 LRC 歌词文件后<br />在此预览动画效果
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h2>动画预览</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          {fps} FPS
        </span>
      </div>
      
      <div className="preview-container">
        <div ref={stageRef} className="preview-stage">
          {activeLine && (
            <div
              className="lyric-display"
              style={getAnimationStyle(activeLine, playerState.currentTime)}
            >
              {activeLine.text}
            </div>
          )}
        </div>
      </div>
      
      <div className="preview-controls">
        <div className="controls-row">
          <button
            className="btn btn-primary play-btn"
            onClick={handlePlayPause}
            title={playerState.isPlaying ? '暂停' : '播放'}
          >
            {playerState.isPlaying ? '⏸' : '▶'}
          </button>
          
          <input
            type="range"
            className="progress-slider"
            min={0}
            max={playerState.duration}
            step={0.1}
            value={playerState.currentTime}
            onChange={handleProgressChange}
          />
          
          <span className="time-display">
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
