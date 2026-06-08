import { useRef, useEffect, useState, useCallback } from 'react';
import { SCENT_CONFIG, type ScentType } from './types';

interface AudioPlayerProps {
  audioUrl: string | null;
  scentType: ScentType;
}

export default function AudioPlayer({ audioUrl, scentType }: AudioPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const config = SCENT_CONFIG[scentType];

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const color = config.color;
    const audio = audioRef.current;
    const t = performance.now() / 1000;

    const barCount = 64;
    const barWidth = w / barCount - 1;
    const midY = h / 2;

    for (let i = 0; i < barCount; i++) {
      let amplitude: number;
      if (playing && audio) {
        const freq = (i + 1) * 0.15;
        const phase = t * 3 + i * 0.3;
        amplitude = (
          Math.sin(phase) * 0.3 +
          Math.sin(phase * 1.5) * 0.2 +
          Math.sin(phase * 0.7 + freq) * 0.15 +
          Math.cos(phase * 2.1 + i) * 0.1
        ) * (h * 0.35);
        amplitude = Math.abs(amplitude);
        amplitude = Math.max(2, amplitude);
      } else {
        amplitude = 2 + Math.sin(t * 0.5 + i * 0.2) * 2;
      }

      const x = i * (barWidth + 1);
      const grad = ctx.createLinearGradient(x, midY - amplitude, x, midY + amplitude);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, color + 'cc');
      grad.addColorStop(1, color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, midY - amplitude, barWidth, amplitude * 2, 2);
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(drawWaveform);
  }, [playing, config.color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 320 * dpr;
    canvas.height = 80 * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    drawWaveform();
    return () => cancelAnimationFrame(animRef.current);
  }, [drawWaveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '12px 0' }}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      <canvas
        ref={canvasRef}
        style={{ width: 320, height: 80, display: 'block', borderRadius: 8 }}
      />

      <div
        onClick={handleProgressClick}
        style={{
          width: 320,
          height: 6,
          background: 'rgba(0,0,0,0.08)',
          borderRadius: 3,
          marginTop: 8,
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: config.color,
            borderRadius: 3,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, width: 320 }}>
        <button
          onClick={togglePlay}
          disabled={!audioUrl}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: audioUrl ? config.color : '#ccc',
            color: '#fff',
            fontSize: 16,
            cursor: audioUrl ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s, background 0.2s',
          }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <span style={{ fontSize: 12, color: '#888' }}>
          {audioUrl ? formatTime(audioRef.current?.currentTime ?? 0) : '无音频'} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
