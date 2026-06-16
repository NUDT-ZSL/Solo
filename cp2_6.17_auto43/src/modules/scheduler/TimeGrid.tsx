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

const GRID_COLORS = {
  0: '#e5e7eb',
  1: '#bbf7d0',
  2: '#bbf7d0',
  3: '#86efac',
  4: '#86efac',
  5: '#22c55e'
};

function getHeatColor(count: number): string {
  if (count >= 5) return GRID_COLORS[5];
  if (count >= 3) return GRID_COLORS[3];
  if (count >= 1) return GRID_COLORS[1];
  return GRID_COLORS[0];
}

const TimeGrid: React.FC<TimeGridProps> = ({
  users,
  selectedTimes,
  onSelectTime,
  mode = 'heatmap'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; day: number; startMinute: number; count: number } | null>(null);

  const cellAvailability = useMemo(() => {
    const map: Record<string, number> = {};
    for (let day = 0; day < DAYS_COUNT; day++) {
      for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
        const startMinute = slot * 30;
        let count = 0;
        for (const user of users) {
          const available = user.availability.some(
            s => s.day === day && s.startMinute <= startMinute && s.endMinute >= startMinute + 30
          );
          if (available) count++;
        }
        map[`${day}-${slot}`] = count;
      }
    }
    return map;
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
        const count = cellAvailability[key] || 0;

        let fillColor: string;
        if (selectedSet.has(key)) {
          fillColor = '#dbeafe';
        } else {
          fillColor = mode === 'selector' && count === 0 ? '#ffffff' : getHeatColor(count);
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);

        ctx.strokeStyle = selectedSet.has(key) ? '#3b82f6' : '#d1d5db';
        ctx.lineWidth = selectedSet.has(key) ? 2 : 0.5;
        ctx.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);
      }
    }
  }, [cellAvailability, selectedSet, mode]);

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
      setHoverInfo({
        x: e.clientX,
        y: e.clientY,
        day,
        startMinute: slot * 30,
        count: cellAvailability[key] || 0
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
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
            background: '#1f2937',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ fontWeight: 600 }}>{DAYS[hoverInfo.day]} {minuteToTimeString(hoverInfo.startMinute)}</div>
          <div>空闲人数: {hoverInfo.count}</div>
        </div>
      )}
    </div>
  );
};

export default TimeGrid;
