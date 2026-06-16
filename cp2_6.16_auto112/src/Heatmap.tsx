import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { IntersectionData } from './types';

interface HeatmapProps {
  data: IntersectionData[];
  width: number;
  height: number;
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

const Heatmap: React.FC<HeatmapProps> = ({ data, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    traffic: 0
  });
  const [opacity, setOpacity] = useState(1);
  const dataRef = useRef(data);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    dataRef.current = data;
    setOpacity(0);
    const timer = setTimeout(() => setOpacity(1), 10);
    return () => clearTimeout(timer);
  }, [data]);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    const currentData = dataRef.current;
    const hotspotRadius = Math.max(25, Math.min(width, height) / 16);

    currentData.forEach((point) => {
      const gradient = offCtx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, hotspotRadius
      );
      const alpha = Math.min(0.85, point.traffic / MAX_TRAFFIC);
      gradient.addColorStop(0, getColor(point.traffic, alpha));
      gradient.addColorStop(0.5, getColor(point.traffic, alpha * 0.5));
      gradient.addColorStop(1, getColor(point.traffic, 0));
      offCtx.fillStyle = gradient;
      offCtx.beginPath();
      offCtx.arc(point.x, point.y, hotspotRadius, 0, Math.PI * 2);
      offCtx.fill();
    });

    ctx.filter = 'blur(8px)';
    ctx.drawImage(offCanvas, 0, 0);
    ctx.filter = 'none';
  }, [width, height]);

  useEffect(() => {
    let running = true;
    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const render = (time: number) => {
      if (!running) return;
      if (time - lastTime >= frameInterval) {
        drawHeatmap();
        lastTime = time;
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawHeatmap]);

  const findNearestIntersection = useCallback(
    (mouseX: number, mouseY: number): IntersectionData | null => {
      const currentData = dataRef.current;
      let nearest: IntersectionData | null = null;
      let minDist = Infinity;
      const threshold = 30;

      for (const point of currentData) {
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
        let tooltipX = e.clientX - containerRect.left + 15;
        let tooltipY = e.clientY - containerRect.top - 30;

        if (tooltipX + 100 > containerRect.width) {
          tooltipX = e.clientX - containerRect.left - 115;
        }
        if (tooltipY < 0) {
          tooltipY = e.clientY - containerRect.top + 15;
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
        height: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
          transition: 'opacity 0.3s ease',
          opacity,
          cursor: 'crosshair'
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <div
          style={{
            width: 150,
            height: 12,
            borderRadius: 6,
            background: 'linear-gradient(to right, #3b82f6, #ef4444)'
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: 150,
            fontSize: 10,
            color: '#9ca3af'
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
            opacity: 0.95,
            borderRadius: 8,
            padding: '6px 12px',
            color: '#ffffff',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            zIndex: 10
          }}
        >
          车流量: {tooltip.traffic} 辆/小时
        </div>
      )}
    </div>
  );
};

export default Heatmap;
