import { useEffect, useRef, useState, useCallback } from 'react';
import type { Visibility } from '../../server/beaconModel';

interface Beacon {
  id: string;
  x: number;
  y: number;
  text: string;
  visibility: Visibility;
  visits: number;
  createdAt: number;
  initialHue: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  startTime: number;
}

interface MapViewProps {
  beacons: Beacon[];
  ripples: Ripple[];
  onMapClick: (x: number, y: number) => void;
  onBeaconClick: (beacon: Beacon) => void;
}

interface Triangle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  color: string;
}

function generateTerrain(width: number, height: number): Triangle[] {
  const triangles: Triangle[] = [];
  const cols = 8;
  const rows = 8;
  const cellW = width / cols;
  const cellH = height / rows;

  const points: { x: number; y: number }[][] = [];

  for (let r = 0; r <= rows; r++) {
    points[r] = [];
    for (let c = 0; c <= cols; c++) {
      const jitterX = (Math.random() - 0.5) * cellW * 0.3;
      const jitterY = (Math.random() - 0.5) * cellH * 0.3;
      points[r][c] = {
        x: c * cellW + jitterX,
        y: r * cellH + jitterY
      };
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p1 = points[r][c];
      const p2 = points[r][c + 1];
      const p3 = points[r + 1][c + 1];
      const p4 = points[r + 1][c];

      const t1 = (r + c) / (rows + cols);
      const t2 = (r + c + 1) / (rows + cols);

      triangles.push({
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
        x3: p3.x, y3: p3.y,
        color: lerpColor('#0d0d2b', '#1a0a2e', t1 + Math.random() * 0.1)
      });
      triangles.push({
        x1: p1.x, y1: p1.y,
        x2: p3.x, y2: p3.y,
        x3: p4.x, y3: p4.y,
        color: lerpColor('#0d1b2a', '#1a0a2e', t2 + Math.random() * 0.1)
      });
    }
  }

  return triangles;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * Math.min(Math.max(t, 0), 1));
  const g = Math.round(g1 + (g2 - g1) * Math.min(Math.max(t, 0), 1));
  const b = Math.round(b1 + (b2 - b1) * Math.min(Math.max(t, 0), 1));

  return `rgb(${r},${g},${b})`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function MapView({ beacons, ripples, onMapClick, onBeaconClick }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const terrainRef = useRef<Triangle[]>([]);
  const [hoveredBeacon, setHoveredBeacon] = useState<Beacon | null>(null);
  const [canvasSize, setCanvasSize] = useState(400);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 800 || window.innerHeight < 600) {
        setCanvasSize(300);
      } else {
        setCanvasSize(400);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    terrainRef.current = generateTerrain(canvasSize, canvasSize);
  }, [canvasSize]);

  const getBeaconAt = useCallback((x: number, y: number): Beacon | null => {
    const scale = canvasSize / 400;
    for (let i = beacons.length - 1; i >= 0; i--) {
      const b = beacons[i];
      const bx = b.x * scale;
      const by = b.y * scale;
      const dx = x - bx;
      const dy = y - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 10) {
        return b;
      }
    }
    return null;
  }, [beacons, canvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = Date.now();
      const scale = canvasSize / 400;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(0.5, '#1a0a2e');
      gradient.addColorStop(1, '#0a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      for (const tri of terrainRef.current) {
        ctx.beginPath();
        ctx.moveTo(tri.x1, tri.y1);
        ctx.lineTo(tri.x2, tri.y2);
        ctx.lineTo(tri.x3, tri.y3);
        ctx.closePath();
        ctx.fillStyle = tri.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(64, 64, 128, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      for (const ripple of ripples) {
        const elapsed = (now - ripple.startTime) / 800;
        if (elapsed > 1) continue;
        const eased = easeOut(elapsed);
        const radius = 60 * eased * scale;
        const alpha = 1 - eased;

        const rippleGradient = ctx.createRadialGradient(
          ripple.x * scale, ripple.y * scale, 0,
          ripple.x * scale, ripple.y * scale, radius
        );
        const hue = 40 + Math.random() * 20;
        const [r, g, b] = hslToRgb(hue, 0.9, 0.6);
        rippleGradient.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.6})`);
        rippleGradient.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.3})`);
        rippleGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.arc(ripple.x * scale, ripple.y * scale, radius, 0, Math.PI * 2);
        ctx.fillStyle = rippleGradient;
        ctx.fill();
      }

      for (const beacon of beacons) {
        const ageMs = now - beacon.createdAt;
        const hueShift = Math.floor(ageMs / 300000) * 5;
        const currentHue = (beacon.initialHue + hueShift) % 360;

        const pulsePhase = (now % 3000) / 3000;
        const brightness = 0.8 + Math.sin(pulsePhase * Math.PI * 2) * 0.1;

        const isHovered = hoveredBeacon?.id === beacon.id;
        const baseRadius = isHovered ? 8 : 6;
        const radius = baseRadius * scale;

        const [r, g, b] = hslToRgb(currentHue, 0.85, brightness);

        const glowRadius = isHovered ? 24 : 18;
        const glowGradient = ctx.createRadialGradient(
          beacon.x * scale, beacon.y * scale, 0,
          beacon.x * scale, beacon.y * scale, glowRadius * scale
        );
        glowGradient.addColorStop(0, `rgba(255, 204, 0, 0.4)`);
        glowGradient.addColorStop(0.3, `rgba(${r},${g},${b},0.3)`);
        glowGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.arc(beacon.x * scale, beacon.y * scale, glowRadius * scale, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(beacon.x * scale, beacon.y * scale, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(beacon.x * scale - radius * 0.3, beacon.y * scale - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        if (isHovered) {
          const text = beacon.text.length > 20 ? beacon.text.slice(0, 20) + '...' : beacon.text;
          ctx.font = `${12 * scale}px sans-serif`;
          const textWidth = ctx.measureText(text).width;
          const padding = 8 * scale;
          const bx = beacon.x * scale - textWidth / 2 - padding;
          const by = beacon.y * scale - 30 * scale;

          ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          roundRect(ctx, bx, by, textWidth + padding * 2, 24 * scale, 6 * scale);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e0e0ff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, beacon.x * scale, by + 12 * scale);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [beacons, ripples, hoveredBeacon, canvasSize]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = 400 / canvasSize;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;

    const beacon = getBeaconAt(e.clientX - rect.left, e.clientY - rect.top);
    if (beacon) {
      onBeaconClick(beacon);
    } else {
      onMapClick(x, y);
    }
  }, [getBeaconAt, onBeaconClick, onMapClick, canvasSize]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const beacon = getBeaconAt(x, y);
    setHoveredBeacon(beacon);
    canvas.style.cursor = beacon ? 'pointer' : 'crosshair';
  }, [getBeaconAt]);

  const handleMouseLeave = useCallback(() => {
    setHoveredBeacon(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize}
      height={canvasSize}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'block',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 0 60px rgba(100, 100, 200, 0.15), inset 0 0 60px rgba(0, 0, 0, 0.5)'
      }}
    />
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
