import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { LightOrb, NoteEvent, UserInfo } from '../types';
import { INSTRUMENT_COLORS } from '../types';

interface CanvasProps {
  notes: NoteEvent[];
  users: UserInfo[];
  orbCounts: Record<string, number>;
}

export const MelodyCanvas: React.FC<CanvasProps> = ({ notes, users, orbCounts }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<LightOrb[]>([]);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth >= 1200 ? 800 : 600;
      const h = window.innerWidth >= 1200 ? 600 : 450;
      setDimensions({ w, h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const userYPositions = users.reduce<Record<string, number>>((acc, u, i) => {
    const spacing = dimensions.h / (users.length + 1);
    acc[u.id] = spacing * (i + 1);
    return acc;
  }, {});

  const createOrb = useCallback((note: NoteEvent): LightOrb | null => {
    const y = userYPositions[note.userId];
    if (y === undefined) return null;
    const baseRadius = 15;
    const maxRadius = 30;
    const radius = baseRadius + (maxRadius - baseRadius) * note.volume;
    const speed = 1 + Math.random() * 2;
    return {
      id: note.id,
      x: 0,
      y,
      radius,
      color: INSTRUMENT_COLORS[note.instrument],
      speed,
      opacity: 0.9,
      createdAt: note.timestamp,
      userId: note.userId,
      trail: []
    };
  }, [userYPositions]);

  useEffect(() => {
    if (notes.length === 0) return;
    const latest = notes[notes.length - 1];
    const existingIds = new Set(orbsRef.current.map(o => o.id));
    if (!existingIds.has(latest.id)) {
      const orb = createOrb(latest);
      if (orb) {
        orbsRef.current.push(orb);
        if (orbsRef.current.length > 200) {
          orbsRef.current = orbsRef.current.slice(-200);
        }
      }
    }
  }, [notes, createOrb]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DURATION = 3000;
    const TRAIL_COUNT = 7;

    const drawGrid = () => {
      ctx.strokeStyle = '#2D2D44';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x <= dimensions.w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dimensions.h);
        ctx.stroke();
      }
      for (let y = 0; y <= dimensions.h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dimensions.w, y);
        ctx.stroke();
      }
    };

    const drawTrackDividers = () => {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      users.forEach((u, i) => {
        const y = userYPositions[u.id];
        if (i > 0) {
          const prevY = userYPositions[users[i - 1].id];
          const midY = (y + prevY) / 2;
          ctx.beginPath();
          ctx.moveTo(0, midY);
          ctx.lineTo(dimensions.w, midY);
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);
    };

    const drawUserLabels = () => {
      users.forEach(u => {
        const y = userYPositions[u.id];
        const color = INSTRUMENT_COLORS[u.instrument];
        ctx.fillStyle = 'rgba(26,26,46,0.85)';
        ctx.fillRect(5, y - 22, 120, 40);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(5, y - 22, 120, 40);

        ctx.fillStyle = '#EAEAEA';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(u.name, 14, y - 5);

        ctx.fillStyle = color;
        ctx.font = '11px sans-serif';
        ctx.fillText(`${u.instrument}`, 14, y + 12);

        ctx.fillStyle = '#AAA';
        ctx.font = '10px sans-serif';
        ctx.fillText(`光球: ${orbCounts[u.id] ?? 0}`, 70, y + 12);
      });
    };

    const render = () => {
      const now = performance.now();

      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, dimensions.w, dimensions.h);

      drawGrid();
      drawTrackDividers();

      const aliveOrbs: LightOrb[] = [];
      const newCounts: Record<string, number> = {};

      for (const orb of orbsRef.current) {
        const elapsed = now - orb.createdAt;
        if (elapsed >= DURATION) continue;

        const progress = elapsed / DURATION;
        orb.x += orb.speed;
        orb.opacity = 0.9 * (1 - progress);

        if (orb.x - orb.radius > dimensions.w) continue;

        orb.trail.unshift({ x: orb.x, y: orb.y, opacity: orb.opacity, radius: orb.radius });
        if (orb.trail.length > TRAIL_COUNT) orb.trail.length = TRAIL_COUNT;

        for (let t = orb.trail.length - 1; t >= 0; t--) {
          const tp = orb.trail[t];
          const tRatio = 1 - t / TRAIL_COUNT;
          const trailOpacity = orb.opacity * tRatio * 0.4;
          const trailRadius = orb.radius * (0.3 + 0.7 * tRatio);

          ctx.beginPath();
          ctx.arc(tp.x, tp.y, trailRadius, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(orb.color, trailOpacity);
          ctx.fill();
        }

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, hexToRgba(orb.color, orb.opacity));
        gradient.addColorStop(0.6, hexToRgba(orb.color, orb.opacity * 0.6));
        gradient.addColorStop(1, hexToRgba(orb.color, 0));

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(orb.color, orb.opacity * 0.15);
        ctx.fill();

        newCounts[orb.userId] = (newCounts[orb.userId] ?? 0) + 1;
        aliveOrbs.push(orb);
      }

      orbsRef.current = aliveOrbs;

      drawUserLabels();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dimensions, users, userYPositions, orbCounts]);

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        className="rounded-lg border border-[#2D2D44] shadow-2xl"
        style={{ width: dimensions.w, height: dimensions.h }}
      />
    </div>
  );
};
