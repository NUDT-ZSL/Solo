import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRaceStore } from '../store/useRaceStore';
import type { ProgrammingLanguage } from '../types';
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../types';

interface TooltipData {
  x: number;
  y: number;
  label: string;
  value: string;
}

const HistoryChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const { history, isFadingOut } = useRaceStore();

  const languages = useRaceStore((state) => {
    const langs = new Set<ProgrammingLanguage>();
    state.history.forEach((entry) => {
      entry.results.forEach((r) => langs.add(r.language));
    });
    return Array.from(langs);
  });

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (history.length === 0) {
      ctx.fillStyle = '#606B7A';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无历史记录', width / 2, height / 2);
      return;
    }

    const padding = { top: 20, right: 20, bottom: 36, left: 56 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const allTimes = history.flatMap((h) => h.results.map((r) => r.elapsedMs));
    const maxTime = Math.max(...allTimes) * 1.15;
    const minTime = 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      const value = Math.round(maxTime - ((maxTime - minTime) / gridLines) * i);
      ctx.fillStyle = '#606B7A';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${value}ms`, padding.left - 8, y);
    }

    const reversedHistory = [...history].reverse();
    const xStep = chartW / Math.max(reversedHistory.length - 1, 1);

    ctx.fillStyle = '#A0AEC0';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    reversedHistory.forEach((entry, i) => {
      const x = padding.left + xStep * i;
      const time = new Date(entry.timestamp);
      const label = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      ctx.fillText(label, x, padding.top + chartH + 10);
    });

    languages.forEach((lang) => {
      const color = LANGUAGE_COLORS[lang];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();

      let started = false;
      reversedHistory.forEach((entry, i) => {
        const result = entry.results.find((r) => r.language === lang);
        if (!result) return;

        const x = padding.left + xStep * i;
        const y =
          padding.top +
          chartH -
          ((result.elapsedMs - minTime) / (maxTime - minTime)) * chartH;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      reversedHistory.forEach((entry, i) => {
        const result = entry.results.find((r) => r.language === lang);
        if (!result) return;

        const x = padding.left + xStep * i;
        const y =
          padding.top +
          chartH -
          ((result.elapsedMs - minTime) / (maxTime - minTime)) * chartH;

        ctx.fillStyle = '#0B0C10';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
      });
    });

    ctx.strokeStyle = 'rgba(102, 252, 241, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();
  }, [history, languages]);

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper || history.length === 0) return;

      const rect = wrapper.getBoundingClientRect();
      const padding = { top: 20, right: 20, bottom: 36, left: 56 };
      const chartW = rect.width - padding.left - padding.right;
      const chartH = rect.height - padding.top - padding.bottom;
      const xStep = chartW / Math.max(history.length - 1, 1);
      const reversedHistory = [...history].reverse();

      const mouseX = e.clientX - rect.left - padding.left;
      const mouseY = e.clientY - rect.top - padding.top;

      let closest: { dist: number; lang: ProgrammingLanguage; entryIdx: number; x: number; y: number } | null = null;

      languages.forEach((lang) => {
        reversedHistory.forEach((entry, i) => {
          const result = entry.results.find((r) => r.language === lang);
          if (!result) return;

          const allTimes = history.flatMap((h) => h.results.map((r) => r.elapsedMs));
          const maxTime = Math.max(...allTimes) * 1.15;
          const minTime = 0;

          const x = xStep * i;
          const y = chartH - ((result.elapsedMs - minTime) / (maxTime - minTime)) * chartH;

          const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
          if (dist < 12 && (!closest || dist < closest.dist)) {
            closest = { dist, lang, entryIdx: i, x: x + padding.left, y: y + padding.top };
          }
        });
      });

      if (closest) {
        const result = reversedHistory[closest.entryIdx].results.find(
          (r) => r.language === closest!.lang
        );
        setTooltip({
          x: closest.x,
          y: closest.y - 10,
          label: LANGUAGE_LABELS[closest.lang],
          value: result ? `${result.elapsedMs}ms` : ''
        });
      } else {
        setTooltip(null);
      }
    },
    [history, languages]
  );

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className={`history-section ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="history-header">
        <div className="history-title">历 史 记 录（最近 5 次）</div>
        <div className="history-legend">
          {languages.map((lang) => (
            <div key={lang} className="legend-item">
              <span
                className="legend-line"
                style={{ background: LANGUAGE_COLORS[lang] }}
              />
              {LANGUAGE_LABELS[lang]}
            </div>
          ))}
        </div>
      </div>
      <div className="chart-canvas-wrapper" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          className="chart-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {tooltip && (
          <div
            className="chart-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="tooltip-label">{tooltip.label}</div>
            <div className="tooltip-value">{tooltip.value}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryChart;
