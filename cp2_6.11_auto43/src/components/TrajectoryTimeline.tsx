import { useRef, useEffect, useCallback, useState } from 'react';
import type { EmotionRecord, Echo } from '../../../shared/types';

interface Props {
  records: EmotionRecord[];
  echoes: Echo[];
  onDotClick: (record: EmotionRecord, pos: { x: number; y: number }) => void;
  onDotDrag: (record: EmotionRecord, newPos: { x: number; y: number }) => void;
  onEmptyClick: () => void;
}

interface DotPosition {
  record: EmotionRecord;
  x: number;
  y: number;
}

export default function TrajectoryTimeline({ records, echoes, onDotClick, onDotDrag, onEmptyClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dotPositionsRef = useRef<DotPosition[]>([]);
  const dragRef = useRef<{ record: EmotionRecord; startX: number; startY: number; dragging: boolean } | null>(null);
  const animFrameRef = useRef<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const TIMELINE_HEIGHT = 0.15;
  const DAY_WIDTH = 60;
  const DOT_BASE_SIZE = 10;

  const getDotRadius = useCallback((intensity: number) => {
    return DOT_BASE_SIZE + intensity * 3;
  }, []);

  const computePositions = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return [];
    const canvas = canvasRef.current;
    const h = canvas.height;
    const centerY = h / 2;

    return records.map((record, i) => {
      const baseX = 60 + i * DAY_WIDTH;
      const customY = record.position?.y;
      const y = customY !== undefined ? centerY + (customY - 0.5) * h * 0.6 : centerY + Math.sin(i * 0.8) * 20;
      return { record, x: baseX, y };
    });
  }, [records]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const positions = computePositions();
    dotPositionsRef.current = positions;

    if (positions.length < 2) {
      positions.forEach((pos) => {
        const r = getDotRadius(pos.record.intensity);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = pos.record.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(pos.record.date.slice(5), pos.x, pos.y + r + 16);
      });
      return;
    }

    for (let i = 0; i < positions.length - 1; i++) {
      const p0 = positions[i];
      const p1 = positions[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.4;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) * 0.4;
      const cp2y = p1.y;

      const gradient = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      gradient.addColorStop(0, p0.record.color + 'B3');
      gradient.addColorStop(1, p1.record.color + 'B3');

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    positions.forEach((pos) => {
      const r = getDotRadius(pos.record.intensity);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(pos.x, pos.y, r, pos.x, pos.y, r + 6);
      glow.addColorStop(0, pos.record.color + '30');
      glow.addColorStop(1, pos.record.color + '00');
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = pos.record.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(pos.record.date.slice(5), pos.x, pos.y + r + 16);
    });

    echoes.forEach((echo) => {
      const targetPos = positions.find((p) => p.record.date === echo.targetDate);
      if (!targetPos) return;
      const r = getDotRadius(targetPos.record.intensity);
      const ex = targetPos.x + r + 6;
      const ey = targetPos.y;

      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = echo.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      ctx.strokeStyle = echo.color + '60';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [computePositions, echoes, getDotRadius, records]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [checkScroll]);

  const scrollBy = useCallback((direction: number) => {
    scrollRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' });
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hit = false;
    for (const pos of dotPositionsRef.current) {
      const r = getDotRadius(pos.record.intensity);
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) {
        onDotClick(pos.record, { x: e.clientX, y: e.clientY });
        hit = true;
        break;
      }
    }
    if (!hit) {
      onEmptyClick();
    }
  }, [getDotRadius, onDotClick, onEmptyClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const pos of dotPositionsRef.current) {
      const r = getDotRadius(pos.record.intensity);
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) {
        dragRef.current = { record: pos.record, startX: x, startY: y, dragging: false };
        break;
      }
    }
  }, [getDotRadius]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragRef.current.startX;
    const dy = y - dragRef.current.startY;
    if (!dragRef.current.dragging && (dx * dx + dy * dy > 25)) {
      dragRef.current.dragging = true;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!dragRef.current?.dragging) {
      dragRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const h = canvas.getBoundingClientRect().height;
    const record = dragRef.current.record;
    const positions = dotPositionsRef.current;
    const pos = positions.find((p) => p.record.id === record.id);
    if (pos) {
      const normalizedY = (pos.y + (dragRef.current.startY - pos.y)) / h;
      onDotDrag(record, { x: 0.5, y: Math.max(0.1, Math.min(0.9, normalizedY)) });
    }
    dragRef.current = null;
  }, [onDotDrag]);

  const totalWidth = Math.max(records.length * DAY_WIDTH + 120, 0);

  return (
    <div className="relative w-full" style={{ height: `${TIMELINE_HEIGHT * 100}vh`, minHeight: '140px' }}>
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
        }}
      >
        <div ref={scrollRef} className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer"
            style={{ width: `${Math.max(totalWidth, 800)}px`, height: '100%' }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-out z-10"
          style={{
            backdropFilter: 'blur(8px)',
            background: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          <span className="text-white text-sm font-bold">‹</span>
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-out z-10"
          style={{
            backdropFilter: 'blur(8px)',
            background: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          <span className="text-white text-sm font-bold">›</span>
        </button>
      )}
    </div>
  );
}
