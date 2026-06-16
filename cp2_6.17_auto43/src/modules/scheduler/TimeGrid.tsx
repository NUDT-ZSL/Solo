import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import type { User, SelectedTime, SelectedTimeRange } from '@/types';
import { DAYS, minuteToTimeString } from '@/utils/timezone';

interface TimeGridProps {
  users: User[];
  selectedRanges: SelectedTimeRange[];
  onSelectRanges: (ranges: SelectedTimeRange[]) => void;
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

interface SelectionBox {
  startDay: number;
  startSlot: number;
  endDay: number;
  endSlot: number;
}

function isCellInRanges(day: number, slot: number, ranges: SelectedTimeRange[]): boolean {
  const startMinute = slot * 30;
  const endMinute = startMinute + 30;
  return ranges.some(r =>
    r.day === day &&
    r.startMinute < endMinute &&
    r.endMinute > startMinute
  );
}

function isCellInBox(day: number, slot: number, box: SelectionBox | null): boolean {
  if (!box) return false;
  const minDay = Math.min(box.startDay, box.endDay);
  const maxDay = Math.max(box.startDay, box.endDay);
  const minSlot = Math.min(box.startSlot, box.endSlot);
  const maxSlot = Math.max(box.startSlot, box.endSlot);
  return day >= minDay && day <= maxDay && slot >= minSlot && slot <= maxSlot;
}

function mergeRanges(day: number, slots: number[]): SelectedTimeRange[] {
  if (slots.length === 0) return [];

  const sorted = [...new Set(slots)].sort((a, b) => a - b);
  const ranges: SelectedTimeRange[] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const curr = sorted[i];
    if (i < sorted.length && curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push({
        day,
        startMinute: rangeStart * 30,
        endMinute: (prev + 1) * 30
      });
      if (i < sorted.length) {
        rangeStart = curr;
        prev = curr;
      }
    }
  }

  return ranges;
}

