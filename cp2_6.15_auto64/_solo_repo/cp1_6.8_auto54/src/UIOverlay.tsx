import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StarData } from './StarField';
import { AudioRecorder, RecordingResult } from './AudioRecorder';
import { AudioAnalyzer, AudioFeatures, ColorGradient } from './AudioAnalyzer';

type Page = 'starfield' | 'mystars' | 'leaderboard';

interface UIOverlayProps {
  hoveredStar: StarData | null;
  selectedStar: StarData | null;
  allStars: StarData[];
  currentUserId: string;
  onRecord: (blob: Blob, features: AudioFeatures) => void;
  onMerge: (fromId: string, toId: string) => void;
  onCloseCard: () => void;
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
};

const buttonBase: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
  color: '#e0e0e0',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  fontFamily: 'inherit',
};

function WaveformVis({ waveform, gradient }: { waveform: number[]; gradient: ColorGradient }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barWidth = w / waveform.length;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, gradient.start);
    grad.addColorStop(1, gradient.end);

    ctx.fillStyle = grad;
    for (let i = 0; i < waveform.length; i++) {
      const barH = waveform[i] * h * 0.8;
      const x = i * barWidth;
      ctx.beginPath();
      ctx.roundRect(x + 1, (h - barH) / 2, Math.max(barWidth - 2, 1), barH, 2);
      ctx.fill();
    }
  }, [waveform, gradient]);

  return <canvas ref={canvasRef} width={280} height={60} style={{ width: '100%', height: 60 }} />;
}

function StarCard({ star, onMerge, onClose }: { star: StarData; onMerge: () => void; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    const audio = new Audio(star.audioUrl);
    audioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => setPlaying(false);
    setPlaying(true);
  }, [playing, star.audioUrl]);

  return (
    <div
      style={{
        ...glassStyle,
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 340,
        padding: 28,
        zIndex: 100,
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${star.gradient.start}, ${star.gradient.end})`,
              boxShadow: `0 0 10px ${star.gradient.start}`,
            }}
          />
          <span style={{ fontSize: 13, opacity: 0.7 }}>{star.gradient.label}</span>
        </div>
        <button
          onClick={onClose}
          style={{ ...buttonBase, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, padding: 0, lineHeight: '28px' }}
        >
          ✕
        </button>
      </div>

      <WaveformVis waveform={star.waveform} gradient={star.gradient} />

      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 13, opacity: 0.7 }}>
        <span>时长 {(star.duration / 1000).toFixed(1)}s</span>
        <span>播放 {star.playCount}次</span>
        <span>融合 {star.mergeCount}次</span>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          onClick={handlePlay}
          style={{
            ...buttonBase,
            flex: 1,
            padding: '10px 0',
            fontSize: 14,
            background: playing
              ? `linear-gradient(135deg, ${star.gradient.start}, ${star.gradient.end})`
              : 'rgba(255,255,255,0.08)',
          }}
          onMouseEnter={(e) => {
            if (!playing) e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            if (!playing) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
        >
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          onClick={onMerge}
          style={{
            ...buttonBase,
            flex: 1,
            padding: '10px 0',
            fontSize: 14,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${star.gradient.start}, ${star.gradient.end})`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
        >
          🌌 回应
        </button>
      </div>
    </div>
  );
}

