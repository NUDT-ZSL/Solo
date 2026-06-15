import { useRef, useEffect, useState, useCallback } from 'react';
import type { Entry, EmotionTag } from '../App';

interface EmotionCurveProps {
  entries: Entry[];
  onPointClick: (entry: Entry, point: { x: number; y: number }) => void;
}

const emotionColorMap: Record<EmotionTag, string> = {
  '喜': '#FFD700',
  '怒': '#FF4444',
  '哀': '#4A90D9',
  '乐': '#66BB6A',
  '平静': '#B0BEC5'
};

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

interface HoverInfo {
  entry: Entry;
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

function EmotionCurve({ entries, onPointClick }: EmotionCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 360 });
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const pointsRef = useRef<{ entry: Entry; x: number; y: number }[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(320, rect.width);
        const height = Math.max(280, Math.min(400, width * 0.6));
        setCanvasSize({ width, height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getWeekEntries = useCallback((): Entry[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const weekEntries: (Entry | null)[] = Array(7).fill(null);

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((entryDate.getTime() - sunday.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        if (!weekEntries[diffDays]) {
          weekEntries[diffDays] = entry;
        }
      }
    }

    return weekEntries.map((e, i) => {
      if (e) return e;
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return {
        id: `empty_${i}`,
        date: d.toISOString().split('T')[0],
        moodKeywords: [],
        emotion: '平静' as EmotionTag,
        emotionIntensity: 50,
        food: { id: '', name: '', emoji: '', color: '#DDDDDD', taste: '甜' as const }
      };
    });
  }, [entries]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 180, g: 180, b: 180 };
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const lerpColor = (color1: string, color2: string, t: number) => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(lerp(c1.r, c2.r, t));
    const g = Math.round(lerp(c1.g, c2.g, t));
    const b = Math.round(lerp(c1.b, c2.b, t));
    return `rgb(${r},${g},${b})`;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvasSize.width;
    const H = canvasSize.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const padding = { top: 40, right: 40, bottom: 70, left: 50 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    ctx.clearRect(0, 0, W, H);

    const weekEntries = getWeekEntries();
    const points: { entry: Entry; x: number; y: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const entry = weekEntries[i];
      const x = padding.left + (i / 6) * chartW;
      const normalizedIntensity = Math.max(0, Math.min(100, entry.emotionIntensity));
      const y = padding.top + chartH - (normalizedIntensity / 100) * chartH;
      points.push({ entry, x, y });
    }
    pointsRef.current = points;

    const emotions: EmotionTag[] = ['喜', '怒', '哀', '乐', '平静'];
    const allEmotionEntries = entries.filter(e => e.id.startsWith('e_'));
    for (const entry of allEmotionEntries) {
      const dateObj = new Date(entry.date);
      const dayOfWeek = dateObj.getDay();
      const baseX = padding.left + (dayOfWeek / 6) * chartW;
      const baseY = padding.top + chartH - (entry.emotionIntensity / 100) * chartH;
      const color = emotionColorMap[entry.emotion];
      const rgb = hexToRgb(color);

      for (let j = 0; j < 6; j++) {
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 80;
        const radius = 3 + Math.random() * 5;
        const alpha = 0.15 + Math.random() * 0.25;

        ctx.beginPath();
        ctx.arc(baseX + offsetX, baseY + offsetY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.fill();
      }
    }

    emotions.forEach((_em, idx) => {
      for (let k = 0; k < 15; k++) {
        const rx = padding.left + Math.random() * chartW;
        const ry = padding.top + Math.random() * chartH;
        const color = emotionColorMap[emotions[idx % emotions.length]];
        const rgb = hexToRgb(color);
        const radius = 2 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(rx, ry, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`;
        ctx.fill();
      }
    });

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();

      const value = 100 - i * 20;
      ctx.fillStyle = '#999999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), padding.left - 10, y);
    }

    for (let i = 0; i < 7; i++) {
      const x = padding.left + (i / 6) * chartW;
      const today = new Date();
      const dayOfWeek = today.getDay();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - dayOfWeek);
      const targetDate = new Date(sunday);
      targetDate.setDate(sunday.getDate() + i);

      ctx.fillStyle = i === dayOfWeek ? '#C9B896' : '#AAAAAA';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(weekdayLabels[i], x, H - padding.bottom + 35);

      ctx.fillStyle = '#CCCCCC';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${targetDate.getMonth() + 1}/${targetDate.getDate()}`, x, H - padding.bottom + 50);

      if (i === dayOfWeek) {
        ctx.fillStyle = '#C9B896';
        ctx.beginPath();
        ctx.arc(x, H - padding.bottom + 25, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (points.length >= 2) {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const color1 = emotionColorMap[p1.entry.emotion];
        const color2 = emotionColorMap[p2.entry.emotion];
        const hasData1 = p1.entry.id.startsWith('e_');
        const hasData2 = p2.entry.id.startsWith('e_');

        if (!hasData1 && !hasData2) continue;

        const steps = 60;
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps;
          const t2 = (s + 1) / steps;
          const sx = lerp(p1.x, p2.x, t1);
          const sy = lerp(p1.y, p2.y, t1);
          const ex = lerp(p1.x, p2.x, t2);
          const ey = lerp(p1.y, p2.y, t2);

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = lerpColor(color1, color2, (t1 + t2) / 2);
          ctx.stroke();
        }
      }
    }

    for (const point of points) {
      const hasData = point.entry.id.startsWith('e_');
      const color = emotionColorMap[point.entry.emotion];
      const rgb = hexToRgb(color);

      if (hasData) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, hasData ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = hasData ? color : '#E0E0E0';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (hasData && point.entry.food.emoji) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(point.entry.food.emoji, point.x, point.y + 16);
      }
    }

    if (hoverInfo) {
      const tipX = hoverInfo.canvasX + 15;
      const tipY = hoverInfo.canvasY - 50;
      const paddingTip = 12;
      ctx.font = '12px sans-serif';
      const lines = [
        `📅 ${hoverInfo.entry.date}`,
        `😊 心情：${hoverInfo.entry.moodKeywords.join('、') || '无'}`,
        `🍽️ 食物：${hoverInfo.entry.food.name} ${hoverInfo.entry.food.emoji}`,
        `📊 情绪强度：${hoverInfo.entry.emotionIntensity}`
      ];
      const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + paddingTip * 2;
      const lineHeight = 20;
      const tipH = lines.length * lineHeight + paddingTip;

      const drawX = tipX + maxWidth > W ? hoverInfo.canvasX - maxWidth - 15 : tipX;
      const drawY = tipY < 0 ? hoverInfo.canvasY + 15 : tipY;

      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const radius = 8;
      ctx.moveTo(drawX + radius, drawY);
      ctx.lineTo(drawX + maxWidth - radius, drawY);
      ctx.quadraticCurveTo(drawX + maxWidth, drawY, drawX + maxWidth, drawY + radius);
      ctx.lineTo(drawX + maxWidth, drawY + tipH - radius);
      ctx.quadraticCurveTo(drawX + maxWidth, drawY + tipH, drawX + maxWidth - radius, drawY + tipH);
      ctx.lineTo(drawX + radius, drawY + tipH);
      ctx.quadraticCurveTo(drawX, drawY + tipH, drawX, drawY + tipH - radius);
      ctx.lineTo(drawX, drawY + radius);
      ctx.quadraticCurveTo(drawX, drawY, drawX + radius, drawY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      lines.forEach((line, idx) => {
        ctx.fillStyle = idx === 0 ? '#666666' : '#333333';
        ctx.fillText(line, drawX + paddingTip, drawY + paddingTip / 2 + idx * lineHeight);
      });
    }
  }, [canvasSize, getWeekEntries, hoverInfo]);

  useEffect(() => {
    const render = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const findNearestPoint = (mx: number, my: number) => {
    let best: { entry: Entry; x: number; y: number; dist: number } | null = null;
    for (const p of pointsRef.current) {
      if (!p.entry.id.startsWith('e_')) continue;
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20 && (!best || dist < best.dist)) {
        best = { ...p, dist };
      }
    }
    return best;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const near = findNearestPoint(mx, my);
    if (near) {
      setHoverInfo({
        entry: near.entry,
        x: near.x,
        y: near.y,
        canvasX: mx,
        canvasY: my
      });
      canvas.style.cursor = 'pointer';
    } else {
      setHoverInfo(null);
      canvas.style.cursor = 'default';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const near = findNearestPoint(mx, my);
    if (near) {
      const clientRect = containerRef.current?.getBoundingClientRect();
      const absoluteX = (clientRect?.left || 0) + near.x;
      const absoluteY = (clientRect?.top || 0) + near.y;
      onPointClick(near.entry, { x: absoluteX, y: absoluteY });
    }
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: canvasSize.width, height: canvasSize.height }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        marginTop: 8,
        flexWrap: 'wrap',
        padding: '4px 0'
      }}>
        {(['喜', '怒', '哀', '乐', '平静'] as EmotionTag[]).map(em => (
          <div key={em} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: emotionColorMap[em]
            }} />
            <span style={{ fontSize: 12, color: '#666' }}>{em}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmotionCurve;
