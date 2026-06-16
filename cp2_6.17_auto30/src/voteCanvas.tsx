import React, { useEffect, useRef, useState } from 'react';
import type { Vote } from './storage';
import { getShortFingerprint } from './fingerprint';

interface VoteCanvasProps {
  votes: Vote[];
}

const CANVAS_W = 720;
const CANVAS_H = 480;
const PAD_L = 60;
const PAD_R = 40;
const PAD_T = 40;
const PAD_B = 60;

const COLOR_A = '#ef4444';
const COLOR_B = '#3b82f6';
const COLOR_C = '#22c55e';

interface UserPoint {
  fingerprint: string;
  firstChoice: 'A' | 'B' | 'C';
  aRatio: number;
  bRatio: number;
  x: number;
  y: number;
}

function computePoints(votes: Vote[]): UserPoint[] {
  const map = new Map<string, { a: number; b: number; c: number; first: 'A' | 'B' | 'C' | null; firstTs: number }>();
  for (const v of votes) {
    let rec = map.get(v.fingerprint);
    if (!rec) {
      rec = { a: 0, b: 0, c: 0, first: null, firstTs: Infinity };
      map.set(v.fingerprint, rec);
    }
    if (v.timestamp < rec.firstTs) {
      rec.first = v.choice;
      rec.firstTs = v.timestamp;
    }
    if (v.choice === 'A') rec.a++;
    else if (v.choice === 'B') rec.b++;
    else rec.c++;
  }
  const plotW = CANVAS_W - PAD_L - PAD_R;
  const plotH = CANVAS_H - PAD_T - PAD_B;
  const result: UserPoint[] = [];
  for (const [fp, rec] of map.entries()) {
    const total = rec.a + rec.b + rec.c;
    const ar = total > 0 ? rec.a / total : 1 / 3;
    const br = total > 0 ? rec.b / total : 1 / 3;
    const jitterX = (parseInt(fp.slice(0, 4), 16) % 100 - 50) / 500;
    const jitterY = (parseInt(fp.slice(4, 8), 16) % 100 - 50) / 500;
    const cx = PAD_L + Math.min(plotW - 4, Math.max(4, (ar + jitterX) * plotW));
    const cy = PAD_T + Math.min(plotH - 4, Math.max(4, (br + jitterY) * plotH));
    result.push({
      fingerprint: fp,
      firstChoice: rec.first || 'A',
      aRatio: ar,
      bRatio: br,
      x: cx,
      y: cy,
    });
  }
  return result;
}

function computeDivergence(points: UserPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;
  let diff = 0;
  const totalPairs = (n * (n - 1)) / 2;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (points[i].firstChoice !== points[j].firstChoice) diff++;
    }
  }
  return Math.round((diff / totalPairs) * 100);
}