function RecordButton({ onRecord }: { onRecord: (blob: Blob, features: AudioFeatures) => void }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number>(0);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      analyzerRef.current?.destroy();
    };
  }, []);

  const handleStart = async () => {
    const recorder = new AudioRecorder();
    recorderRef.current = recorder;
    analyzerRef.current ??= new AudioAnalyzer();

    await recorder.start(10000);
    setRecording(true);
    setElapsed(0);
    const startTime = Date.now();

    timerRef.current = window.setInterval(() => {
      const ms = Date.now() - startTime;
      setElapsed(ms);
      if (ms >= 10000) {
        clearInterval(timerRef.current);
      }
    }, 100);
  };

  const handleStop = async () => {
    if (!recorderRef.current || !analyzerRef.current) return;
    clearInterval(timerRef.current);
    const result: RecordingResult = await recorderRef.current.stop();
    setRecording(false);
    setElapsed(0);

    const features = await analyzerRef.current.analyze(result.blob);
    onRecord(result.blob, features);
  };

  const progress = Math.min(elapsed / 10000, 1);

  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
      {recording && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>
            {(elapsed / 1000).toFixed(1)}s / 10s
          </div>
          <div style={{ width: 160, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff6b6b, #ffa500)',
                borderRadius: 2,
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>
      )}
      <button
        onClick={recording ? handleStop : handleStart}
        style={{
          ...buttonBase,
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          padding: 0,
          background: recording
            ? 'radial-gradient(circle, rgba(255,80,80,0.3), rgba(255,80,80,0.1))'
            : 'radial-gradient(circle, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
          border: recording ? '2px solid rgba(255,80,80,0.6)' : '2px solid rgba(255,255,255,0.2)',
          animation: recording ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!recording) e.currentTarget.style.background = 'radial-gradient(circle, rgba(255,255,255,0.2), rgba(255,255,255,0.08))';
        }}
        onMouseLeave={(e) => {
          if (!recording) e.currentTarget.style.background = 'radial-gradient(circle, rgba(255,255,255,0.12), rgba(255,255,255,0.04))';
        }}
      >
        {recording ? '⏹' : '🎙'}
      </button>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,80,80,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(255,80,80,0); }
        }
      `}</style>
    </div>
  );
}

function NavBar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items: { key: Page; label: string; icon: string }[] = [
    { key: 'starfield', label: '星空', icon: '🌌' },
    { key: 'mystars', label: '我的星球', icon: '🪐' },
    { key: 'leaderboard', label: '星之声', icon: '🏆' },
  ];

  return (
    <div
      style={{
        ...glassStyle,
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: '6px 8px',
        zIndex: 50,
        borderRadius: 20,
      }}
    >
      {items.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => setPage(key)}
          style={{
            ...buttonBase,
            padding: '8px 18px',
            fontSize: 13,
            background: page === key ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            borderRadius: 14,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (page !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            if (page !== key) e.currentTarget.style.background = 'transparent';
          }}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );
}

function MyStarsPage({ stars, currentUserId }: { stars: StarData[]; currentUserId: string }) {
  const myStars = stars.filter((s) => s.ownerId === currentUserId);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 40, overflow: 'auto', padding: '40px 20px 120px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 300, marginBottom: 30, letterSpacing: 2 }}>
        我的星球
      </h2>
      {myStars.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: 60 }}>还没有创建星球，点击麦克风开始录音吧</div>
      ) : (
        <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myStars.map((star) => (
            <div key={star.id} style={{ ...glassStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${star.gradient.start}, ${star.gradient.end})`,
                  boxShadow: `0 0 15px ${star.gradient.start}40`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, marginBottom: 4 }}>{star.gradient.label}</div>
                <div style={{ fontSize: 12, opacity: 0.5 }}>
                  {(star.duration / 1000).toFixed(1)}s · 播放{star.playCount}次
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'right' }}>
                {star.mergeCount > 0 ? (
                  <span style={{ color: star.gradient.start }}>已融合 ×{star.mergeCount}</span>
                ) : (
                  <span>未被融合</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardPage({ stars }: { stars: StarData[] }) {
  const sorted = [...stars].sort((a, b) => b.mergeCount - a.mergeCount).slice(0, 20);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 40, overflow: 'auto', padding: '40px 20px 120px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 300, marginBottom: 30, letterSpacing: 2 }}>
        星之声
      </h2>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: 60 }}>还没有星球被融合，快去留言吧</div>
      ) : (
        <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((star, i) => (
            <div key={star.id} style={{ ...glassStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: i < 3 ? 20 : 14,
                  fontWeight: i < 3 ? 700 : 400,
                  opacity: i < 3 ? 1 : 0.5,
                  flexShrink: 0,
                }}
              >
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${star.gradient.start}, ${star.gradient.end})`,
                  boxShadow: `0 0 12px ${star.gradient.start}40`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{star.gradient.label}</div>
                <div style={{ fontSize: 12, opacity: 0.5 }}>{(star.duration / 1000).toFixed(1)}s</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: star.gradient.start }}>
                {star.mergeCount}
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6, marginLeft: 4 }}>次融合</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UIOverlay({
  hoveredStar,
  selectedStar,
  allStars,
  currentUserId,
  onRecord,
  onMerge,
  onCloseCard,
}: UIOverlayProps) {
  const [page, setPage] = useState<Page>('starfield');

  return (
    <>
      {page === 'starfield' && <RecordButton onRecord={onRecord} />}

      {hoveredStar && page === 'starfield' && !selectedStar && (
        <div
          style={{
            ...glassStyle,
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${hoveredStar.gradient.start}, ${hoveredStar.gradient.end})`,
            }}
          />
          {hoveredStar.gradient.label} · {(hoveredStar.duration / 1000).toFixed(1)}s
        </div>
      )}

      {selectedStar && page === 'starfield' && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 90,
            }}
            onClick={onCloseCard}
          />
          <StarCard
            star={selectedStar}
            onMerge={() => onMerge(currentUserId, selectedStar.id)}
            onClose={onCloseCard}
          />
        </>
      )}

      {page === 'mystars' && <MyStarsPage stars={allStars} currentUserId={currentUserId} />}
      {page === 'leaderboard' && <LeaderboardPage stars={allStars} />}

      <NavBar page={page} setPage={setPage} />
    </>
  );
}
