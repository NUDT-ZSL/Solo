import { useEffect, useRef, useState, useCallback } from 'react';
import { useFocusStore } from '../store';
import { getDateKey, getRecordsForDate, calculateFocusScore, formatDuration, DayScore, ActivityRecord, ActivityLabel } from '../types';
import { Download, X } from 'lucide-react';

function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}

function drawRing(ctx: CanvasRenderingContext2D, score: number, size: number, strokeWidth: number) {
  const center = size / 2;
  const radius = Math.max(1, center - strokeWidth / 2);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (2 * Math.PI * score) / 100;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(205, 214, 244, 0.1)';
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  if (score > 0) {
    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = '#0db9a0';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.fillStyle = '#cdd6f4';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(score)), center, center - 8);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#a6adc8';
  ctx.fillText('分', center, center + 20);
}

function drawTrend(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayScores: DayScore[],
  onPointClick: (index: number, x: number, y: number) => void
) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(205, 214, 244, 0.08)';
  ctx.lineWidth = 1;
  [25, 50, 75].forEach(v => {
    const y = padding.top + chartH - (v / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
  });

  ctx.fillStyle = '#a6adc8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 25, 50, 75, 100].forEach(v => {
    const y = padding.top + chartH - (v / 100) * chartH;
    ctx.fillText(String(v), padding.left - 6, y);
  });

  if (dayScores.length === 0) return;

  const points: { x: number; y: number }[] = dayScores.map((ds, i) => ({
    x: padding.left + (dayScores.length === 1 ? chartW / 2 : (i / (dayScores.length - 1)) * chartW),
    y: padding.top + chartH - (ds.score / 100) * chartH
  }));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#a6adc8';
  ctx.font = '11px sans-serif';
  dayScores.forEach((ds, i) => {
    const parts = ds.date.split('-');
    const label = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : ds.date.slice(5);
    ctx.fillText(label, points[i].x, padding.top + chartH + 8);
  });

  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = '#0db9a0';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#0db9a0';
    ctx.fill();
  });

  const chartRect = { left: padding.left, top: padding.top, width: chartW, height: chartH };
  return { points, chartRect };
}

function drawPie(
  ctx: CanvasRenderingContext2D,
  size: number,
  segments: { color: string; value: number; name: string }[]
) {
  const center = size / 2;
  const radius = Math.max(1, center - 8);
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  ctx.clearRect(0, 0, size, size);

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(205, 214, 244, 0.1)';
    ctx.fill();
    return;
  }

  let currentAngle = -Math.PI / 2;
  segments.forEach(seg => {
    const sliceAngle = (seg.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    currentAngle += sliceAngle;
  });
}

export default function Dashboard() {
  const records = useFocusStore(s => s.records);
  const labels = useFocusStore(s => s.labels);
  const exportCSV = useFocusStore(s => s.exportCSV);

  const ringCanvasRef = useRef<HTMLCanvasElement>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevScoreRef = useRef(0);
  const animFrameRef = useRef(0);

  const [selectedDay, setSelectedDay] = useState<DayScore | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [trendPoints, setTrendPoints] = useState<{ x: number; y: number }[]>([]);
  const trendLayoutRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

  const todayKey = getDateKey(Date.now());

  const todayScore = calculateFocusScore(records, labels, todayKey);

  const dayScores: DayScore[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getDateKey(d.getTime());
    dayScores.push(calculateFocusScore(records, labels, key));
  }

  useEffect(() => {
    const canvas = ringCanvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, 180, 180);
    const targetScore = todayScore.score;
    const startScore = prevScoreRef.current;
    const duration = 500;
    const startTime = performance.now();

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startScore + (targetScore - startScore) * eased;
      drawRing(ctx, current, 180, 12);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevScoreRef.current = targetScore;
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [todayScore.score]);

  useEffect(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const width = container ? container.clientWidth : 400;
    const ctx = setupCanvas(canvas, width, 200);

    const result = drawTrend(ctx, width, 200, dayScores, () => {});
    if (result) {
      setTrendPoints(result.points);
      trendLayoutRef.current = result.chartRect;
    }
  }, [records, labels]);

  const handleTrendClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = trendCanvasRef.current;
      if (!canvas || trendPoints.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.offsetWidth / rect.width;
      const scaleY = canvas.offsetHeight / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      for (let i = 0; i < trendPoints.length; i++) {
        const p = trendPoints[i];
        const dist = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
        if (dist <= 12) {
          setSelectedDay(dayScores[i]);
          setPopupPos({ x: e.clientX, y: e.clientY });
          return;
        }
      }
    },
    [trendPoints, dayScores]
  );

  useEffect(() => {
    if (!selectedDay) return;
    const canvas = pieCanvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, 120, 120);
    const dayRecords = getRecordsForDate(records, selectedDay.date);

    const labelMap = new Map<string, ActivityLabel>();
    labels.forEach(l => labelMap.set(l.name, l));

    const aggregated: Record<string, number> = {};
    dayRecords.forEach(r => {
      const lbl = labelMap.get(r.label);
      const key = r.label;
      aggregated[key] = (aggregated[key] || 0) + r.durationMs;
    });

    const segments = Object.entries(aggregated).map(([name, value]) => ({
      name,
      value,
      color: labelMap.get(name)?.color || '#585b70'
    }));

    drawPie(ctx, 120, segments);
  }, [selectedDay, records, labels]);

  const handleExportCSV = useCallback(() => {
    const csv = exportCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-tracker-${todayKey}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportCSV, todayKey]);

  const pieSegmentsForLegend = (() => {
    if (!selectedDay) return [];
    const dayRecords = getRecordsForDate(records, selectedDay.date);
    const labelMap = new Map<string, ActivityLabel>();
    labels.forEach(l => labelMap.set(l.name, l));
    const aggregated: Record<string, number> = {};
    dayRecords.forEach(r => {
      aggregated[r.label] = (aggregated[r.label] || 0) + r.durationMs;
    });
    return Object.entries(aggregated).map(([name, value]) => ({
      name,
      value,
      color: labelMap.get(name)?.color || '#585b70'
    }));
  })();

  return (
    <div className="rounded-card border-border bg-surface hover:shadow-lg transition-shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">专注评分</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-textSub bg-surfaceHover rounded-lg hover:bg-teal hover:text-text transition-colors"
        >
          <Download size={14} />
          导出 CSV
        </button>
      </div>

      <div className="flex justify-center">
        <canvas ref={ringCanvasRef} />
      </div>

      <div>
        <h3 className="text-sm font-medium text-textSub mb-2">7 日趋势</h3>
        <div className="w-full">
          <canvas ref={trendCanvasRef} onClick={handleTrendClick} className="cursor-pointer w-full" />
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedDay(null)}>
          <div
            className="bg-surface border-border rounded-card p-5 w-80 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">{selectedDay.date}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-textSub hover:text-text transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-textSub">总时长</span>
                <span className="text-text font-medium">{formatDuration(selectedDay.totalMs)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-textSub">高效时长</span>
                <span className="text-teal font-medium">{formatDuration(selectedDay.productiveMs)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-textSub">专注评分</span>
                <span className="text-teal font-medium">{selectedDay.score} 分</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <canvas ref={pieCanvasRef} />
              <div className="w-full space-y-1">
                {pieSegmentsForLegend.map(seg => (
                  <div key={seg.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-textSub">{seg.name}</span>
                    </div>
                    <span className="text-text">{formatDuration(seg.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
