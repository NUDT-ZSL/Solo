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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);
  const fpsCounterRef = useRef({ count: 0, lastUpdate: 0 });
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

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

  const updateTooltipPosition = useCallback((clientX: number) => {
    if (!progressBarRef.current) return;
    
    const barRect = progressBarRef.current.getBoundingClientRect();
    const tooltipWidth = 60;
    const edgePadding = 4;
    
    let ratio = (clientX - barRect.left) / barRect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    
    const centerX = ratio * barRect.width;
    let tooltipLeft = centerX - tooltipWidth / 2;
    const minLeft = edgePadding;
    const maxLeft = barRect.width - tooltipWidth - edgePadding;
    tooltipLeft = Math.max(minLeft, Math.min(maxLeft, tooltipLeft));
    
    setTooltipStyle({
      left: `${tooltipLeft}px`,
      transform: 'none',
    });
  }, []);

  const seekToPosition = useCallback((clientX: number) => {
    if (!progressBarRef.current || !lyricsData) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = Math.round(ratio * playerState.duration * 10) / 10;
    setPlayerState({
      currentTime: newTime,
      isPlaying: false,
    });
    updateTooltipPosition(clientX);
  }, [lyricsData, playerState.duration, setPlayerState, updateTooltipPosition]);

  const handleProgressBarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingProgress(true);
    seekToPosition(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      seekToPosition(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
    
    const handleScroll = () => {
      if (progressBarRef.current && playerState.duration > 0) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const ratio = playerState.currentTime / playerState.duration;
        updateTooltipPosition(rect.left + ratio * rect.width);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
  }, [seekToPosition, updateTooltipPosition, playerState.currentTime, playerState.duration]);

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
          
          <div
            ref={progressBarRef}
            style={{
              flex: 1,
              position: 'relative',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              cursor: isDraggingProgress ? 'grabbing' : 'pointer',
            }}
            onMouseDown={handleProgressBarMouseDown}
            title="点击或拖拽跳转时间"
          >
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
                position: 'relative',
                overflow: 'hidden',
                transition: isDraggingProgress ? 'none' : 'height 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isDraggingProgress) {
                  (e.currentTarget as HTMLDivElement).style.height = '8px';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDraggingProgress) {
                  (e.currentTarget as HTMLDivElement).style.height = '6px';
                }
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, var(--accent-color), #ff6b8a)',
                  borderRadius: '3px',
                  transition: isDraggingProgress ? 'none' : 'width 0.1s linear',
                  position: 'relative',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`,
                  transform: 'translate(-50%, -50%)',
                  width: isDraggingProgress ? '18px' : '14px',
                  height: isDraggingProgress ? '18px' : '14px',
                  backgroundColor: 'var(--accent-color)',
                  borderRadius: '50%',
                  boxShadow: '0 0 12px var(--accent-glow)',
                  transition: isDraggingProgress ? 'none' : 'all 0.2s ease',
                }}
              />
            </div>
            {isDraggingProgress && (
              <div
                ref={tooltipRef}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  ...tooltipStyle,
                  padding: '5px 10px',
                  backgroundColor: 'var(--accent-color)',
                  color: 'white',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  marginBottom: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  pointerEvents: 'none',
                  zIndex: 100,
                }}
              >
                {formatTime(playerState.currentTime)}
              </div>
            )}
          </div>
          
          <span className="time-display">
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          💡 点击或拖拽进度条可跳转到任意时间点（精确到0.1秒）
        </div>
      </div>
    </div>
  );
};
