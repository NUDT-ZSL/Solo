import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { HSL } from '../utils/colorUtils';

interface ColorWheelProps {
  primary: HSL;
  onChange: (hsl: HSL) => void;
  size?: number;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ primary, onChange, size = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cachedWheel = useRef<HTMLCanvasElement | null>(null);
  const isDragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const center = size / 2;
  const ringWidth = size * 0.18;
  const outerRadius = center - 4;
  const innerRadius = outerRadius - ringWidth;

  const preRenderWheel = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const steps = 360;

    for (let i = 0; i < steps; i++) {
      const startAngle = ((i - 0.5) * Math.PI * 2) / steps - Math.PI / 2;
      const endAngle = ((i + 1.5) * Math.PI * 2) / steps - Math.PI / 2;

      ctx.beginPath();
      ctx.arc(center, center, outerRadius, startAngle, endAngle);
      ctx.arc(center, center, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      const hue = i;
      const gradient = ctx.createRadialGradient(
        center,
        center,
        innerRadius,
        center,
        center,
        outerRadius
      );

      for (let s = 0; s <= 100; s += 10) {
        const t = s / 100;
        const r = innerRadius + (outerRadius - innerRadius) * t;
        gradient.addColorStop(t, `hsl(${hue}, ${s}%, 50%)`);
        void r;
      }

      ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
      ctx.fill();
    }

    const innerCircle = ctx.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      innerRadius
    );
    innerCircle.addColorStop(0, '#1f2937');
    innerCircle.addColorStop(1, '#111827');
    ctx.beginPath();
    ctx.arc(center, center, innerRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = innerCircle;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center, center, innerRadius - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, outerRadius + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();

    cachedWheel.current = canvas;
  }, [size, center, outerRadius, innerRadius]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cachedWheel.current) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(cachedWheel.current, 0, 0);

    const angleRad = ((primary.h - 90) * Math.PI) / 180;
    const midRadius = (innerRadius + outerRadius) / 2;

    const indicatorX = center + Math.cos(angleRad) * midRadius;
    const indicatorY = center + Math.sin(angleRad) * midRadius;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center, center);
    const rayEndX = center + Math.cos(angleRad) * (outerRadius + 2);
    const rayEndY = center + Math.sin(angleRad) * (outerRadius + 2);
    ctx.lineTo(rayEndX, rayEndY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 12, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${primary.h}, 85%, 55%)`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    void primary.s;
    void primary.l;
  }, [size, center, innerRadius, outerRadius, primary.h]);

  useEffect(() => {
    preRenderWheel();
  }, [preRenderWheel]);

  useEffect(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(render);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [render]);

  useEffect(() => {
    forceRender((n) => n + 1);
  }, [size]);

  const getAngleFromEvent = useCallback(
    (clientX: number, clientY: number): number => {
      const canvas = canvasRef.current;
      if (!canvas) return primary.h;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      return angle;
    },
    [primary.h]
  );

  const updateColorFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const hue = getAngleFromEvent(clientX, clientY);
      onChange({ h: Math.round(hue), s: primary.s, l: primary.l });
    },
    [getAngleFromEvent, onChange, primary.s, primary.l]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDragging.current = true;
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      updateColorFromEvent(e.clientX, e.clientY);
    },
    [updateColorFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      updateColorFromEvent(e.clientX, e.clientY);
    },
    [updateColorFromEvent]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDragging.current = false;
      try {
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    []
  );

  const devicePixelRatio = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, 2);
  }, []);

  const canvasWidth = size * devicePixelRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvasWidth;
    canvas.height = canvasWidth;
    ctx.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      0,
      0
    );
  }, [canvasWidth, devicePixelRatio]);

  return (
    <div
      className="color-wheel-wrapper"
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        className="color-wheel-canvas"
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};

export default ColorWheel;