function rangesToCellSet(ranges: SelectedTimeRange[]): Set<string> {
  const set = new Set<string>();
  for (const r of ranges) {
    const startSlot = Math.floor(r.startMinute / 30);
    const endSlot = Math.ceil(r.endMinute / 30);
    for (let slot = startSlot; slot < endSlot; slot++) {
      set.add(`${r.day}-${slot}`);
    }
  }
  return set;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  users,
  selectedRanges,
  onSelectRanges,
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
    isInSelection: boolean;
    selectionStats?: {
      totalMinutes: number;
      avgCount: number;
    };
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; slot: number } | null>(null);
  const [dragBox, setDragBox] = useState<SelectionBox | null>(null);
  const [lastClick, setLastClick] = useState<{ day: number; slot: number } | null>(null);

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

  const selectedCellSet = useMemo(() => rangesToCellSet(selectedRanges), [selectedRanges]);

  const getCellStats = useCallback((day: number, startSlot: number, endSlot: number) => {
    let totalCount = 0;
    let cellCount = 0;
    for (let slot = startSlot; slot <= endSlot; slot++) {
      const key = `${day}-${slot}`;
      const data = cellData[key];
      if (data) {
        totalCount += data.count;
        cellCount++;
      }
    }
    return {
      totalMinutes: (endSlot - startSlot + 1) * 30,
      avgCount: cellCount > 0 ? Math.round((totalCount / cellCount) * 10) / 10 : 0
    };
  }, [cellData]);

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
        const isSelected = selectedCellSet.has(key);
        const isInDragBox = isCellInBox(day, slot, dragBox);

        let fillColor: string;
        if (isInDragBox && !isSelected) {
          fillColor = 'rgba(59, 130, 246, 0.25)';
        } else if (isSelected) {
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
        } else if (isInDragBox) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_WIDTH - 1, CELL_HEIGHT - 1);
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);
        }
      }
    }

    if (dragBox) {
      const minDay = Math.min(dragBox.startDay, dragBox.endDay);
      const maxDay = Math.max(dragBox.startDay, dragBox.endDay);
      const minSlot = Math.min(dragBox.startSlot, dragBox.endSlot);
      const maxSlot = Math.max(dragBox.startSlot, dragBox.endSlot);

      const x = ROW_HEADER_WIDTH + minSlot * CELL_WIDTH;
      const y = COL_HEADER_HEIGHT + minDay * CELL_HEIGHT;
      const w = (maxSlot - minSlot + 1) * CELL_WIDTH;
      const h = (maxDay - minDay + 1) * CELL_HEIGHT;

      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.restore();

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(x, y, w, h);
    }
  }, [cellData, maxCount, selectedCellSet, dragBox, mode]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const slot = Math.floor((x - ROW_HEADER_WIDTH) / CELL_WIDTH);
    const day = Math.floor((y - COL_HEADER_HEIGHT) / CELL_HEIGHT);

    if (slot >= 0 && slot < SLOTS_PER_DAY && day >= 0 && day < DAYS_COUNT) {
      return { day, slot };
    }
    return null;
  };

  const toggleCellSelection = (day: number, slot: number, selected: boolean) => {
    const key = `${day}-${slot}`;
    const currentlySelected = selectedCellSet.has(key);

    if (selected === currentlySelected) return;

    const cellsByDay: Record<number, number[]> = {};
    selectedCellSet.forEach(k => {
      const [d, s] = k.split('-').map(Number);
      if (!cellsByDay[d]) cellsByDay[d] = [];
      cellsByDay[d].push(s);
    });

    if (!cellsByDay[day]) cellsByDay[day] = [];

    if (selected) {
      if (!cellsByDay[day].includes(slot)) {
        cellsByDay[day].push(slot);
      }
    } else {
      cellsByDay[day] = cellsByDay[day].filter(s => s !== slot);
    }

    const newRanges: SelectedTimeRange[] = [];
    Object.entries(cellsByDay).forEach(([d, slots]) => {
      newRanges.push(...mergeRanges(Number(d), slots));
    });

    onSelectRanges(newRanges);
  };

  const selectRange = (day: number, startSlot: number, endSlot: number, selected: boolean) => {
    const minSlot = Math.min(startSlot, endSlot);
    const maxSlot = Math.max(startSlot, endSlot);

    const cellsByDay: Record<number, number[]> = {};
    selectedCellSet.forEach(k => {
      const [d, s] = k.split('-').map(Number);
      if (!cellsByDay[d]) cellsByDay[d] = [];
      cellsByDay[d].push(s);
    });

    if (!cellsByDay[day]) cellsByDay[day] = [];

    for (let slot = minSlot; slot <= maxSlot; slot++) {
      const idx = cellsByDay[day].indexOf(slot);
      if (selected && idx === -1) {
        cellsByDay[day].push(slot);
      } else if (!selected && idx !== -1) {
        cellsByDay[day].splice(idx, 1);
      }
    }

    const newRanges: SelectedTimeRange[] = [];
    Object.entries(cellsByDay).forEach(([d, slots]) => {
      newRanges.push(...mergeRanges(Number(d), slots));
    });

    onSelectRanges(newRanges);
  };

  const selectBox = (box: SelectionBox, selected: boolean) => {
    const minDay = Math.min(box.startDay, box.endDay);
    const maxDay = Math.max(box.startDay, box.endDay);
    const minSlot = Math.min(box.startSlot, box.endSlot);
    const maxSlot = Math.max(box.startSlot, box.endSlot);

    const cellsByDay: Record<number, number[]> = {};
    selectedCellSet.forEach(k => {
      const [d, s] = k.split('-').map(Number);
      if (!cellsByDay[d]) cellsByDay[d] = [];
      cellsByDay[d].push(s);
    });

    for (let day = minDay; day <= maxDay; day++) {
      if (!cellsByDay[day]) cellsByDay[day] = [];
      for (let slot = minSlot; slot <= maxSlot; slot++) {
        const idx = cellsByDay[day].indexOf(slot);
        if (selected && idx === -1) {
          cellsByDay[day].push(slot);
        } else if (!selected && idx !== -1) {
          cellsByDay[day].splice(idx, 1);
        }
      }
    }

    const newRanges: SelectedTimeRange[] = [];
    Object.entries(cellsByDay).forEach(([d, slots]) => {
      newRanges.push(...mergeRanges(Number(d), slots));
    });

    onSelectRanges(newRanges);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e);
    if (!cell) return;

    if (e.button === 0) {
      if (e.shiftKey && lastClick) {
        if (lastClick.day === cell.day) {
          const startSlot = Math.min(lastClick.slot, cell.slot);
          const endSlot = Math.max(lastClick.slot, cell.slot);
          selectRange(cell.day, startSlot, endSlot, true);
        } else {
          const box: SelectionBox = {
            startDay: lastClick.day,
            startSlot: lastClick.slot,
            endDay: cell.day,
            endSlot: cell.slot
          };
          selectBox(box, true);
        }
        setLastClick(cell);
      } else {
        setIsDragging(true);
        setDragStart(cell);
        setDragBox({
          startDay: cell.day,
          startSlot: cell.slot,
          endDay: cell.day,
          endSlot: cell.slot
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e);

    if (isDragging && dragStart && dragBox) {
      if (cell && (cell.day !== dragBox.endDay || cell.slot !== dragBox.endSlot)) {
        setDragBox({
          ...dragBox,
          endDay: cell.day,
          endSlot: cell.slot
        });
      }
    }

    if (cell) {
      const key = `${cell.day}-${cell.slot}`;
      const data = cellData[key] || { count: 0, availableNames: [] };
      const isInSelection = selectedCellSet.has(key);

      let selectionStats;
      if (isInSelection) {
        const range = selectedRanges.find(r =>
          r.day === cell.day &&
          r.startMinute <= cell.slot * 30 &&
          r.endMinute > cell.slot * 30
        );
        if (range) {
          const startSlot = Math.floor(range.startMinute / 30);
          const endSlot = Math.ceil(range.endMinute / 30) - 1;
          selectionStats = getCellStats(cell.day, startSlot, endSlot);
        }
      }

      setHoverInfo({
        x: e.clientX,
        y: e.clientY,
        day: cell.day,
        startMinute: cell.slot * 30,
        count: data.count,
        availableNames: data.availableNames,
        isInSelection,
        selectionStats
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragBox) {
      const minDay = Math.min(dragBox.startDay, dragBox.endDay);
      const maxDay = Math.max(dragBox.startDay, dragBox.endDay);
      const minSlot = Math.min(dragBox.startSlot, dragBox.endSlot);
      const maxSlot = Math.max(dragBox.startSlot, dragBox.endSlot);

      const isSingleCell = minDay === maxDay && minSlot === maxSlot;

      if (isSingleCell) {
        toggleCellSelection(minDay, minSlot, !selectedCellSet.has(`${minDay}-${minSlot}`));
        setLastClick({ day: minDay, slot: minSlot });
      } else {
        selectBox(dragBox, true);
        setLastClick({ day: maxDay, slot: maxSlot });
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragBox(null);
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragBox(null);
    }
  };

  const handleClearAll = () => {
    onSelectRanges([]);
    setLastClick(null);
  };

  const formatNames = (names: string[]): string => {
    if (names.length === 0) return '—';
    if (names.length <= 5) return names.join('、');
    return `${names.slice(0, 5).join('、')}等${names.length}人`;
  };

  const totalSelectedMinutes = selectedRanges.reduce((sum, r) => sum + (r.endMinute - r.startMinute), 0);

  return (
    <div className="time-grid-container" style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {selectedRanges.length > 0 && (
            <span>
              已选 <strong style={{ color: '#2563eb' }}>{selectedRanges.length}</strong> 个时间段，
              共 <strong style={{ color: '#2563eb' }}>{totalSelectedMinutes / 60}</strong> 小时
              {' · '}
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                点击选中 · Shift点击连续选择 · 拖拽框选
              </span>
            </span>
          )}
          {selectedRanges.length === 0 && (
            <span style={{ color: '#9ca3af' }}>
              点击选中 · Shift点击连续选择 · 拖拽框选
            </span>
          )}
        </div>
        {selectedRanges.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.background = '#fee2e2';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = '#fef2f2';
            }}
          >
            ✕ 清除所有选中
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: isDragging ? 'crosshair' : 'pointer', userSelect: 'none' }}
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
            maxWidth: '300px',
            lineHeight: '1.6'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
            {DAYS[hoverInfo.day]} {minuteToTimeString(hoverInfo.startMinute)}
          </div>
          <div style={{ color: '#93c5fd', fontWeight: 600, marginBottom: '6px' }}>
            空闲人数: {hoverInfo.count}{maxCount > 0 ? ` / ${maxCount}` : ''}
          </div>

          {hoverInfo.selectionStats && (
            <div style={{
              padding: '6px 0',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '6px'
            }}>
              <div style={{ color: '#fcd34d', fontWeight: 600 }}>
                📊 选中时段统计
              </div>
              <div style={{ color: '#e5e7eb' }}>
                总时长: {hoverInfo.selectionStats.totalMinutes}分钟
                ({Math.round(hoverInfo.selectionStats.totalMinutes / 60 * 10) / 10}小时)
              </div>
              <div style={{ color: '#e5e7eb' }}>
                平均空闲人数: {hoverInfo.selectionStats.avgCount}人
              </div>
            </div>
          )}

          {hoverInfo.isInSelection && (
            <div style={{
              color: '#93c5fd',
              fontSize: '11px',
              marginBottom: '4px',
              fontWeight: 500
            }}>
              ✓ 已选中
            </div>
          )}

          {hoverInfo.availableNames.length > 0 && (
            <div style={{
              paddingTop: '6px',
              borderTop: hoverInfo.selectionStats ? 'none' : '1px solid rgba(255,255,255,0.1)',
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