const VoteCanvas: React.FC<VoteCanvasProps> = ({ votes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; fp: string } | null>(null);
  const points = useRef<UserPoint[]>([]);
  const divergence = computeDivergence(points.current.length > 0 ? points.current : computePoints(votes));

  useEffect(() => {
    points.current = computePoints(votes);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    const startT = performance.now();
    const pointDur = 500;
    const lineDur = 300;
    const lineDelay = 400;

    const centerX = PAD_L + (CANVAS_W - PAD_L - PAD_R) / 2;
    const centerY = PAD_T + (CANVAS_H - PAD_T - PAD_B) / 2;

    function draw(now: number) {
      const elapsed = now - startT;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      const gridCols = 4;
      const gridRows = 4;
      const plotW = CANVAS_W - PAD_L - PAD_R;
      const plotH = CANVAS_H - PAD_T - PAD_B;
      for (let i = 0; i <= gridCols; i++) {
        const x = PAD_L + (plotW * i) / gridCols;
        ctx.beginPath();
        ctx.moveTo(x, PAD_T);
        ctx.lineTo(x, CANVAS_H - PAD_B);
        ctx.stroke();
      }
      for (let i = 0; i <= gridRows; i++) {
        const y = PAD_T + (plotH * i) / gridRows;
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(CANVAS_W - PAD_R, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD_L, PAD_T);
      ctx.lineTo(PAD_L, CANVAS_H - PAD_B);
      ctx.lineTo(CANVAS_W - PAD_R, CANVAS_H - PAD_B);
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('选项 A 占比 →', CANVAS_W / 2, CANVAS_H - 20);
      ctx.save();
      ctx.translate(16, CANVAS_H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('选项 B 占比 →', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i <= gridCols; i++) {
        const x = PAD_L + (plotW * i) / gridCols;
        ctx.fillText((i / gridCols).toFixed(2), x, CANVAS_H - PAD_B + 16);
      }
      ctx.textAlign = 'right';
      for (let i = 0; i <= gridRows; i++) {
        const y = PAD_T + (plotH * i) / gridRows;
        ctx.fillText((1 - i / gridRows).toFixed(2), PAD_L - 8, y + 4);
      }

      const ptArr = points.current;
      const lineProgress = Math.min(1, Math.max(0, (elapsed - lineDelay) / lineDur));
      if (lineProgress > 0 && ptArr.length >= 2) {
        ctx.strokeStyle = `rgba(224, 224, 224, ${0.3 * lineProgress})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < ptArr.length; i++) {
          for (let j = i + 1; j < ptArr.length; j++) {
            if (ptArr[i].firstChoice !== ptArr[j].firstChoice) {
              const t = Math.min(1, elapsed / pointDur);
              const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              const xi = centerX + (ptArr[i].x - centerX) * ease;
              const yi = centerY + (ptArr[i].y - centerY) * ease;
              const xj = centerX + (ptArr[j].x - centerX) * ease;
              const yj = centerY + (ptArr[j].y - centerY) * ease;
              ctx.moveTo(xi, yi);
              ctx.lineTo(xj, yj);
            }
          }
        }
        ctx.stroke();
      }

      for (const p of ptArr) {
        const t = Math.min(1, elapsed / pointDur);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = centerX + (p.x - centerX) * ease;
        const y = centerY + (p.y - centerY) * ease;
        const color = p.firstChoice === 'A' ? COLOR_A : p.firstChoice === 'B' ? COLOR_B : COLOR_C;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (elapsed < pointDur + lineDur + 100) {
        animRef.current = requestAnimationFrame(draw);
      }
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [votes]);

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    let found: UserPoint | null = null;
    for (const p of points.current) {
      const dx = p.x - mx;
      const dy = p.y - my;
      if (dx * dx + dy * dy <= 36) {
        found = p;
        break;
      }
    }
    if (found) {
      setHoverInfo({ x: e.clientX - rect.left, y: e.clientY - rect.top, fp: found.fingerprint });
    } else {
      setHoverInfo(null);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '8px 14px',
          background: divergence > 60 ? '#fef2f2' : divergence > 30 ? '#fffbeb' : '#f0fdf4',
          borderRadius: 8,
          border: `1px solid ${divergence > 60 ? '#fecaca' : divergence > 30 ? '#fde68a' : '#bbf7d0'}`,
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>分歧指数</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: divergence > 60 ? '#dc2626' : divergence > 30 ? '#d97706' : '#16a34a',
          }}
        >
          {divergence}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          cursor: 'crosshair',
          display: 'block',
          maxWidth: '100%',
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
        }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverInfo(null)}
      />
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: hoverInfo.x + 12,
            top: hoverInfo.y - 10,
            background: '#1f2937',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 20,
          }}
        >
          用户: {getShortFingerprint(hoverInfo.fp)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
        {[
          { label: '选项 A', color: COLOR_A },
          { label: '选项 B', color: COLOR_B },
          { label: '选项 C', color: COLOR_C },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#d1d5db' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoteCanvas;
