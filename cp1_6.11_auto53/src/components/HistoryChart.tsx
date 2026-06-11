import React, { useEffect, useRef, useState } from 'react';
import type { LanguageName } from '../utils/algorithmRunner';
import { LANGUAGE_COLORS } from '../utils/algorithmRunner';

export interface HistoryEntry {
  language: LanguageName;
  timeMs: number;
}

interface HistoryChartProps {
  history: HistoryEntry[][];
  languages: LanguageName[];
}

const CHART_WIDTH = 700;
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 30, bottom: 30, left: 60 };

const HistoryChart: React.FC<HistoryChartProps> = ({ history, languages }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    label: string;
    color: string;
    runIndex: number;
    language: LanguageName;
  } | null>(null);

  const languageDataMap = useRef<
    Map<LanguageName, { x: number; y: number; timeMs: number; runIndex: number }[]>
  >(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CHART_WIDTH * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${CHART_HEIGHT}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

    const chartW = CHART_WIDTH - PADDING.left - PADDING.right;
    const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const allTimes = history.flatMap((entry) => entry.map((e) => e.timeMs));
    if (allTimes.length === 0) {
      ctx.fillStyle = '#45A29E';
      ctx.font = '13px "Segoe UI", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无历史数据，开始赛跑后将记录性能趋势', CHART_WIDTH / 2, CHART_HEIGHT / 2);
      languageDataMap.current.clear();
      return;
    }

    const maxTime = Math.max(...allTimes) * 1.1;
    const minTime = 0;

    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PADDING.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + chartW, y);
      ctx.stroke();

      const value = maxTime - ((maxTime - minTime) / 4) * i;
      ctx.fillStyle = '#45A29E';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${value.toFixed(1)}ms`, PADDING.left - 8, y);
    }

    for (let i = 0; i < history.length; i++) {
      const x = PADDING.left + (chartW / Math.max(history.length - 1, 1)) * i;
      ctx.fillStyle = '#45A29E';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`#${i + 1}`, x, CHART_HEIGHT - 8);
    }

    const newLanguageDataMap = new Map<
      LanguageName,
      { x: number; y: number; timeMs: number; runIndex: number }[]
    >();

    languages.forEach((lang) => {
      const points: { x: number; y: number; timeMs: number; runIndex: number }[] = [];
      const color = LANGUAGE_COLORS[lang];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();

      let started = false;
      history.forEach((entry, runIndex) => {
        const dataPoint = entry.find((e) => e.language === lang);
        if (!dataPoint) return;

        const x = PADDING.left + (chartW / Math.max(history.length - 1, 1)) * runIndex;
        const y = PADDING.top + chartH - ((dataPoint.timeMs - minTime) / (maxTime - minTime)) * chartH;

        points.push({ x, y, timeMs: dataPoint.timeMs, runIndex });

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
      ctx.setLineDash([]);

      points.forEach((pt) => {
        const isHovered =
          hoveredPoint?.runIndex === pt.runIndex && hoveredPoint?.language === lang;
        const radius = isHovered ? 7 : 4;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = `${color}22`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#0B0C10';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }
      });

      newLanguageDataMap.set(lang, points);
    });

    languageDataMap.current = newLanguageDataMap;
  }, [history, languages, hoveredPoint]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: {
      x: number;
      y: number;
      label: string;
      color: string;
      runIndex: number;
      language: LanguageName;
    } | null = null;

    let closestDist = 20;

    for (const [lang, points] of languageDataMap.current.entries()) {
      for (const pt of points) {
        const dist = Math.sqrt((mx - pt.x) ** 2 + (my - pt.y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          found = {
            x: pt.x,
            y: pt.y,
            label: `${lang} · #${pt.runIndex + 1}\n${pt.timeMs.toFixed(2)}ms`,
            color: LANGUAGE_COLORS[lang],
            runIndex: pt.runIndex,
            language: lang,
          };
        }
      }
    }

    setHoveredPoint(found);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: hoveredPoint ? 'pointer' : 'crosshair' }}
      />
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hoveredPoint.x + 14, CHART_WIDTH - 160),
            top: Math.max(hoveredPoint.y - 48, 0),
            background: 'rgba(11, 12, 16, 0.95)',
            border: `1px solid ${hoveredPoint.color}`,
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            color: hoveredPoint.color,
            pointerEvents: 'none',
            whiteSpace: 'pre-line',
            fontFamily: 'monospace',
            boxShadow: `0 0 12px ${hoveredPoint.color}44`,
            zIndex: 10,
            lineHeight: 1.4,
          }}
        >
          {hoveredPoint.label}
        </div>
      )}
    </div>
  );
};

export default HistoryChart;
