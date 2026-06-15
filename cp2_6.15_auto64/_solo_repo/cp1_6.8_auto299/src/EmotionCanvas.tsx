import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  EmotionType,
  getEmotionMainColor,
} from './utils/colorMap';

export interface EmotionRecord {
  date: string;
  emotion: EmotionType;
  intensity: number;
  note: string;
}

interface EmotionCanvasProps {
  records: EmotionRecord[];
  viewMode: 'week' | 'month';
  currentDate: Date;
  onRecordClick?: (record: EmotionRecord) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

interface DayBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  record: EmotionRecord;
}

const PADDING = 40;
const BAND_CENTER_RATIO = 0.5;
const MAX_BAND_HEIGHT = 120;
const MIN_BAND_HEIGHT = 20;

function getDaysInView(currentDate: Date, viewMode: 'week' | 'month'): string[] {
  const days: string[] = [];
  if (viewMode === 'week') {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(formatDate(day));
    }
  } else {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(formatDate(new Date(year, month, i)));
    }
  }
  return days;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  records: EmotionRecord[],
  days: string[],
  animProgress: number,
  hoveredIndex: number,
  viewMode: 'week' | 'month'
): DayBlock[] {
  const blocks: DayBlock[] = [];
  ctx.clearRect(0, 0, width, height);

  const drawWidth = width - PADDING * 2;
  const drawHeight = height - PADDING * 2;
  const bandCenterY = PADDING + drawHeight * BAND_CENTER_RATIO;
  const slotWidth = drawWidth / days.length;

  const recordsByDay = new Map<string, EmotionRecord[]>();
  for (const rec of records) {
    const arr = recordsByDay.get(rec.date) || [];
    arr.push(rec);
    recordsByDay.set(rec.date, arr);
  }

  const points: { x: number; topY: number; botY: number; color: string; record: EmotionRecord | null }[] = [];

  for (let i = 0; i < days.length; i++) {
    const dayStr = days[i];
    const x = PADDING + slotWidth * i + slotWidth / 2;
    const dayRecords = recordsByDay.get(dayStr);

    if (dayRecords && dayRecords.length > 0) {
      const primaryRecord = dayRecords[0];
      const intensityNorm = primaryRecord.intensity / 10;
      const bandH = MIN_BAND_HEIGHT + (MAX_BAND_HEIGHT - MIN_BAND_HEIGHT) * intensityNorm;
      const topY = bandCenterY - bandH / 2;
      const botY = bandCenterY + bandH / 2;
      const color = getEmotionMainColor(primaryRecord.emotion);

      points.push({ x, topY, botY, color, record: primaryRecord });
    } else {
      points.push({ x, topY: bandCenterY - MIN_BAND_HEIGHT / 2, botY: bandCenterY + MIN_BAND_HEIGHT / 2, color: 'rgba(200,210,220,0.4)', record: null });
    }
  }

  if (points.length === 0) return blocks;

  const progress = Math.min(1, animProgress);

  ctx.save();
  ctx.globalAlpha = progress;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const cpX = (p0.x + p1.x) / 2;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.topY);
    ctx.bezierCurveTo(cpX, p0.topY, cpX, p1.topY, p1.x, p1.topY);
    ctx.lineTo(p1.x, p1.botY);
    ctx.bezierCurveTo(cpX, p1.botY, cpX, p0.botY, p0.x, p0.botY);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(p0.x, 0, p1.x, 0);
    gradient.addColorStop(0, p0.color);
    gradient.addColorStop(1, p1.color);
    ctx.fillStyle = gradient;
    ctx.fill();

    if (i === hoveredIndex || i + 1 === hoveredIndex) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.restore();

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p.record) continue;

    const isHovered = i === hoveredIndex;
    const radius = isHovered ? 8 : 6;

    ctx.beginPath();
    ctx.arc(p.x, p.topY, radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    if (isHovered) {
      ctx.beginPath();
      ctx.arc(p.x, p.topY, 14, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    blocks.push({
      x: p.x - slotWidth / 2,
      y: p.topY - (p.botY - p.topY) / 2,
      width: slotWidth,
      height: p.botY - p.topY,
      color: p.color,
      record: p.record,
    });
  }

  ctx.fillStyle = 'rgba(100,110,130,0.6)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < days.length; i++) {
    const x = PADDING + slotWidth * i + slotWidth / 2;
    const dayNum = parseInt(days[i].split('-')[2], 10);
    const label = viewMode === 'week'
      ? ['日', '一', '二', '三', '四', '五', '六'][i]
      : String(dayNum);
    ctx.fillText(label, x, height - PADDING / 3);
  }

  return blocks;
}

const EmotionCanvas: React.FC<EmotionCanvasProps> = ({
  records,
  viewMode,
  currentDate,
  onRecordClick,
  canvasRef: externalRef,
}) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef || internalRef;
  const blocksRef = useRef<DayBlock[]>([]);
  const animFrameRef = useRef<number>(0);
  const animProgressRef = useRef(0);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const prevDaysRef = useRef<string>('');

  const days = getDaysInView(currentDate, viewMode);
  const daysKey = days.join(',');

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
  }, [canvasRef]);

  const render = useCallback(
    (progress: number, hovered: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      blocksRef.current = drawSpectrum(ctx, w, h, records, days, progress, hovered, viewMode);
      ctx.restore();
    },
    [records, days, canvasRef, viewMode]
  );

  useEffect(() => {
    if (prevDaysRef.current !== daysKey) {
      animProgressRef.current = 0;
      prevDaysRef.current = daysKey;
    }

    let startTime: number | null = null;
    const duration = 600;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - rawProgress, 3);
      animProgressRef.current = eased;
      render(eased, hoveredIndex);

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [daysKey, records, render, hoveredIndex]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const block of blocksRef.current) {
        if (
          x >= block.x &&
          x <= block.x + block.width &&
          y >= block.y &&
          y <= block.y + block.height
        ) {
          onRecordClick?.(block.record);
          return;
        }
      }
    },
    [canvasRef, onRecordClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let found = -1;
      for (let i = 0; i < blocksRef.current.length; i++) {
        const block = blocksRef.current[i];
        if (
          x >= block.x &&
          x <= block.x + block.width &&
          y >= block.y &&
          y <= block.y + block.height
        ) {
          found = i;
          break;
        }
      }

      if (found !== hoveredIndex) {
        setHoveredIndex(found);
        canvas.style.cursor = found >= 0 ? 'pointer' : 'default';
      }
    },
    [canvasRef, hoveredIndex]
  );

  const handleMouseLeave = useCallback(() => {
    if (hoveredIndex !== -1) {
      setHoveredIndex(-1);
    }
  }, [hoveredIndex]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        className="emotion-canvas"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default EmotionCanvas;
