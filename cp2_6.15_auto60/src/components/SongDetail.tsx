import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSongStore, SongWithMatch } from '../stores/songStore';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SpectrumCanvas({ bpm }: { bpm: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const barsRef = useRef<number[]>([]);
  const targetRef = useRef<number[]>([]);

  const BAR_COUNT = 40;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (barsRef.current.length === 0) {
      barsRef.current = Array(BAR_COUNT).fill(8);
      targetRef.current = Array(BAR_COUNT).fill(8);
    }

    const beatIntensity = 0.5 + 0.5 * Math.sin(Date.now() * (bpm / 60) * Math.PI / 500);
    for (let i = 0; i < BAR_COUNT; i++) {
      const baseHeight = 8 + (Math.sin(i * 0.5 + Date.now() * 0.003) * 0.5 + 0.5) * 40;
      targetRef.current[i] = baseHeight * (0.3 + beatIntensity * 0.7);
      barsRef.current[i] += (targetRef.current[i] - barsRef.current[i]) * 0.15;
    }

    const barWidth = (w - (BAR_COUNT - 1) * 2) / BAR_COUNT;
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, '#00bcd4');
    gradient.addColorStop(1, '#e040fb');

    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = Math.max(8, Math.min(48, barsRef.current[i]));
      const x = i * (barWidth + 2);
      const y = h - barH;

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = 2;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, h);
      ctx.lineTo(x, h);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [bpm]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 120,
        display: 'block',
        borderRadius: 8
      }}
    />
  );
}

function WaveformCanvas({ bpm }: { bpm: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const time = Date.now() / 1000;
    const freq = bpm / 60;

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#00bcd4');
    gradient.addColorStop(0.5, '#e040fb');
    gradient.addColorStop(1, '#00bcd4');

    ctx.beginPath();
    ctx.moveTo(0, h / 2);

    for (let x = 0; x < w; x++) {
      const normalX = x / w;
      const wave1 = Math.sin(normalX * Math.PI * freq * 4 + time * 3) * 0.4;
      const wave2 = Math.sin(normalX * Math.PI * freq * 8 + time * 5) * 0.15;
      const wave3 = Math.sin(normalX * Math.PI * freq * 2 + time * 1.5) * 0.25;
      const combined = wave1 + wave2 + wave3;
      const y = h / 2 + combined * (h / 2 - 4);
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();

    const fillGradient = ctx.createLinearGradient(0, 0, 0, h);
    fillGradient.addColorStop(0, 'rgba(0, 188, 212, 0.1)');
    fillGradient.addColorStop(0.5, 'rgba(224, 64, 251, 0.08)');
    fillGradient.addColorStop(1, 'rgba(0, 188, 212, 0.0)');

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillGradient;
    ctx.fill();

    animRef.current = requestAnimationFrame(draw);
  }, [bpm]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 80,
        display: 'block',
        borderRadius: 8
      }}
    />
  );
}

interface SongDetailProps {
  song: SongWithMatch;
  onBack: () => void;
}

export default function SongDetail({ song, onBack }: SongDetailProps) {
  return (
    <motion.div
      className="song-detail"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="detail-header">
        <motion.button
          className="back-btn"
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← 返回
        </motion.button>
        <div className="detail-title-section">
          <h2 className="detail-song-title">{song.title}</h2>
          <p className="detail-song-artist">{song.artist}</p>
        </div>
      </div>

      <div className="detail-canvas-section">
        <div className="canvas-label">频谱动画</div>
        <div className="canvas-wrapper">
          <SpectrumCanvas bpm={song.bpm} />
        </div>
      </div>

      <div className="detail-canvas-section">
        <div className="canvas-label">波形图</div>
        <div className="canvas-wrapper">
          <WaveformCanvas bpm={song.bpm} />
        </div>
      </div>

      <div className="detail-info-grid">
        <div className="detail-info-item">
          <div className="detail-info-label">BPM</div>
          <div className="detail-info-value" style={{ color: '#00bcd4' }}>
            {song.bpm}
          </div>
        </div>
        <div className="detail-info-item">
          <div className="detail-info-label">时长</div>
          <div className="detail-info-value">{formatDuration(song.duration)}</div>
        </div>
        <div className="detail-info-item">
          <div className="detail-info-label">匹配度</div>
          <div
            className="detail-info-value"
            style={{ color: song.matchScore > 0.7 ? '#e040fb' : '#888' }}
          >
            {Math.round(song.matchScore * 100)}%
          </div>
        </div>
      </div>

      <style>{`
        .song-detail {
          position: absolute;
          inset: 0;
          background: #121212;
          z-index: 10;
          overflow-y: auto;
          padding: 24px;
        }
        .detail-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .back-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e0e0e0;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        .back-btn:hover {
          background: rgba(255,255,255,0.12);
        }
        .detail-title-section {
          flex: 1;
        }
        .detail-song-title {
          color: #e0e0e0;
          font-size: 22px;
          font-weight: 700;
          margin: 0;
        }
        .detail-song-artist {
          color: #888;
          font-size: 14px;
          margin: 4px 0 0;
        }
        .detail-canvas-section {
          margin-bottom: 20px;
        }
        .canvas-label {
          color: #777;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .canvas-wrapper {
          background: #0a0a0a;
          border-radius: 12px;
          padding: 12px;
          border: 1px solid #2a2a2a;
        }
        .detail-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 16px;
        }
        .detail-info-item {
          background: #1e1e1e;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .detail-info-label {
          color: #666;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .detail-info-value {
          color: #e0e0e0;
          font-size: 20px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }
        @media (max-width: 768px) {
          .song-detail {
            padding: 16px;
          }
          .detail-song-title {
            font-size: 18px;
          }
          .detail-info-grid {
            gap: 8px;
          }
          .detail-info-item {
            padding: 12px;
          }
          .detail-info-value {
            font-size: 16px;
          }
        }
      `}</style>
    </motion.div>
  );
}
