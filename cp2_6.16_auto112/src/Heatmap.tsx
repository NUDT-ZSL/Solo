import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { IntersectionData } from './types';

interface HeatmapProps {
  data: IntersectionData[];
  width: number;
  height: number;
  containerHeight?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  traffic: number;
}

const COLOR_LOW = { r: 59, g: 130, b: 246 };
const COLOR_HIGH = { r: 239, g: 68, b: 68 };
const MAX_TRAFFIC = 500;
const BLUR_RADIUS = 8;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getColor(value: number, alpha: number): string {
  const t = Math.min(1, Math.max(0, value / MAX_TRAFFIC));
  const r = Math.round(lerp(COLOR_LOW.r, COLOR_HIGH.r, t));
  const g = Math.round(lerp(COLOR_LOW.g, COLOR_HIGH.g, t));
  const b = Math.round(lerp(COLOR_LOW.b, COLOR_HIGH.b, t));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const Heatmap: React.FC<HeatmapProps> = ({ data, width, height, containerHeight = 800 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    traffic: 0
  });
  const [displayOpacity, setDisplayOpacity] = useState(1);
  const dataRef = useRef(data);
  const renderPendingRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blurredCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hotspotRadiusRef = useRef(30);

  useEffect(() => {
    hotspotRadiusRef.current = Math.max(25, Math.min(width, height) / 14);
  }, [width, height]);

  useEffect(() => {
    dataRef.current = data;
    renderPendingRef.current = true;
  }, [data]);

  useEffect(() => {
    setDisplayOpacity(0);
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDisplayOpacity(1);
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [data]);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    if (!blurredCanvasRef.current) {
      blurredCanvasRef.current = document.createElement('canvas');
    }

    const offCanvas = offscreenCanvasRef.current;
    const blurredCanvas = blurredCanvasRef.current;

    if (offCanvas.width !== width || offCanvas.height !== height) {
      offCanvas.width = width;
      offCanvas.height = height;
    }
    if (blurredCanvas.width !== width || blurredCanvas.height !== height) {
      blurredCanvas.width = width;
      blurredCanvas.height = height;
    }

    const offCtx = offCanvas.getContext('2d');
    const blurCtx = blurredCanvas.getContext('2d');
    if (!offCtx || !blurCtx) return;

    offCtx.clearRect(0, 0, width, height);
    blurCtx.clearRect(0, 0, width, height);

    const currentData = dataRef.current;
    const hotspotRadius = hotspotRadiusRef.current;

    for (let i = 0; i < currentData.length; i++) {
      const point = currentData[i];
      const alpha = Math.min(0.85, point.traffic / MAX_TRAFFIC);

      const gradient = offCtx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, hotspotRadius
      );
      gradient.addColorStop(0, getColor(point.traffic, alpha));
      gradient.addColorStop(0.4, getColor(point.traffic, alpha * 0.55));
      gradient.addColorStop(0.75, getColor(point.traffic, alpha * 0.2));
      gradient.addColorStop(1, getColor(point.traffic, 0));

      offCtx.fillStyle = gradient;
      offCtx.beginPath();
      offCtx.arc(point.x, point.y, hotspotRadius, 0, Math.PI * 2);
      offCtx.fill();
    }

    blurCtx.filter = `blur(${BLUR_RADIUS}px)`;
    blurCtx.drawImage(offCanvas, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(blurredCanvas, 0, 0);
  }, [width, height]);

  useEffect(() => {
    let running = true;
    let rafId = 0;

    const render = () => {
      if (!running) return;

      if (renderPendingRef.current) {
        const start = performance.now();
        drawHeatmap();
        const elapsed = performance.now() - start;
        if (elapsed > 50) {
          console.warn(`Heatmap render took ${elapsed.toFixed(1)}ms (target <50ms)`);
        }
        renderPendingRef.current = false;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [drawHeatmap]);

  useEffect(() => {
    renderPendingRef.current = true;
  }, [width, height]);

  const findNearestIntersection = useCallback(
    (mouseX: number, mouseY: number): IntersectionData | null => {
      const currentData = dataRef.current;
      let nearest: IntersectionData | null = null;
      let minDist = Infinity;
      const threshold = hotspotRadiusRef.current;

      for (let i = 0; i < currentData.length; i++) {
        const point = currentData[i];
        const dist = Math.sqrt((point.x - mouseX) ** 2 + (point.y - mouseY) ** 2);
        if (dist < minDist && dist < threshold) {
          minDist = dist;
          nearest = point;
        }
      }
      return nearest;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const point = findNearestIntersection(mouseX, mouseY);
      if (point) {
        const containerRect = container.getBoundingClientRect();
        const tooltipWidth = 145;
        const tooltipHeight = 36;
        const offsetX = 18;
        const offsetY = 12;

        let tooltipX = e.clientX - containerRect.left + offsetX;
        let tooltipY = e.clientY - containerRect.top - tooltipHeight - offsetY;

        if (tooltipX + tooltipWidth > containerRect.width - 8) {
          tooltipX = e.clientX - containerRect.left - tooltipWidth - offsetX;
        }
        if (tooltipY < 8) {
          tooltipY = e.clientY - containerRect.top + offsetY;
        }
        if (tooltipY + tooltipHeight > containerRect.height - 8) {
          tooltipY = e.clientY - containerRect.top - tooltipHeight - offsetY;
        }
        if (tooltipX < 8) {
          tooltipX = e.clientX - containerRect.left + offsetX;
        }

        setTooltip({
          visible: true,
          x: tooltipX,
          y: tooltipY,
          traffic: point.traffic
        });
      } else {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    },
    [width, height, findNearestIntersection]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: containerHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          maxWidth: width,
          height: 'auto',
          borderRadius: 12,
          transition: 'opacity 0.3s ease-in-out',
          opacity: displayOpacity,
          cursor: 'crosshair',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            width: 160,
            height: 14,
            borderRadius: 7,
            background: 'linear-gradient(to right, #3b82f6, #a855f7, #ef4444)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: 160,
            fontSize: 10,
            color: '#9ca3af',
            fontWeight: 500
          }}
        >
          <span>低流量</span>
          <span>高流量</span>
        </div>
      </div>

      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: '#1f2937',
            opacity: 0.96,
            borderRadius: 8,
            padding: '8px 14px',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 500,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            zIndex: 10,
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            transition: 'opacity 0.12s ease, transform 0.08s ease'
          }}
        >
          车流量: {tooltip.traffic} 辆/小时
        </div>
      )}
    </div>
  );
};

export default Heatmap;
