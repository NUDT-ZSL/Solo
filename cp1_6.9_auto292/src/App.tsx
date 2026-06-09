import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine, BandData } from './AudioEngine';
import { io, Socket } from 'socket.io-client';

const BAND_COUNT = 32;
const MIN_RADIUS = 5;
const MAX_RADIUS = 45;
const MIN_GAIN = -12;
const MAX_GAIN = 12;
const TICK_COUNT = 12;

interface BandState {
  energy: number;
  targetRadius: number;
  currentRadius: number;
  gain: number;
  variance: number;
  pulseTime: number;
}

interface SyncEvent {
  bandIndex: number;
  radius: number;
  gain: number;
}

function hueForBand(i: number): number {
  return (i / BAND_COUNT) * 270;
}

function energyToRadius(energy: number, gain: number): number {
  const gainBoost = Math.pow(10, gain / 40);
  const base = (energy / 255) * (MAX_RADIUS - MIN_RADIUS) * gainBoost;
  return MIN_RADIUS + Math.min(base, MAX_RADIUS - MIN_RADIUS);
}

function radiusToGain(radius: number, energy: number): number {
  const norm = (radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
  const energyNorm = energy / 255;
  if (energyNorm < 0.01) return 0;
  const ratio = Math.max(0.01, norm / energyNorm);
  const gainDb = 40 * Math.log10(ratio);
  return Math.max(MIN_GAIN, Math.min(MAX_GAIN, gainDb));
}

function gainToBrightness(gain: number): number {
  const t = (gain - MIN_GAIN) / (MAX_GAIN - MIN_GAIN);
  return 30 + t * 70;
}

function varianceToFlickerHz(variance: number): number {
  const maxVar = 8000;
  const t = Math.min(1, variance / maxVar);
  return 0.5 + t * 2.5;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const bandsRef = useRef<BandState[]>([]);
  const animFrameRef = useRef<number>(0);
  const draggingRef = useRef<{ index: number; startY: number; startRadius: number } | null>(null);
  const breathPhaseRef = useRef(0);
  const pulseEffectsRef = useRef<{ index: number; startTime: number }[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 600 });

  useEffect(() => {
    const bands: BandState[] = [];
    for (let i = 0; i < BAND_COUNT; i++) {
      bands.push({
        energy: 0,
        targetRadius: MIN_RADIUS,
        currentRadius: MIN_RADIUS,
        gain: 0,
        variance: 0,
        pulseTime: 0,
      });
    }
    bandsRef.current = bands;
  }, []);

  useEffect(() => {
    audioRef.current = new AudioEngine();
    audioRef.current.setSpectrumCallback((data: BandData[]) => {
      const bands = bandsRef.current;
      for (const d of data) {
        if (bands[d.index]) {
          bands[d.index].energy = d.energy;
          bands[d.index].variance = d.variance;
          if (!draggingRef.current || draggingRef.current.index !== d.index) {
            bands[d.index].targetRadius = energyToRadius(d.energy, bands[d.index].gain);
          }
        }
      }
      setHasData(audioRef.current!.hasRecordedData());
    });

    const params = new URLSearchParams(window.location.search);
    const tokenId = params.get('t');
    if (tokenId) {
      setPreviewMode(true);
      loadToken(tokenId);
    }

    return () => {
      audioRef.current?.stopPlayback();
      audioRef.current?.setSpectrumCallback(null);
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = Math.min(vw * 0.8, vh * 0.75, 700);
      const pixelRatio = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = size * pixelRatio;
        canvas.height = size * pixelRatio;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      }
      setCanvasSize({ w: size, h: size });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getBaseRadius = useCallback(() => {
    const minDim = Math.min(canvasSize.w, canvasSize.h);
    let r: number;
    if (minDim <= 320) {
      r = 120;
    } else if (minDim >= 1920) {
      r = 240;
    } else {
      const t = (minDim - 320) / (1920 - 320);
      r = 120 + t * 120;
    }
    return Math.max(100, r - MAX_RADIUS - 30);
  }, [canvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    const tickIntervals: number[] = new Array(TICK_COUNT).fill(0);
    const tickPhases: number[] = new Array(TICK_COUNT).fill(0);

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      breathPhaseRef.current += dt * (2 * Math.PI / 3);
      const breathScale = 1 + Math.sin(breathPhaseRef.current) * 0.02;

      const cw = canvasSize.w;
      const ch = canvasSize.h;
      const cx = cw / 2;
      const cy = ch / 2;
      const baseR = getBaseRadius();

      for (let i = 0; i < TICK_COUNT; i++) {
        const bandIdx = Math.floor((i / TICK_COUNT) * BAND_COUNT);
        const variance = bandsRef.current[bandIdx]?.variance || 0;
        const hz = varianceToFlickerHz(variance);
        tickIntervals[i] = 1 / hz;
        tickPhases[i] += dt / tickIntervals[i];
        if (tickPhases[i] > 1) tickPhases[i] -= 1;
      }

      ctx.clearRect(0, 0, cw, ch);

      ctx.save();
      ctx.translate(cx, cy);
      const scale = isPlaying || previewMode ? breathScale : 1;
      ctx.scale(scale, scale);

      drawDialTexture(ctx, baseR);
      drawTicks(ctx, baseR, tickPhases);
      drawBands(ctx, baseR, now);

      ctx.restore();

      for (const b of bandsRef.current) {
        b.currentRadius += (b.targetRadius - b.currentRadius) * Math.min(1, dt * 12);
      }

      pulseEffectsRef.current = pulseEffectsRef.current.filter((p) => now - p.startTime < 300);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize, getBaseRadius, isPlaying, previewMode]);

  const drawDialTexture = (ctx: CanvasRenderingContext2D, baseR: number) => {
    for (let ring = 0; ring < 8; ring++) {
      const r = baseR + 50 + ring * 18;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 140, 200, ${0.03 + ring * 0.01})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 5 === 0;
      const r1 = baseR + 50 + (isMajor ? 5 : 10);
      const r2 = baseR + 50 + (isMajor ? 20 : 16);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
      ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
      ctx.strokeStyle = isMajor ? 'rgba(150, 180, 230, 0.4)' : 'rgba(120, 150, 200, 0.15)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
    }
  };

  const drawTicks = (ctx: CanvasRenderingContext2D, baseR: number, phases: number[]) => {
    for (let i = 0; i < TICK_COUNT; i++) {
      const angle = (i / TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
      const r = baseR + 50 + 60;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const bandIdx = Math.floor((i / TICK_COUNT) * BAND_COUNT);
      const hue = hueForBand(bandIdx);
      const flicker = Math.sin(phases[i] * Math.PI * 2) * 0.5 + 0.5;
      const alpha = 0.3 + flicker * 0.7;
      const size = 4 + flicker * 5;

      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      glow.addColorStop(0, `hsla(${hue}, 100%, 65%, ${alpha})`);
      glow.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawBands = (ctx: CanvasRenderingContext2D, baseR: number, now: number) => {
    const bands = bandsRef.current;
    const gapAngle = (2 / BAND_COUNT) * (Math.PI / 180);
    const bandAngle = (Math.PI * 2) / BAND_COUNT - gapAngle;

    for (let i = 0; i < BAND_COUNT; i++) {
      const band = bands[i];
      const startAngle = (i / BAND_COUNT) * Math.PI * 2 - Math.PI / 2 + gapAngle / 2;
      const endAngle = startAngle + bandAngle;
      const hue = hueForBand(i);
      const brightness = gainToBrightness(band.gain);
      const innerR = baseR;
      const outerR = baseR + band.currentRadius;
      const isDragging = draggingRef.current?.index === i;

      const pulse = pulseEffectsRef.current.find((p) => p.index === i);
      let pulseAlpha = 0;
      let pulseExpand = 0;
      if (pulse) {
        const t = (now - pulse.startTime) / 300;
        pulseAlpha = (1 - t) * 0.8;
        pulseExpand = t * 8;
      }

      ctx.beginPath();
      ctx.arc(0, 0, innerR, startAngle, endAngle);
      ctx.arc(0, 0, outerR, endAngle, startAngle, true);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
      grad.addColorStop(0, `hsla(${hue}, 85%, ${brightness - 10}%, 0.85)`);
      grad.addColorStop(1, `hsla(${hue}, 90%, ${brightness}%, 0.95)`);
      ctx.fillStyle = grad;
      ctx.fill();

      if (isDragging) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        if (i > 0) {
          drawConnectingLine(ctx, baseR, i - 1, i);
        }
        if (i < BAND_COUNT - 1) {
          drawConnectingLine(ctx, baseR, i, i + 1);
        }
      }

      if (pulseAlpha > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, innerR, startAngle, endAngle);
        ctx.arc(0, 0, outerR + pulseExpand, endAngle, startAngle, true);
        ctx.closePath();
        ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${pulseAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  };

  const drawConnectingLine = (ctx: CanvasRenderingContext2D, baseR: number, aIdx: number, bIdx: number) => {
    const bands = bandsRef.current;
    const a = bands[aIdx];
    const b = bands[bIdx];
    const midAngleA = ((aIdx + 0.5) / BAND_COUNT) * Math.PI * 2 - Math.PI / 2;
    const midAngleB = ((bIdx + 0.5) / BAND_COUNT) * Math.PI * 2 - Math.PI / 2;
    const rA = baseR + a.currentRadius;
    const rB = baseR + b.currentRadius;
    const x1 = Math.cos(midAngleA) * rA;
    const y1 = Math.sin(midAngleA) * rA;
    const x2 = Math.cos(midAngleB) * rB;
    const y2 = Math.sin(midAngleB) * rB;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const maxDist = 80;
    const alpha = Math.max(0.1, 0.8 * (1 - dist / maxDist));

    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = `rgba(220, 230, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  };

  const hitTestBand = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx = canvasSize.w / 2;
    const cy = canvasSize.h / 2;
    const baseR = getBaseRadius();
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;
    const r = Math.hypot(x, y);
    if (r < baseR - 10 || r > baseR + MAX_RADIUS + 20) return null;
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const idx = Math.floor((angle / (Math.PI * 2)) * BAND_COUNT);
    return idx >= 0 && idx < BAND_COUNT ? idx : null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (previewMode) return;
    const idx = hitTestBand(e.clientX, e.clientY);
    if (idx === null) return;
    draggingRef.current = {
      index: idx,
      startY: e.clientY,
      startRadius: bandsRef.current[idx].currentRadius,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const { index, startY, startRadius } = draggingRef.current;
    const dy = startY - e.clientY;
    let newRadius = startRadius + dy * 0.6;
    newRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, newRadius));
    bandsRef.current[index].targetRadius = newRadius;
    bandsRef.current[index].currentRadius = newRadius;

    const newGain = radiusToGain(newRadius, bandsRef.current[index].energy || 128);
    bandsRef.current[index].gain = newGain;
    audioRef.current?.setBandGain(index, newGain);

    if (socketRef.current && currentToken) {
      socketRef.current.emit('band-update', {
        tokenId: currentToken,
        bandIndex: index,
        radius: newRadius,
        gain: newGain,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleRecordClick = async () => {
    const audio = audioRef.current!;
    if (isRecording) {
      await audio.stopRecording();
      setIsRecording(false);
    } else {
      if (isPlaying) {
        audio.stopPlayback();
        setIsPlaying(false);
      }
      await audio.startRecording();
      setIsRecording(true);
      setTimeout(() => setIsRecording(false), 10000);
    }
  };

  const handlePlayClick = () => {
    const audio = audioRef.current!;
    if (isPlaying) {
      audio.stopPlayback();
      setIsPlaying(false);
    } else if (audio.hasRecordedData()) {
      audio.startPlayback();
      setIsPlaying(true);
    }
  };

  const handleSaveClick = async () => {
    const audio = audioRef.current!;
    if (!audio.hasRecordedData()) return;

    const bandData = bandsRef.current.map((b, i) => ({
      index: i,
      energy: b.energy,
      gain: b.gain,
      radius: b.targetRadius,
    }));

    try {
      const res = await fetch('/api/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bands: bandData }),
      });
      const data = await res.json();
      if (data.id) {
        setCurrentToken(data.id);
        const link = `${window.location.origin}${window.location.pathname}?t=${data.id}`;
        setSavedLink(link);
        connectSocket(data.id);
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const loadToken = async (id: string) => {
    try {
      const res = await fetch(`/api/token/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.bands) {
        const audio = audioRef.current!;
        for (const b of data.bands) {
          if (bandsRef.current[b.index]) {
            bandsRef.current[b.index].energy = b.energy || 0;
            bandsRef.current[b.index].gain = b.gain || 0;
            bandsRef.current[b.index].targetRadius = b.radius || energyToRadius(b.energy || 0, b.gain || 0);
            bandsRef.current[b.index].currentRadius = bandsRef.current[b.index].targetRadius;
          }
        }
        audio.setAllBandData(data.bands);
        setCurrentToken(id);
        setHasData(true);
      }
    } catch (e) {
      console.error('Load failed', e);
    }
  };

  const handlePreviewPlay = () => {
    const audio = audioRef.current!;
    if (isPlaying) {
      audio.stopPlayback();
      setIsPlaying(false);
    } else {
      audio.startPlayback();
      setIsPlaying(true);
    }
  };

  const connectSocket = (tokenId: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const socket: Socket = io({ path: '/ws' });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', tokenId);
    });

    socket.on('room-state', (data: { bands: { index: number; gain: number; radius: number }[] }) => {
      for (const b of data.bands) {
        if (bandsRef.current[b.index]) {
          bandsRef.current[b.index].gain = b.gain;
          bandsRef.current[b.index].targetRadius = b.radius;
        }
      }
      audioRef.current?.setAllBandData(data.bands);
    });

    socket.on('band-sync', (evt: SyncEvent) => {
      const band = bandsRef.current[evt.bandIndex];
      if (!band) return;
      band.gain = evt.gain;
      band.targetRadius = evt.radius;
      band.pulseTime = performance.now();
      pulseEffectsRef.current.push({ index: evt.bandIndex, startTime: performance.now() });
      audioRef.current?.setBandGain(evt.bandIndex, evt.gain);
    });
  };

  const copyLink = () => {
    if (savedLink) {
      navigator.clipboard.writeText(savedLink).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#aabbdd',
          fontSize: 18,
          letterSpacing: 6,
          fontWeight: 300,
          pointerEvents: 'none',
        }}
      >
        声 纹 拓 印
        <div style={{ fontSize: 11, letterSpacing: 3, marginTop: 6, opacity: 0.5 }}>VOICEPRINT IMPRINT</div>
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            cursor: previewMode ? 'default' : 'pointer',
            touchAction: 'none',
          }}
        />
      </div>

      {!previewMode ? (
        <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', gap: 24 }}>
          <button
            onClick={handlePlayClick}
            disabled={!hasData}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: `2px solid ${hasData ? '#6688bb' : '#334455'}`,
              background: hasData ? 'rgba(80, 120, 180, 0.2)' : 'rgba(40, 50, 70, 0.3)',
              color: hasData ? '#aaccee' : '#556677',
              cursor: hasData ? 'pointer' : 'not-allowed',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <RecordButton
            isRecording={isRecording}
            onClick={handleRecordClick}
          />

          <button
            onClick={handleSaveClick}
            disabled={!hasData}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: `2px solid ${hasData ? '#88bb88' : '#334455'}`,
              background: hasData ? 'rgba(80, 160, 100, 0.2)' : 'rgba(40, 50, 70, 0.3)',
              color: hasData ? '#bbddbb' : '#556677',
              cursor: hasData ? 'pointer' : 'not-allowed',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="保存声纹"
          >
            💾
          </button>
        </div>
      ) : (
        <button
          onClick={handlePreviewPlay}
          style={{
            marginTop: 30,
            padding: '14px 40px',
            borderRadius: 30,
            border: '2px solid #8899cc',
            background: 'linear-gradient(135deg, rgba(100, 130, 200, 0.3), rgba(150, 100, 200, 0.3))',
            color: '#ccddef',
            fontSize: 15,
            letterSpacing: 3,
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
        >
          {isPlaying ? '⏸ 暂停回放' : '▶ 回 放 声 纹'}
        </button>
      )}

      {savedLink && (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 18px',
            background: 'rgba(20, 30, 50, 0.9)',
            border: '1px solid #445577',
            borderRadius: 8,
            fontSize: 12,
            color: '#aabbdd',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: '90vw',
          }}
        >
          <span style={{ opacity: 0.7 }}>短链接:</span>
          <code style={{ color: '#ddeeff', wordBreak: 'break-all' }}>{savedLink}</code>
          <button
            onClick={copyLink}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: 'rgba(80, 120, 200, 0.3)',
              border: '1px solid #6688bb',
              color: '#bbccdd',
              borderRadius: 4,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            复制
          </button>
        </div>
      )}

      {!previewMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(130, 150, 190, 0.45)',
            letterSpacing: 2,
            pointerEvents: 'none',
          }}
        >
          录制或拖拽色块编辑 · 保存后可分享协作
        </div>
      )}
    </div>
  );
}

function RecordButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: 'relative', width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isRecording && (
        <>
          <div
            style={{
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid rgba(255, 100, 100, 0.6)',
              animation: 'vp-ripple 1.2s ease-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid rgba(255, 100, 100, 0.6)',
              animation: 'vp-ripple 1.2s ease-out infinite 0.4s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid rgba(255, 100, 100, 0.6)',
              animation: 'vp-ripple 1.2s ease-out infinite 0.8s',
            }}
          />
        </>
      )}

      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          width: 60,
          height: 60,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: isRecording
            ? 'radial-gradient(circle, #ff4466 0%, #cc2244 100%)'
            : hovered
            ? 'conic-gradient(from 0deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #ff6b6b)'
            : '#8899aa',
          color: isRecording ? 'white' : '#0a0a14',
          fontSize: 22,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isRecording ? 'scale(1.2)' : hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.25s, background 0.3s',
          animation: hovered && !isRecording ? 'vp-spin 2s linear infinite' : 'none',
          boxShadow: isRecording
            ? '0 0 30px rgba(255, 68, 102, 0.6)'
            : hovered
            ? '0 0 25px rgba(150, 180, 255, 0.5)'
            : '0 4px 15px rgba(0, 0, 0, 0.4)',
          zIndex: 2,
        }}
      >
        {isRecording ? '■' : '●'}
      </button>

      <style>{`
        @keyframes vp-spin {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }
        @keyframes vp-ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
