import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InkDrop from './InkDrop';
import type { ProcessedEntry } from './utils/dataProcessor';

interface TimelineProps {
  entries: ProcessedEntry[];
  onEntryHover?: (entry: ProcessedEntry | null) => void;
}

const PADDING_TOP = 60;
const PADDING_LEFT = 80;
const MONTH_GAP = 140;
const BRUSH_LINE_Y_RATIO = 0.55;

const Timeline: React.FC<TimelineProps> = ({ entries, onEntryHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(1200);
  const [viewHeight, setViewHeight] = useState(600);
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setViewWidth(e.contentRect.width);
        setViewHeight(e.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScrollX((prev) => {
      const next = prev + e.deltaY * 1.5;
      const maxScroll = Math.max(0, 12 * MONTH_GAP + PADDING_LEFT * 2 - viewWidth);
      return Math.max(0, Math.min(next, maxScroll));
    });
  }, [viewWidth]);

  const brushLineY = viewHeight * BRUSH_LINE_Y_RATIO;

  const monthPositions = useMemo(() => {
    const map = new Map<number, { x: number; entries: ProcessedEntry[] }>();
    for (let m = 1; m <= 12; m++) {
      const monthEntries = entries.filter((e) => e.month === m);
      const x = PADDING_LEFT + (m - 1) * MONTH_GAP + MONTH_GAP / 2;
      map.set(m, { x, entries: monthEntries });
    }
    return map;
  }, [entries]);

  const totalWidth = Math.max(viewWidth, 12 * MONTH_GAP + PADDING_LEFT * 2);

  const monthLabels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'grab',
      }}
    >
      <svg
        width={totalWidth}
        height={viewHeight}
        style={{
          transform: `translateX(${-scrollX}px)`,
          transition: 'transform 0.05s linear',
        }}
      >
        <defs>
          <filter id="brush-texture" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id="brush-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5a4a3a" stopOpacity="0.1" />
            <stop offset="5%" stopColor="#5a4a3a" stopOpacity="0.5" />
            <stop offset="95%" stopColor="#5a4a3a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5a4a3a" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <path
          d={`M ${PADDING_LEFT} ${brushLineY} Q ${totalWidth * 0.25} ${brushLineY - 4} ${totalWidth * 0.5} ${brushLineY + 2} T ${totalWidth - PADDING_LEFT} ${brushLineY}`}
          fill="none"
          stroke="url(#brush-line-grad)"
          strokeWidth={2.5}
          filter="url(#brush-texture)"
          strokeLinecap="round"
        />

        {Array.from(monthPositions.entries()).map(([month, pos]) => {
          const isActive = pos.entries.length > 0;
          return (
            <g key={`month-${month}`}>
              <line
                x1={pos.x}
                y1={brushLineY - 12}
                x2={pos.x}
                y2={brushLineY + 12}
                stroke={isActive ? '#8a7a6a' : '#c0b8a8'}
                strokeWidth={isActive ? 1.5 : 0.8}
                opacity={0.6}
              />
              <text
                x={pos.x}
                y={brushLineY + 32}
                textAnchor="middle"
                fill={isActive ? '#5a4a3a' : '#b0a898'}
                fontSize={isActive ? 14 : 12}
                fontFamily="'KaiTi', 'STKaiti', '楷体', serif"
                fontWeight={isActive ? 'bold' : 'normal'}
              >
                {monthLabels[month - 1]}
              </text>
            </g>
          );
        })}

        {Array.from(monthPositions.entries()).map(([_month, pos]) => {
          const monthEntries = pos.entries;
          const spacing = 36;
          const totalHeight = (monthEntries.length - 1) * spacing;
          const startY = brushLineY - PADDING_TOP - totalHeight / 2;

          return monthEntries.map((entry, i) => {
            const x = pos.x + (i % 2 === 0 ? -20 : 20);
            const y = Math.max(PADDING_TOP + entry.inkSize / 2, startY + i * spacing);
            return (
              <InkDrop
                key={entry.id}
                entry={entry}
                x={x}
                y={y}
                onHover={onEntryHover}
              />
            );
          });
        })}
      </svg>

      {scrollX > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: 'linear-gradient(to right, rgba(245,239,224,0.9), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}
      {scrollX < Math.max(0, 12 * MONTH_GAP + PADDING_LEFT * 2 - viewWidth) && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: 'linear-gradient(to left, rgba(245,239,224,0.9), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

export default React.memo(Timeline);
