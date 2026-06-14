import { useEffect, useRef, useState, useCallback } from 'react';
import type { Keystroke } from './types';

interface WaveVisualizerProps {
  keystrokes: Keystroke[];
  currentWpm: number;
  consecutiveErrors: number;
  isReplaying?: boolean;
  sessionKey: number;
}

const CANVAS_W = 400;
const CANVAS_H = 250;
const WAVE_WINDOW_MS = 8000;
const PAD_TOP = 20;
const PAD_BOTTOM = 40;
const PAD_LEFT = 10;
const PAD_RIGHT = 10;

export default function WaveVisualizer({
  keystrokes,
  currentWpm,
  consecutiveErrors,
  isReplaying = false,
  sessionKey,
}: WaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [rhythm, setRhythm] = useState(0);
  const [flashError, setFlashError] = useState(false);
  const flashTimerRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastKsLenRef = useRef(0);

  useEffect(() => {
    lastKsLenRef.current = 0;
    phaseRef.current = 0;
  }, [sessionKey]);

  useEffect(() => {
    if (consecutiveErrors >= 3) {
      setFlashError(true);
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = window.setTimeout(() => {
        setFlashError(false);
        flashTimerRef.current = null;
      }, 300);
    }
  }, [consecutiveErrors]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_W * dpr) {
      canvas.width = CANVAS_W * dpr;
      canvas.height = CANVAS_H * dpr;
      canvas.style.width = `${CANVAS_W}px`;
      canvas.style.height = `${CANVAS_H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bgGrad.addColorStop(0, 'rgba(102, 126, 234, 0.04)');
    bgGrad.addColorStop(1, 'rgba(118, 75, 162, 0.02)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const plotW = CANVAS_W - PAD_LEFT - PAD_RIGHT;
    const plotH = CANVAS_H - PAD_TOP - PAD_BOTTOM;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD_TOP + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(CANVAS_W - PAD_RIGHT, y);
      ctx.stroke();
    }

    const now = performance.now();
    const windowStart = now - WAVE_WINDOW_MS;

    const validKs: { t: number; speed: number }[] = [];
    for (let i = 1; i < keystrokes.length; i++) {
      const k0 = keystrokes[i - 1];
      const k1 = keystrokes[i];
      const interval = k1.timestamp - k0.timestamp;
      if (interval > 0 && interval < 5000 && !k1.isError) {
        const speed = 1000 / interval;
        if (k1.timestamp >= windowStart) {
          validKs.push({ t: k1.timestamp, speed });
        }
      }
    }

    let recentRhythm = 0;
    const cutoffRecent = now - 2000;
    let rSum = 0;
    let rCount = 0;
    for (let i = validKs.length - 1; i >= 0; i--) {
      if (validKs[i].t < cutoffRecent) break;
      rSum += validKs[i].speed;
      rCount++;
    }
    if (rCount > 0) {
      recentRhythm = rSum / rCount;
    }

    phaseRef.current += (recentRhythm * 0.04) + 0.01;
    if (phaseRef.current > Math.PI * 100) phaseRef.current -= Math.PI * 100;

    const maxSpeed = 12;
    const scaleY = (s: number) => {
      const norm = Math.min(s / maxSpeed, 1);
      return PAD_TOP + plotH - norm * (plotH - 10) - 5;
    };
    const scaleX = (t: number) => {
      const p = (t - windowStart) / WAVE_WINDOW_MS;
      return PAD_LEFT + Math.max(0, Math.min(1, p)) * plotW;
    };

    const midY = PAD_TOP + plotH / 2 + 10;

    const sinePts: { x: number; y: number }[] = [];
    const stepX = 2;
    for (let x = PAD_LEFT; x <= CANVAS_W - PAD_RIGHT; x += stepX) {
      const tWindow = ((x - PAD_LEFT) / plotW) * WAVE_WINDOW_MS;
      const absT = now - WAVE_WINDOW_MS + tWindow;

      let baseSpeed = 0;
      let wTotal = 0;
      for (const k of validKs) {
        const diff = absT - k.t;
        const w = Math.exp(-(diff * diff) / (800000));
        baseSpeed += k.speed * w;
        wTotal += w;
      }
      if (wTotal > 0) baseSpeed /= wTotal;

      const amp = 4 + baseSpeed * 4 + (currentWpm > 60 ? 4 : 0);
      const freq = 0.015 + baseSpeed * 0.003;
      const offset = phaseRef.current + baseSpeed * 0.5;
      const y = midY - Math.sin(x * freq + offset) * amp;

      sinePts.push({ x, y });
    }

    const isFast = currentWpm >= 60;
    let lineGrad;
    if (isFast) {
      lineGrad = ctx.createLinearGradient(PAD_LEFT, 0, CANVAS_W - PAD_RIGHT, 0);
      lineGrad.addColorStop(0, '#f72585');
      lineGrad.addColorStop(1, '#ff6b9d');
    } else {
      lineGrad = ctx.createLinearGradient(PAD_LEFT, 0, CANVAS_W - PAD_RIGHT, 0);
      lineGrad.addColorStop(0, '#667eea');
      lineGrad.addColorStop(1, '#764ba2');
    }

    if (sinePts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(sinePts[0].x, CANVAS_H - PAD_BOTTOM);
      for (const p of sinePts) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(sinePts[sinePts.length - 1].x, CANVAS_H - PAD_BOTTOM);
      ctx.closePath();

      const areaGrad = ctx.createLinearGradient(0, PAD_TOP, 0, CANVAS_H - PAD_BOTTOM);
      if (isFast) {
        areaGrad.addColorStop(0, 'rgba(247, 37, 133, 0.25)');
        areaGrad.addColorStop(1, 'rgba(247, 37, 133, 0)');
      } else {
        areaGrad.addColorStop(0, 'rgba(102, 126, 234, 0.2)');
        areaGrad.addColorStop(1, 'rgba(102, 126, 234, 0)');
      }
      ctx.fillStyle = areaGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(sinePts[0].x, sinePts[0].y);
      for (let i = 1; i < sinePts.length; i++) {
        ctx.lineTo(sinePts[i].x, sinePts[i].y);
      }
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = isFast ? 'rgba(247, 37, 133, 0.5)' : 'rgba(102, 126, 234, 0.4)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (validKs.length > 0) {
      for (let i = 0; i < validKs.length; i++) {
        const k = validKs[i];
        const x = scaleX(k.t);
        const y = scaleY(k.speed);
        const r = 2 + Math.min(k.speed / 4, 2);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isFast
          ? `rgba(247, 37, 133, ${0.4 + Math.min(k.speed / maxSpeed, 1) * 0.5})`
          : `rgba(102, 126, 34, ${0.3 + Math.min(k.speed / maxSpeed, 1) * 0.5})`;
        if (isFast) {
          ctx.fillStyle = `rgba(247, 37, 133, ${0.4 + Math.min(k.speed / maxSpeed, 1) * 0.5})`;
        } else {
          ctx.fillStyle = `rgba(102, 126, 234, ${0.4 + Math.min(k.speed / maxSpeed, 1) * 0.5})`;
        }
        ctx.fill();
      }
    }

    setRhythm(recentRhythm);

    rafRef.current = requestAnimationFrame(draw);
  }, [keystrokes, currentWpm]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draw]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  const speedTextColor = currentWpm >= 60 ? 'var(--accent-fast)' : 'var(--accent-primary)';

  return (
    <div className="panel wave-panel">
      <div className="panel-title">
        {isReplaying ? '🎬 波形回放' : '🌊 实时波形'}
      </div>
      <div className="wave-container">
        <div
          className={`wave-canvas-wrapper${flashError ? ' flash-error' : ''}`}
          style={{
            maxWidth: `${CANVAS_W}px`,
          }}
        >
          <canvas
            ref={canvasRef}
            className="wave-canvas"
            style={{
              width: `${CANVAS_W}px`,
              height: `${CANVAS_H}px`,
            }}
          />
        </div>

        <div className="rhythm-display">
          <span className="rhythm-label">节奏速率</span>
          <span className="rhythm-value" style={{ color: currentWpm >= 60 ? '#f72585' : undefined }}>
            {rhythm.toFixed(1)}
          </span>
          <span className="rhythm-unit">键/秒</span>
        </div>

        <div className="wave-speed-indicator">
          <div
            className={`speed-dot${currentWpm >= 60 ? ' fast' : ''}`}
            style={{
              background: currentWpm >= 60 ? '#f72585' : '#667eea',
              boxShadow: `0 0 12px ${currentWpm >= 60 ? '#f72585' : '#667eea'}`,
            }}
          />
          <span className="speed-label">
            当前速度 <strong style={{ color: speedTextColor }}>{currentWpm}</strong> WPM
            {currentWpm >= 60 && <span style={{ color: '#f72585' }}> ⚡ 极速模式</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
