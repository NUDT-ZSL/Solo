import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { HSL } from '../utils/colorUtils';
import { validateHSL } from '../utils/colorUtils';

interface ColorWheelProps {
  primary: HSL;
  onChange: (hsl: HSL) => void;
  size?: number;
}

interface WheelCache {
  dpr: number;
  size: number;
  pixelBuffer: HTMLCanvasElement;
}

const _HSLtoRGB = (h: number, s: number, l: number): [number, number, number] => {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = s / 100;
  const ll = l / 100;
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return [v, v, v];
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const h2rgb = (t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [
    Math.round(h2rgb(hh + 1 / 3) * 255),
    Math.round(h2rgb(hh) * 255),
    Math.round(h2rgb(hh - 1 / 3) * 255),
  ];
};

const ColorWheel: React.FC<ColorWheelProps> = ({ primary, onChange, size = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<WheelCache | null>(null);
  const isDragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const pendingRender = useRef(false);
  const lastPrimaryRef = useRef<HSL | null>(null);
  const lastSizeRef = useRef<number>(size);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [, forceRender] = useState(0);

  const center = size / 2;
  const ringWidth = size * 0.18;
  const outerRadius = center - 4;
  const innerRadius = outerRadius - ringWidth;

  const devicePixelRatio = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, 2);
  }, []);

  const buildWheelCache = useCallback(
    (targetSize: number, dpr: number): WheelCache => {
      const scaledSize = targetSize * dpr;
      const off = document.createElement('canvas');
      off.width = scaledSize;
      off.height = scaledSize;
      const ctx = off.getContext('2d', { alpha: false })!;
      const cxs = targetSize * dpr / 2;
      const cys = cxs;
      const outR = (targetSize / 2 - 4) * dpr;
      const inR = outR - targetSize * 0.18 * dpr;
      const img = ctx.createImageData(scaledSize, scaledSize);
      const data = img.data;

      for (let y = 0; y < scaledSize; y++) {
        const dy = y - cys;
        for (let x = 0; x < scaledSize; x++) {
          const dx = x - cxs;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const idx = (y * scaledSize + x) * 4;
          if (dist >= inR && dist <= outR) {
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            const t = (dist - inR) / (outR - inR);
            const sat = 55 + t * 45;
            const [r, g, b] = _HSLtoRGB(angle, sat, 55);
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          } else if (dist < inR) {
            const t = dist / inR;
            const rr = Math.round(0x11 + (0x1f - 0x11) * t);
            const gg = Math.round(0x18 + (0x29 - 0x18) * t);
            const bb = Math.round(0x27 + (0x37 - 0x27) * t);
            data[idx] = rr;
            data[idx + 1] = gg;
            data[idx + 2] = bb;
            data[idx + 3] = 255;
          } else {
            data[idx] = 0x11;
            data[idx + 1] = 0x18;
            data[idx + 2] = 0x27;
            data[idx + 3] = 0;
          }
        }
      }
      ctx.putImageData(img, 0, 0);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cxs, cys, inR - dpr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = dpr;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cxs, cys, outR + dpr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
      ctx.restore();

      return { dpr, size: targetSize, pixelBuffer: off };
    },
    []
  );

  const renderIndicators = useCallback(() => {
    pendingRender.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !cacheRef.current) return;
    const ctx = canvas.getContext('2d')!;
    const cache = cacheRef.current;
    const dpr = cache.dpr;
    const s = cache.size;
    const cx = s / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cache.pixelBuffer, 0, 0);

    const hsl = validateHSL(primary);
    const angleRad = ((hsl.h - 90) * Math.PI) / 180;
    const inner = (s / 2 - 4) - s * 0.18;
    const outer = s / 2 - 4;
    const midR = ((inner + outer) / 2) * dpr;
    const cxs = cx * dpr;
    const cys = cxs;

    const rayEndX = cxs + Math.cos(angleRad) * (outer * dpr + 2 * dpr);
    const rayEndY = cys + Math.sin(angleRad) * (outer * dpr + 2 * dpr);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cxs, cys);
    ctx.lineTo(rayEndX, rayEndY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2 * dpr;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 6 * dpr;
    ctx.stroke();
    ctx.restore();

    const indicatorX = cxs + Math.cos(angleRad) * midR;
    const indicatorY = cys + Math.sin(angleRad) * midR;

    ctx.save();
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 12 * dpr, 0, Math.PI * 2);
    const [pr, pg, pb] = _HSLtoRGB(hsl.h, 85, 55);
    ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
    ctx.fill();
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8 * dpr;
    ctx.stroke();
    ctx.restore();

    lastPrimaryRef.current = hsl;
  }, [primary]);

  const scheduleRender = useCallback(() => {
    if (pendingRender.current) return;
    pendingRender.current = true;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(renderIndicators);
  }, [renderIndicators]);

  const setupCanvas = useCallback(
    (s: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scaledSize = s * devicePixelRatio;
      canvas.width = scaledSize;
      canvas.height = scaledSize;
      cacheRef.current = buildWheelCache(s, devicePixelRatio);
      lastPrimaryRef.current = null;
      scheduleRender();
    },
    [buildWheelCache, devicePixelRatio, scheduleRender]
  );

  useEffect(() => {
    setupCanvas(size);
    lastSizeRef.current = size;
  }, [size, setupCanvas]);

  useEffect(() => {
    if (!cacheRef.current) return;
    const prev = lastPrimaryRef.current;
    if (prev && prev.h === primary.h && prev.s === primary.s && prev.l === primary.l) {
      return;
    }
    scheduleRender();
  }, [primary, scheduleRender]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        const newSize = Math.max(200, Math.min(Math.round(cr.width), Math.round(cr.height)));
        if (newSize !== lastSizeRef.current && Math.abs(newSize - lastSizeRef.current) > 8) {
          lastSizeRef.current = newSize;
          cacheRef.current = null;
          setupCanvas(newSize);
          forceRender((n) => n + 1);
        }
      }
    });

    ro.observe(wrapper);
    resizeObserverRef.current = ro;
    return () => {
      ro.disconnect();
      resizeObserverRef.current = null;
    };
  }, [setupCanvas]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const getHueFromEvent = useCallback(
    (clientX: number, clientY: number): number => {
      const canvas = canvasRef.current;
      if (!canvas) return primary.h;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = clientX - cx;
      const y = clientY - cy;
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      return Math.round(angle) % 360;
    },
    [primary.h]
  );

  const updateFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const hue = getHueFromEvent(clientX, clientY);
      const next = validateHSL({ h: hue, s: primary.s, l: primary.l });
      onChange(next);
    },
    [getHueFromEvent, onChange, primary.s, primary.l]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDragging.current = true;
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      updateFromEvent(e.clientX, e.clientY);
    },
    [updateFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      updateFromEvent(e.clientX, e.clientY);
    },
    [updateFromEvent]
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

  return (
    <div
      ref={wrapperRef}
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
