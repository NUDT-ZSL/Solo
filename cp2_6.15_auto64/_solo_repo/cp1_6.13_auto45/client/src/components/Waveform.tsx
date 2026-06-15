import React, { useEffect, useRef, useState, useCallback } from 'react';
import './Waveform.css';

interface WaveformProps {
  waveformData: number[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
}

const Waveform: React.FC<WaveformProps> = ({
  waveformData,
  duration,
  currentTime,
  isPlaying,
  onSeek,
  onPlayPause
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const totalWidth = rect.width * zoom;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#f97316');
    gradient.addColorStop(1, '#fbbf24');

    const playedGradient = ctx.createLinearGradient(0, 0, width, 0);
    playedGradient.addColorStop(0, '#3b82f6');
    playedGradient.addColorStop(1, '#60a5fa');

    const barWidth = totalWidth / waveformData.length;
    const centerY = height / 2;
    const progress = duration > 0 ? currentTime / duration : 0;
    const playedWidth = width * progress;

    waveformData.forEach((peak, index) => {
      const x = index * barWidth - scrollLeft;
      const barHeight = peak * height * 0.7;

      if (x + barWidth < 0 || x > width) return;

      const barPlayedX = x + barWidth * 0.15;
      const barPlayedWidth = barWidth * 0.7;
      
      if (barPlayedX + barPlayedWidth <= playedWidth) {
        ctx.fillStyle = playedGradient;
      } else if (barPlayedX < playedWidth) {
        const splitX = playedWidth;
        ctx.fillStyle = playedGradient;
        ctx.beginPath();
        ctx.roundRect(barPlayedX, centerY - barHeight / 2, splitX - barPlayedX, barHeight, 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(splitX, centerY - barHeight / 2, barPlayedWidth - (splitX - barPlayedX), barHeight, 2);
        ctx.fill();
        return;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      }

      ctx.beginPath();
      ctx.roundRect(barPlayedX, centerY - barHeight / 2, barPlayedWidth, barHeight, 2);
      ctx.fill();
    });

    if (progress > 0 && progress < 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playedWidth, 0);
      ctx.lineTo(playedWidth, height);
      ctx.stroke();
    }
  }, [waveformData, zoom, scrollLeft, currentTime, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    if (zoom === 1) {
      setScrollLeft(0);
    }
  }, [zoom]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
    setZoom(newZoom);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const totalWidth = rect.width * zoom;
    const relativeX = (clickX + scrollLeft) / totalWidth;
    const seekTime = relativeX * duration;
    
    onSeek(Math.max(0, Math.min(duration, seekTime)));
  };

  const remainingTime = duration - currentTime;

  return (
    <div className="waveform-player">
      <div 
        className="waveform-container"
        ref={containerRef}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className="waveform-canvas-large" />
      </div>
      
      <div className="player-controls">
        <button className="play-btn" onClick={onPlayPause}>
          {isPlaying ? (
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="4" y="2" width="3" height="12" rx="1" />
              <rect x="9" y="2" width="3" height="12" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5-9-5.5z" />
            </svg>
          )}
        </button>
        
        <div className="progress-bar" onClick={handleCanvasClick}>
          <div 
            className="progress-fill" 
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
          <div 
            className="progress-thumb" 
            style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>
        
        <span className="time-display">
          -{formatTime(remainingTime)}
        </span>
      </div>
      
      <div className="zoom-indicator">
        缩放: {Math.round(zoom * 100)}%
        <span className="zoom-hint">（鼠标滚轮缩放）</span>
      </div>
    </div>
  );
};

export default Waveform;
