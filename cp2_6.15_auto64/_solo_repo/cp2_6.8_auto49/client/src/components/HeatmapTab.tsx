import React, { useEffect, useRef, useState, useMemo } from 'react';
import { KeywordData } from '../types';

interface HeatmapTabProps {
  keywords: KeywordData[];
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}

function getDateLabels(): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return labels;
}

function heatColor(value: number): string {
  const t = Math.max(0, Math.min(1, (value - 10) / 90));
  const r1 = 74, g1 = 158, b1 = 255;
  const r2 = 255, g2 = 59, b2 = 59;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

const CELL_HEIGHT = 30;
const CELL_WIDTH = 80;
const LABEL_WIDTH = 100;
const HEADER_HEIGHT = 32;
const GAP = 2;
const MAX_ROWS = 20;

const HeatmapTab: React.FC<HeatmapTabProps> = ({ keywords, canvasRef }) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const labels = useMemo(() => getDateLabels(), []);

  const displayKeywords = useMemo(() => keywords.slice(0, 20), [keywords]);

  const canvasWidth = LABEL_WIDTH + labels.length * CELL_WIDTH + GAP * labels.length;
  const canvasHeight = HEADER_HEIGHT + displayKeywords.length * (CELL_HEIGHT + GAP);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#16213E';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#E0E0E0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    labels.forEach((label, i) => {
      const x = LABEL_WIDTH + i * (CELL_WIDTH + GAP) + CELL_WIDTH / 2;
      ctx.fillText(label, x, HEADER_HEIGHT / 2);
    });

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    displayKeywords.forEach((k, row) => {
      const y = HEADER_HEIGHT + row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;
      ctx.fillStyle = '#E0E0E0';
      ctx.fillText(k.keyword, LABEL_WIDTH - 8, y);
      k.trend.forEach((val, col) => {
        const x = LABEL_WIDTH + col * (CELL_WIDTH + GAP);
        const yCell = HEADER_HEIGHT + row * (CELL_HEIGHT + GAP);
        ctx.fillStyle = heatColor(val);
        ctx.fillRect(x, yCell, CELL_WIDTH, CELL_HEIGHT);
      });
    });
  }, [displayKeywords, labels, canvasWidth, canvasHeight, ref]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < LABEL_WIDTH || y < HEADER_HEIGHT) {
      setTooltip(null);
      return;
    }

    const col = Math.floor((x - LABEL_WIDTH) / (CELL_WIDTH + GAP));
    const row = Math.floor((y - HEADER_HEIGHT) / (CELL_HEIGHT + GAP));

    if (row >= 0 && row < displayKeywords.length && col >= 0 && col < labels.length) {
      const cellX = LABEL_WIDTH + col * (CELL_WIDTH + GAP);
      const cellY = HEADER_HEIGHT + row * (CELL_HEIGHT + GAP);
      if (x >= cellX && x < cellX + CELL_WIDTH && y >= cellY && y < cellY + CELL_HEIGHT) {
        const kw = displayKeywords[row];
        setTooltip({
          x: e.clientX - rect.left + 12,
          y: e.clientY - rect.top + 12,
          text: `${kw.keyword} - ${labels[col]}: ${kw.trend[col]}`,
        });
        return;
      }
    }
    setTooltip(null);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxHeight: MAX_ROWS * (CELL_HEIGHT + GAP) + HEADER_HEIGHT + 16,
        overflowY: 'auto',
        overflowX: 'auto',
      }}
      onMouseLeave={() => setTooltip(null)}
    >
      <canvas
        ref={ref}
        onMouseMove={handleMouseMove}
        style={{ display: 'block' }}
      />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: '#16213E',
            border: '1px solid #2a2a4a',
            color: '#E0E0E0',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default HeatmapTab;
