import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMotionStore } from '../stores/motionStore';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>(0);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(parseFloat(current.toFixed(decimals)));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    prevRef.current = value;

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, decimals]);

  return <>{display.toFixed(decimals)}</>;
}

function MiniChart({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 180;
    const h = 60;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    if (data.length < 2) return;

    const progress = Math.min(progressRef.current, 1);
    const visibleCount = Math.ceil(data.length * progress);
    if (visibleCount < 2) return;

    const min = Math.min(...data) - 5;
    const max = Math.max(...data) + 5;
    const range = max - min || 1;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(0, 230, 118, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 230, 118, 0.0)');

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let i = 0; i < visibleCount; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((data[i] - min) / range) * h;
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = ((i - 1) / (data.length - 1)) * w;
        const prevY = h - ((data[i - 1] - min) / range) * h;
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }

    const lastX = ((visibleCount - 1) / (data.length - 1)) * w;
    ctx.lineTo(lastX, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < visibleCount; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((data[i] - min) / range) * h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = ((i - 1) / (data.length - 1)) * w;
        const prevY = h - ((data[i - 1] - min) / range) * h;
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }

    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (progress < 1) {
      progressRef.current += 0.04;
      animRef.current = requestAnimationFrame(draw);
    }
  }, [data]);

  useEffect(() => {
    progressRef.current = 0;
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 180, height: 60, display: 'block' }}
    />
  );
}

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const heartRate = useMotionStore((s) => s.heartRate);
  const totalTime = useMotionStore((s) => s.totalTime);
  const avgHeartRate = useMotionStore((s) => s.avgHeartRate);
  const calories = useMotionStore((s) => s.calories);
  const heartRateHistory = useMotionStore((s) => s.heartRateHistory);

  return (
    <aside
      className="sidebar"
      style={{
        width: 200,
        background: '#1a1a1a',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
        flexShrink: 0
      }}
    >
      <div style={{ padding: 20 }}>
        <h3
          style={{
            color: '#e0e0e0',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 20,
            letterSpacing: 1,
            textTransform: 'uppercase'
          }}
        >
          运动统计
        </h3>

        <div className="stat-item">
          <div className="stat-label">总运动时长</div>
          <div className="stat-value monospace">
            <AnimatedNumber value={totalTime} decimals={0} />
            <span className="stat-unit">s</span>
          </div>
          <div className="stat-readable">{formatTime(totalTime)}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">平均心率</div>
          <div className="stat-value monospace" style={{ color: '#ff9800' }}>
            <AnimatedNumber value={avgHeartRate} decimals={0} />
            <span className="stat-unit">bpm</span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">消耗卡路里</div>
          <div className="stat-value monospace" style={{ color: '#e040fb' }}>
            <AnimatedNumber value={calories} decimals={1} />
            <span className="stat-unit">kcal</span>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">当前心率</div>
          <div className="stat-value monospace" style={{ color: '#00e676' }}>
            <AnimatedNumber value={heartRate} decimals={0} />
            <span className="stat-unit">bpm</span>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="stat-label" style={{ marginBottom: 8 }}>
            心率曲线
          </div>
          <div
            style={{
              background: '#0d0d0d',
              borderRadius: 8,
              padding: 8,
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <MiniChart data={heartRateHistory} />
          </div>
        </div>
      </div>

      <style>{`
        .stat-item {
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid #2a2a2a;
        }
        .stat-label {
          color: #888;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #e0e0e0;
          font-variant-numeric: tabular-nums;
        }
        .stat-unit {
          font-size: 12px;
          color: #666;
          margin-left: 4px;
          font-weight: 400;
        }
        .stat-readable {
          color: #555;
          font-size: 11px;
          margin-top: 2px;
          font-family: monospace;
        }
        .monospace {
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        }
      `}</style>
    </aside>
  );
}
