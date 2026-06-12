import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AudioEngine } from './AudioEngine';
import { MarkerManager, Marker } from './MarkerManager';

interface WaveformViewerProps {
  audioEngine: AudioEngine | null;
  markerManager: MarkerManager | null;
  currentTime: number;
  duration: number;
  waveformData: Float32Array | null;
  onMarkerAdded?: (time: number) => void;
  onMarkerMoved?: (id: string, time: number) => void;
  onMarkerDeleted?: (id: string) => void;
  onSeek?: (time: number) => void;
  isOverview?: boolean;
  height?: string;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  audioEngine,
  markerManager,
  currentTime,
  duration,
  waveformData,
  onMarkerAdded,
  onMarkerMoved,
  onMarkerDeleted,
  onSeek,
  isOverview = false,
  height = '100%',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMarkerId, setDragMarkerId] = useState<string | null>(null);
  const [showDeleteBtn, setShowDeleteBtn] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const animationRef = useRef<number>(0);
  const breathPhase = useRef(0);

  useEffect(() => {
    if (!markerManager) return;
    setMarkers(markerManager.getMarkers());
    return markerManager.addListener(() => {
      setMarkers(markerManager.getMarkers());
    });
  }, [markerManager]);

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

  const timeToX = useCallback((time: number): number => {
    if (duration <= 0) return 0;
    return (time / duration) * canvasSize.width;
  }, [duration, canvasSize.width]);

  const xToTime = useCallback((x: number): number => {
    if (canvasSize.width <= 0) return 0;
    return (x / canvasSize.width) * duration;
  }, [duration, canvasSize.width]);

  const getMarkerAtPosition = useCallback((x: number, y: number): Marker | null => {
    const time = xToTime(x);
    const tolerance = isOverview ? 0.1 : 0.05;
    for (const marker of markers) {
      const markerX = timeToX(marker.time);
      const markerRadius = isOverview ? 4 : 10;
      const dx = Math.abs(x - markerX);
      const dy = Math.abs(y - canvasSize.height / 2);
      if (dx <= markerRadius + 5 && dy <= markerRadius + 10) {
        return marker;
      }
    }
    return null;
  }, [markers, timeToX, xToTime, canvasSize.height, isOverview]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isDragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marker = getMarkerAtPosition(x, y);
    if (marker) {
      setShowDeleteBtn(marker.id);
      setSelectedMarker(marker.id);
      return;
    }

    if (showDeleteBtn) {
      setShowDeleteBtn(null);
      setSelectedMarker(null);
    }

    if (onSeek && !isOverview) {
      const time = xToTime(x);
      onSeek(time);
    }

    if (onMarkerAdded && !isOverview) {
      const time = xToTime(x);
      onMarkerAdded(time);
    }
  }, [isDragging, getMarkerAtPosition, showDeleteBtn, onSeek, onMarkerAdded, xToTime, isOverview]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isOverview || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marker = getMarkerAtPosition(x, y);
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
    const time = xToTime(x);
    if (onMarkerMoved) {
      onMarkerMoved(dragMarkerId, time);
    }
  }, [isDragging, dragMarkerId, xToTime, onMarkerMoved]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMarkerId(null);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent, markerId: string) => {
    e.stopPropagation();
    if (onMarkerDeleted) {
      onMarkerDeleted(markerId);
    }
    setShowDeleteBtn(null);
    setSelectedMarker(null);
  }, [onMarkerDeleted]);

  useEffect(() => {
    if (handleMouseUp();
  }, [handleMouseUp]);

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

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#00d4ff');
      gradient.addColorStop(1, '#9333ea');

      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, width, height);

      if (waveformData && waveformData.length > 0 && duration > 0) {
        const barWidth = Math.max(1.5);
        const gap = 1;
        const barCount = Math.floor(width / (barWidth + gap));
        const step = Math.floor(waveformData.length / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * step);
          const amplitude = waveformData[dataIndex] || 0;
          const barHeight = amplitude * height * 0.8;
          const x = i * (barWidth + gap);
          const y = (height - barHeight) / 2;

          const gradient2 = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient2.addColorStop(0, '#00d4ff');
          gradient2.addColorStop(1, '#9333ea');

          ctx.fillStyle = gradient2;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      if (!isOverview && duration > 0) {
        const snapInterval = markerManager?.getSnapInterval() || 0.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        for (let t = 0; t <= duration; t += snapInterval) {
          const x = timeToX(t);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      if (markers.length > 1) {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < markers.length; i++) {
          const x = timeToX(markers[i].time);
          const y = height / 2;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      markers.forEach((marker) => {
        const x = timeToX(marker.time);
        const radius = isOverview ? 4 : 10;
        const isSelected = selectedMarker === marker.id || showDeleteBtn === marker.id;

        if (isSelected && !isOverview) {
          ctx.shadowColor = '#ffa500';
          ctx.shadowBlur = 15;
        }

        ctx.fillStyle = '#ffa500';
        ctx.beginPath();
        ctx.arc(x, height / 2, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      });

      if (duration > 0 && !isOverview) {
        breathPhase.current += 0.003;
        const breath = (Math.sin(breathPhase.current * 2 * Math.PI * 2) + 1) / 2;
        const lineX = timeToX(currentTime);
        const glowAlpha = 0.5 + breath * 0.5;

        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10 + breath * 10;
        ctx.strokeStyle = `rgba(255, 255, 255, ${glowAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, height);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [canvasSize, waveformData, markers, currentTime, duration, timeToX, selectedMarker, showDeleteBtn, isOverview, markerManager]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

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
          }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}

      {showDeleteBtn && !isOverview && (() => {
        const marker = markers.find((m) => m.id === showDeleteBtn);
        if (!marker) return null;
        const x = timeToX(marker.time);
        return (
          <button
            onClick={(e) => handleDeleteClick(e, marker.id)}
            style={{
              position: 'absolute',
              left: x - 12,
              top: '50%',
              transform: 'translateY(-50%) translateX(-24px)',
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
              animation: 'deleteBtnPopIn 0.2s ease-out',
              boxShadow: '0 2px 8px rgba(233, 69, 96, 0.5)',
            }}
          >
            ×
          </button>
        );
      })()}

      <style>{`
        @keyframes deleteBtnPopIn {
          0% { transform: translateY(-50%) translateX(-24px) scale(0); opacity: 0; }
          70% { transform: translateY(-50%) translateX(-24px) scale(1.2); }
          100% { transform: translateY(-50%) translateX(-24px) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WaveformViewer;
