import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Marker } from './MarkerManager';

interface WaveformViewerProps {
  currentTime: number;
  duration: number;
  waveformData: Float32Array | null;
  markers: Marker[];
  isPlaying: boolean;
  snapInterval: number;
  onMarkerAdded?: (time: number) => void;
  onMarkerMoved?: (id: string, time: number) => void;
  onMarkerDeleted?: (id: string) => void;
  onSeek?: (time: number) => void;
  isOverview?: boolean;
  height?: string;
}

const SNAP_THRESHOLD = 0.1;
const SCROLL_ANCHOR = 0.25;
const MAX_VISIBLE_DURATION = 30;

const snapTime = (time: number, interval: number): number => {
  if (interval <= 0) return time;
  const snapped = Math.round(time / interval) * interval;
  if (Math.abs(snapped - time) <= SNAP_THRESHOLD) {
    return snapped;
  }
  return time;
};

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const ms = Math.floor((time % 1) * 100);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  currentTime,
  duration,
  waveformData,
  markers,
  isPlaying,
  snapInterval,
  onMarkerAdded,
  onMarkerMoved,
  onMarkerDeleted,
  onSeek,
  isOverview = false,
  height = '100%',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMarkerId, setDragMarkerId] = useState<string | null>(null);
  const [showDeleteBtn, setShowDeleteBtn] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const animationRef = useRef<number>(0);
  const breathPhase = useRef(0);
  const deleteAnimScale = useRef(0);
  const deleteAnimFrame = useRef<number>(0);
  const [deleteBtnScale, setDeleteBtnScale] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        setCanvasSize({ width: rect.width, height: rect.height });
        canvasRef.current.width = rect.width * dpr;
        canvasRef.current.height = rect.height * dpr;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getViewWindow = useCallback(() => {
    if (duration <= 0) return { viewStart: 0, viewEnd: 0 };
    if (isOverview || duration <= MAX_VISIBLE_DURATION) {
      return { viewStart: 0, viewEnd: duration };
    }
    const visibleDuration = Math.min(duration, MAX_VISIBLE_DURATION);
    let viewStart = Math.max(0, currentTime - SCROLL_ANCHOR * visibleDuration);
    let viewEnd = viewStart + visibleDuration;
    if (viewEnd > duration) {
      viewEnd = duration;
      viewStart = Math.max(0, duration - visibleDuration);
    }
    return { viewStart, viewEnd };
  }, [currentTime, duration, isOverview]);

  const timeToX = useCallback((time: number): number => {
    if (duration <= 0 || canvasSize.width <= 0) return 0;
    const { viewStart, viewEnd } = getViewWindow();
    const visibleDuration = viewEnd - viewStart;
    if (visibleDuration <= 0) return 0;
    return ((time - viewStart) / visibleDuration) * canvasSize.width;
  }, [duration, canvasSize.width, getViewWindow]);

  const xToTime = useCallback((x: number): number => {
    if (canvasSize.width <= 0 || duration <= 0) return 0;
    const { viewStart, viewEnd } = getViewWindow();
    const visibleDuration = viewEnd - viewStart;
    if (visibleDuration <= 0) return 0;
    return viewStart + (x / canvasSize.width) * visibleDuration;
  }, [duration, canvasSize.width, getViewWindow]);

  const getMarkerAtPosition = useCallback((x: number): Marker | null => {
    for (const marker of markers) {
      const markerX = timeToX(marker.time);
      const markerRadius = isOverview ? 5 : 12;
      if (Math.abs(x - markerX) <= markerRadius) {
        return marker;
      }
    }
    return null;
  }, [markers, timeToX, isOverview]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isDragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const marker = getMarkerAtPosition(x);
    if (marker) {
      if (showDeleteBtn === marker.id) {
        setShowDeleteBtn(null);
        setSelectedMarker(null);
      } else {
        setShowDeleteBtn(marker.id);
        setSelectedMarker(marker.id);
        setDeleteBtnScale(0);
        requestAnimationFrame(() => setDeleteBtnScale(1));
      }
      return;
    }

    if (showDeleteBtn) {
      setShowDeleteBtn(null);
      setSelectedMarker(null);
      return;
    }

    if (!isOverview) {
      const time = xToTime(x);
      onSeek?.(time);
      onMarkerAdded?.(time);
    }
  }, [isDragging, getMarkerAtPosition, showDeleteBtn, onSeek, onMarkerAdded, xToTime, isOverview]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isOverview || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const marker = getMarkerAtPosition(x);
    if (marker) {
      setIsDragging(true);
      setDragMarkerId(marker.id);
      setShowDeleteBtn(null);
      e.preventDefault();
    }
  }, [isOverview, getMarkerAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragMarkerId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawTime = xToTime(x);
    const snappedTime = snapTime(rawTime, snapInterval);
    onMarkerMoved?.(dragMarkerId, snappedTime);
  }, [isDragging, dragMarkerId, xToTime, snapInterval, onMarkerMoved]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMarkerId(null);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent, markerId: string) => {
    e.stopPropagation();
    onMarkerDeleted?.(markerId);
    setShowDeleteBtn(null);
    setSelectedMarker(null);
  }, [onMarkerDeleted]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragMarkerId(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvasSize;
      if (width === 0 || height === 0) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, width, height);

      const { viewStart, viewEnd } = getViewWindow();
      const visibleDuration = viewEnd - viewStart;

      if (waveformData && waveformData.length > 0 && duration > 0 && visibleDuration > 0) {
        const barWidth = 1.5;
        const gap = 1;
        const barCount = Math.floor(width / (barWidth + gap));

        for (let i = 0; i < barCount; i++) {
          const barTime = viewStart + (i / barCount) * visibleDuration;
          const dataIndex = Math.floor((barTime / duration) * waveformData.length);
          const clampedIndex = Math.max(0, Math.min(dataIndex, waveformData.length - 1));
          const amplitude = waveformData[clampedIndex] || 0;
          const barHeight = amplitude * height * 0.8;
          const x = i * (barWidth + gap);
          const y = (height - barHeight) / 2;

          const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, '#00d4ff');
          gradient.addColorStop(1, '#9333ea');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      if (!isOverview && duration > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        const gridStart = Math.ceil(viewStart / snapInterval) * snapInterval;
        for (let t = gridStart; t <= viewEnd; t += snapInterval) {
          const x = timeToX(t);
          if (x >= 0 && x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);
      }

      if (markers.length > 1) {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (const marker of markers) {
          const x = timeToX(marker.time);
          const y = height / 2;
          if (x < -20 || x > width + 20) continue;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      for (const marker of markers) {
        const x = timeToX(marker.time);
        if (x < -20 || x > width + 20) continue;
        const radius = isOverview ? 4 : 10;
        const isSelected = selectedMarker === marker.id || showDeleteBtn === marker.id;

        ctx.save();
        if (isSelected && !isOverview) {
          ctx.shadowColor = '#ffa500';
          ctx.shadowBlur = 15;
        }

        ctx.fillStyle = '#ffa500';
        ctx.beginPath();
        ctx.arc(x, height / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (isDragging && dragMarkerId === marker.id && !isOverview) {
          const snappedMarkerTime = snapTime(marker.time, snapInterval);
          const snappedX = timeToX(snappedMarkerTime);
          if (Math.abs(snappedX - x) > 0.5) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(snappedX, 0);
            ctx.lineTo(snappedX, height);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
      }

      if (duration > 0 && !isOverview) {
        breathPhase.current += 0.003;
        const breath = (Math.sin(breathPhase.current * 2 * Math.PI * 2) + 1) / 2;
        const lineX = timeToX(currentTime);
        const glowAlpha = 0.5 + breath * 0.5;

        if (lineX >= -5 && lineX <= width + 5) {
          ctx.save();
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10 + breath * 10;
          ctx.strokeStyle = `rgba(255, 255, 255, ${glowAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lineX, 0);
          ctx.lineTo(lineX, height);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (isOverview && duration > 0 && currentTime > 0) {
        const lineX = timeToX(currentTime);
        if (lineX >= 0 && lineX <= width) {
          ctx.save();
          ctx.strokeStyle = '#e94560';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lineX, 0);
          ctx.lineTo(lineX, height);
          ctx.stroke();
          ctx.restore();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [canvasSize, waveformData, markers, currentTime, duration, timeToX, selectedMarker, showDeleteBtn, isOverview, isDragging, dragMarkerId, snapInterval, getViewWindow]);

  const deleteMarker = markers.find((m) => m.id === showDeleteBtn);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height,
        backgroundColor: '#0f0f1a',
        borderRadius: isOverview ? '8px' : '12px',
        overflow: 'hidden',
        cursor: isOverview ? 'default' : (isDragging ? 'grabbing' : 'crosshair'),
      }}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {!isOverview && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}

      {deleteMarker && !isOverview && (
        <button
          key={`delete-${deleteMarker.id}`}
          onClick={(e) => handleDeleteClick(e, deleteMarker.id)}
          style={{
            position: 'absolute',
            left: timeToX(deleteMarker.time) - 12,
            top: '50%',
            transform: `translateY(-50%) translateX(-24px) scale(${deleteBtnScale})`,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#e94560',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(233, 69, 96, 0.5)',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 10,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default WaveformViewer;
