import { useRef, useEffect, useCallback, useState, type MouseEvent } from 'react';
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

const DAY_WIDTH = 60;
const DOT_BASE_SIZE = 10;

export default function TrajectoryTimeline({ records, echoes, onDotClick, onDotDrag, onEmptyClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dotPositionsRef = useRef<DotPosition[]>([]);
  const dragRef = useRef<{
    record: EmotionRecord;
    startScreenX: number;
    startScreenY: number;
    origX: number;
    origY: number;
    currentX: number;
    currentY: number;
    dragging: boolean;
  } | null>(null);
  const rafIdRef = useRef<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [heightRatio, setHeightRatio] = useState(0.15);

  const getDotRadius = useCallback((intensity: number) => {
    return DOT_BASE_SIZE + intensity * 3;
  }, []);

  const computePositions = useCallback((): DotPosition[] => {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const cssRect = canvas.getBoundingClientRect();
    const h = cssRect.height;
    const centerY = h / 2;

    return records.map((record, i) => {
      const baseX = 60 + i * DAY_WIDTH;
      if (record.position?.y !== undefined) {
        const y = record.position.y * h;
        return { record, x: baseX, y: Math.max(20, Math.min(h - 40, y)) };
      }
      const y = centerY + Math.sin(i * 0.8) * 20 - (record.intensity - 3) * 4;
      return { record, x: baseX, y: Math.max(20, Math.min(h - 40, y)) };
    });
  }, [records]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssRect = canvas.getBoundingClientRect();
    if (canvas.width !== cssRect.width * dpr || canvas.height !== cssRect.height * dpr) {
      canvas.width = cssRect.width * dpr;
      canvas.height = cssRect.height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssRect.width, cssRect.height);

    let positions = computePositions();
    if (dragRef.current?.dragging) {
      positions = positions.map((p) =>
        p.record.id === dragRef.current!.record.id
          ? { ...p, x: dragRef.current!.currentX, y: dragRef.current!.currentY }
          : p
      );
    }
    dotPositionsRef.current = positions;

    if (positions.length >= 2) {
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
    }

    positions.forEach((pos) => {
      const r = getDotRadius(pos.record.intensity);
      const isDragging = dragRef.current?.dragging && dragRef.current.record.id === pos.record.id;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r + (isDragging ? 10 : 6), 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(pos.x, pos.y, r, pos.x, pos.y, r + (isDragging ? 10 : 6));
      glow.addColorStop(0, pos.record.color + (isDragging ? '50' : '30'));
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
      const ex = targetPos.x + r + 8;
      const ey = targetPos.y;

      ctx.beginPath();
      ctx.arc(ex, ey, 10, 0, Math.PI * 2);
      ctx.strokeStyle = echo.color + '40';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = echo.color;
      ctx.fill();
    });
  }, [computePositions, echoes, getDotRadius]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      drawFrame();
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [drawFrame]);

  useEffect(() => {
    const onResize = () => {
      setHeightRatio(0.15);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [checkScroll]);

  const scrollBy = useCallback((direction: number) => {
    scrollRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' });
  }, []);

  const findDotAt = useCallback(
    (x: number, y: number): DotPosition | null => {
      for (const pos of dotPositionsRef.current) {
        const r = getDotRadius(pos.record.intensity);
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return pos;
      }
      return null;
    },
    [getDotRadius]
  );

  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = findDotAt(x, y);
    if (!hit) return;

    dragRef.current = {
      record: hit.record,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      origX: hit.x,
      origY: hit.y,
      currentX: hit.x,
      currentY: hit.y,
      dragging: false,
    };
  }, [findDotAt]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const dx = e.clientX - dragRef.current.startScreenX;
    const dy = e.clientY - dragRef.current.startScreenY;

    if (!dragRef.current.dragging && dx * dx + dy * dy > 25) {
      dragRef.current.dragging = true;
    }

    if (dragRef.current.dragging) {
      const h = rect.height;
      dragRef.current.currentX = Math.max(40, Math.min(rect.width - 40, dragRef.current.origX + dx));
      dragRef.current.currentY = Math.max(20, Math.min(h - 40, dragRef.current.origY + dy));
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (drag.dragging) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const h = rect.height;
      const normalizedY = drag.currentY / h;
      onDotDrag(drag.record, { x: 0.5, y: Math.max(0.05, Math.min(0.95, normalizedY)) });
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hit = findDotAt(x, y);
      if (hit) {
        onDotClick(hit.record, { x: e.clientX, y: e.clientY });
      } else {
        onEmptyClick();
      }
    }
  }, [findDotAt, onDotClick, onDotDrag, onEmptyClick]);

  const handleMouseLeave = useCallback(() => {
    const drag = dragRef.current;
    if (!drag?.dragging) {
      dragRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      dragRef.current = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const h = rect.height;
    const normalizedY = drag.currentY / h;
    onDotDrag(drag.record, { x: 0.5, y: Math.max(0.05, Math.min(0.95, normalizedY)) });
    dragRef.current = null;
  }, [onDotDrag]);

  const handleCanvasClick = useCallback(() => {}, []);

  const totalWidth = Math.max(records.length * DAY_WIDTH + 120, 800);

  return (
    <div
      className="relative w-full"
      style={{ height: `${heightRatio * 100}vh`, minHeight: '140px' }}
    >
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        <div
          ref={scrollRef}
          className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}
        >
          <canvas
            ref={canvasRef}
            className="cursor-pointer"
            style={{
              width: `${totalWidth}px`,
              height: '100%',
              display: 'block',
              willChange: 'transform',
              transform: 'translateZ(0)',
              touchAction: 'none',
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
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
            willChange: 'transform',
            transform: 'translateZ(0)',
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
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          <span className="text-white text-sm font-bold">›</span>
        </button>
      )}
    </div>
  );
}
