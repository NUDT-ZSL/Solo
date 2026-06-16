import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { User, SelectedTime } from '@/types';
import { DAYS, minuteToTimeString } from '@/utils/timezone';

interface TimeGridProps {
  users: User[];
  selectedTimes: SelectedTime[];
  onSelectTime: (time: SelectedTime) => void;
  mode?: 'heatmap' | 'selector';
}

const CELL_WIDTH = 40;
const CELL_HEIGHT = 20;
const ROW_HEADER_WIDTH = 60;
const COL_HEADER_HEIGHT = 30;
const DAYS_COUNT = 5;
const SLOTS_PER_DAY = 48;

const COLOR_EMPTY = '#e5e7eb';
const COLOR_START = '#bbf7d0';
const COLOR_MID = '#86efac';
const COLOR_END = '#166534';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateColor(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
}

function getGradientColor(count: number, maxCount: number): string {
  if (count <= 0) return COLOR_EMPTY;
  if (maxCount <= 1) return count >= 1 ? COLOR_START : COLOR_EMPTY;

  const ratio = (count - 1) / (maxCount - 1);
  let t = Math.min(1, Math.max(0, ratio));

  if (t <= 0.5) {
    return interpolateColor(COLOR_START, COLOR_MID, t * 2);
  } else {
    return interpolateColor(COLOR_MID, COLOR_END, (t - 0.5) * 2);
  }
}

interface CellData {
  count: number;
  availableNames: string[];
}

const TimeGrid: React.FC<TimeGridProps> = ({
  users,
  selectedTimes,
  onSelectTime,
  mode = 'heatmap'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    day: number;
    startMinute: number;
    count: number;
    availableNames: string[];
  } | null>(null);

  const { cellData, maxCount } = useMemo(() => {
    const data: Record<string, CellData> = {};
    let max = 0;

    for (let day = 0; day < DAYS_COUNT; day++) {
      for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
        const startMinute = slot * 30;
        const names: string[] = [];

        for (const user of users) {
          const available = user.availability.some(
            s => s.day === day && s.startMinute <= startMinute && s.endMinute >= startMinute + 30
          );
          if (available) {
            names.push(user.name);
          }
        }

        data[`${day}-${slot}`] = {
          count: names.length,
          availableNames: names
        };

        if (names.length > max) max = names.length;
      }
    }
    return { cellData: data, maxCount: max };
  }, [users]);

  const selectedSet = useMemo(() => {
    return new Set(selectedTimes.map(t => `${t.day}-${Math.floor(t.startMinute / 30)}`));
  }, [selectedTimes]);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = ROW_HEADER_WIDTH + SLOTS_PER_DAY * CELL_WIDTH;
    const height = COL_HEADER_HEIGHT + DAYS_COUNT * CELL_HEIGHT;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let slot = 0; slot < SLOTS_PER_DAY; slot += 2) {
      const x = ROW_HEADER_WIDTH + slot * CELL_WIDTH + CELL_WIDTH;
      const hour = Math.floor((slot * 30) / 60);
      ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, x, COL_HEADER_HEIGHT / 2);
    }

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'right';
    for (let day = 0; day < DAYS_COUNT; day++) {
      const y = COL_HEADER_HEIGHT + day * CELL_HEIGHT + CELL_HEIGHT / 2;
      ctx.fillText(DAYS[day], ROW_HEADER_WIDTH - 8, y);
    }

    for (let day = 0; day < DAYS_COUNT; day++) {
      for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
        const x = ROW_HEADER_WIDTH + slot * CELL_WIDTH;
        const y = COL_HEADER_HEIGHT + day * CELL_HEIGHT;
        const key = `${day}-${slot}`;
        const { count } = cellData[key] || { count: 0, availableNames: [] };
        const isSelected = selectedSet.has(key);

        let fillColor: string;
        if (isSelected) {
          fillColor = '#bfdbfe';
        } else {
          fillColor = mode === 'selector' && count === 0 ? '#ffffff' : getGradientColor(count, maxCount);
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);

        if (isSelected) {
          ctx.save();
          ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
          ctx.shadowBlur = 4;
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, CELL_WIDTH - 2, CELL_HEIGHT - 2);
          ctx.restore();

          ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
          ctx.beginPath();
          ctx.arc(x + CELL_WIDTH - 5, y + 5, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);
        }
      }
    }
  }, [cellData, maxCount, selectedSet, mode]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const slot = Math.floor((x - ROW_HEADER_WIDTH) / CELL_WIDTH);
    const day = Math.floor((y - COL_HEADER_HEIGHT) / CELL_HEIGHT);

    if (slot >= 0 && slot < SLOTS_PER_DAY && day >= 0 && day < DAYS_COUNT) {
      const key = `${day}-${slot}`;
      const data = cellData[key] || { count: 0, availableNames: [] };
      setHoverInfo({
        x: e.clientX,
        y: e.clientY,
        day,
        startMinute: slot * 30,
        count: data.count,
        availableNames: data.availableNames
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const slot = Math.floor((x - ROW_HEADER_WIDTH) / CELL_WIDTH);
    const day = Math.floor((y - COL_HEADER_HEIGHT) / CELL_HEIGHT);

    if (slot >= 0 && slot < SLOTS_PER_DAY && day >= 0 && day < DAYS_COUNT) {
      onSelectTime({ day, startMinute: slot * 30 });
    }
  };

  const formatNames = (names: string[]): string => {
    if (names.length === 0) return '—';
    if (names.length <= 5) return names.join('、');
    return `${names.slice(0, 5).join('、')}等${names.length}人`;
  };

  return (
    <div className="time-grid-container" style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          onClick={handleClick}
          style={{ cursor: 'pointer' }}
        />
      </div>
      {hoverInfo && (
        <div
          style={{
            position: 'fixed',
            left: hoverInfo.x + 12,
            top: hoverInfo.y + 12,
            background: '#1f2937',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
            maxWidth: '280px',
            lineHeight: '1.6'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
            {DAYS[hoverInfo.day]} {minuteToTimeString(hoverInfo.startMinute)}
          </div>
          <div style={{ color: '#93c5fd', fontWeight: 600, marginBottom: '6px' }}>
            空闲人数: {hoverInfo.count}{maxCount > 0 ? ` / ${maxCount}` : ''}
          </div>
          {hoverInfo.availableNames.length > 0 && (
            <div style={{
              paddingTop: '6px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              color: '#e5e7eb'
            }}>
              <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '2px' }}>可参会成员:</div>
              {formatNames(hoverInfo.availableNames)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeGrid;
