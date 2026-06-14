import React, { useRef, useEffect, useCallback } from 'react';
import { eventBus } from './eventBus';
import { hslToHex, hexToHsl } from './colorEngine';

const SIZE = 300;
const CENTER = SIZE / 2;
const OUTER_RADIUS = SIZE / 2 - 10;
const INNER_RADIUS = 40;

interface WheelComponentProps {
  hue: number;
  saturation: number;
  lightness: number;
  onColorChange: (hue: number, saturation: number, lightness: number, hex: string) => void;
}

function drawWheel(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, SIZE, SIZE);

  const imageData = ctx.createImageData(SIZE, SIZE);
  const data = imageData.data;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - CENTER;
      const dy = y - CENTER;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= INNER_RADIUS && dist <= OUTER_RADIUS) {
        const angle = Math.atan2(dy, dx);
        const hue = ((angle * 180) / Math.PI + 360) % 360;
        const sat = (dist - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS);
        const [r, g, b] = hslToRgbRaw(hue, sat, 0.5);

        const idx = (y * SIZE + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, OUTER_RADIUS, 0, Math.PI * 2);
  ctx.arc(CENTER, CENTER, INNER_RADIUS, 0, Math.PI * 2, true);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function hslToRgbRaw(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function getPointerPosition(hue: number, saturation: number): { x: number; y: number } {
  const angle = (hue * Math.PI) / 180;
  const dist = INNER_RADIUS + saturation * (OUTER_RADIUS - INNER_RADIUS);
  return {
    x: CENTER + Math.cos(angle) * dist,
    y: CENTER + Math.sin(angle) * dist,
  };
}

function getColorFromPosition(x: number, y: number): { hue: number; saturation: number } | null {
  const dx = x - CENTER;
  const dy = y - CENTER;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < INNER_RADIUS - 5 || dist > OUTER_RADIUS + 5) return null;

  const clampedDist = Math.max(INNER_RADIUS, Math.min(OUTER_RADIUS, dist));
  const angle = Math.atan2(dy, dx);
  const hue = ((angle * 180) / Math.PI + 360) % 360;
  const saturation = (clampedDist - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS);

  return { hue, saturation };
}

const WheelComponent: React.FC<WheelComponentProps> = ({ hue, saturation, lightness, onColorChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number>(0);

  const drawPointer = useCallback((ctx: CanvasRenderingContext2D, h: number, s: number) => {
    const pos = getPointerPosition(h, s);
    const hex = hslToHex(h, s, lightness);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }, [lightness]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWheel(ctx);
    drawPointer(ctx, hue, saturation);
  }, [hue, saturation, drawPointer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    drawWheel(canvas.getContext('2d')!);
  }, []);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(redraw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [redraw]);

  useEffect(() => {
    const unsub = eventBus.on('paletteLoad', (data) => {
      const d = data as { colors: string[] };
      if (d.colors && d.colors.length > 0) {
        const [h, s] = hexToHsl(d.colors[0]);
        onColorChange(h, s, lightness, d.colors[0]);
      }
    });
    return unsub;
  }, [lightness, onColorChange]);

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const result = getColorFromPosition(x, y);
    if (result) {
      draggingRef.current = true;
      const hex = hslToHex(result.hue, result.saturation, lightness);
      onColorChange(result.hue, result.saturation, lightness, hex);
      eventBus.emit('colorSelected', { hue: result.hue, saturation: result.saturation, lightness, hex });
    }
  }, [lightness, onColorChange]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const result = getColorFromPosition(x, y);
    if (result) {
      const hex = hslToHex(result.hue, result.saturation, lightness);
      onColorChange(result.hue, result.saturation, lightness, hex);
      eventBus.emit('colorSelected', { hue: result.hue, saturation: result.saturation, lightness, hex });
    }
  }, [lightness, onColorChange]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = () => handlePointerUp();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: SIZE, height: SIZE, cursor: 'crosshair', touchAction: 'none' }}
      onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      onTouchStart={(e) => {
        const t = e.touches[0];
        handlePointerDown(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
      }}
      onTouchEnd={handlePointerUp}
    />
  );
};

export default WheelComponent;
