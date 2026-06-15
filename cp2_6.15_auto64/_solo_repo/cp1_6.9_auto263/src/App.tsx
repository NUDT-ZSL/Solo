import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { SoundClip, TrackClip, MixWithClips, MixSummary } from './SoundClip';

/* ===================== 工具函数 ===================== */
const CLIP_COLORS = [
  'linear-gradient(135deg, #00ffff 0%, #00aaff 100%)',
  'linear-gradient(135deg, #ff00ff 0%, #aa00ff 100%)',
  'linear-gradient(135deg, #00ffaa 0%, #00aa66 100%)',
  'linear-gradient(135deg, #ffaa00 0%, #ff6600 100%)',
  'linear-gradient(135deg, #aaff00 0%, #66aa00 100%)',
  'linear-gradient(135deg, #ff00aa 0%, #aa0066 100%)',
  'linear-gradient(135deg, #00ddff 0%, #0066dd 100%)',
  'linear-gradient(135deg, #dd00ff 0%, #6600dd 100%)',
  'linear-gradient(135deg, #ffff00 0%, #ffaa00 100%)',
  'linear-gradient(135deg, #ff6666 0%, #cc0033 100%)',
  'linear-gradient(135deg, #66ff99 0%, #00cc66 100%)',
  'linear-gradient(135deg, #9966ff 0%, #6633cc 100%)'
];

const clipColorMap = new Map<string, string>();

function getClipColor(clipId: string, index?: number): string {
  if (!clipColorMap.has(clipId)) {
    const idx = index ?? Math.floor(Math.random() * CLIP_COLORS.length);
    clipColorMap.set(clipId, CLIP_COLORS[idx % CLIP_COLORS.length]);
  }
  return clipColorMap.get(clipId)!;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

/* ===================== 音频引擎类 ===================== */
class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  activeNodes: { stop: () => void }[] = [];
  isPlaying = false;
  startTime = 0;
  pauseOffset = 0;
  analyserData: any = null;

  ensure() {
    if (!this.ctx) {
      const CtxClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      this.ctx = new CtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx!.state === 'suspended') this.ctx!.resume();
  }

  scheduleClip(
    clip: SoundClip,
    playStart: number,
    duration: number,
    offset: number,
    volume: number = 1
  ) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = clip.waveType;
    osc.frequency.value = clip.frequency;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    if (clip.vibrato.rate > 0 && clip.vibrato.depth > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = clip.vibrato.rate;
      lfoGain.gain.value = clip.vibrato.depth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now + playStart);
      lfo.stop(now + playStart + duration + 0.1);
    }

    const clipDuration = clip.duration;
    const env = clip.envelope;
    const startTimeAbs = now + playStart;
    const endTimeAbs = startTimeAbs + duration;

    const scale = clipDuration / duration;
    const a = env.attack / scale;
    const d = env.decay / scale;
    const r = env.release / scale;
    const s = env.sustain;

    const offsetInClip = offset % clipDuration;
    const phaseOffset = (offsetInClip / clipDuration) * (a + d);
    let initPhase = offsetInClip;

    if (initPhase < a) {
      const t = initPhase / a;
      gain.gain.setValueAtTime(t * s * volume, startTimeAbs);
    } else if (initPhase < a + d) {
      const t = (initPhase - a) / d;
      gain.gain.setValueAtTime((s + (1 - s) * (1 - t)) * volume, startTimeAbs);
    } else {
      gain.gain.setValueAtTime(s * volume, startTimeAbs);
    }

    gain.gain.linearRampToValueAtTime(volume, startTimeAbs + Math.max(0.001, a * 0.5));
    gain.gain.linearRampToValueAtTime(s * volume, startTimeAbs + Math.max(0.001, a + d));
    gain.gain.setValueAtTime(s * volume, endTimeAbs);
    gain.gain.linearRampToValueAtTime(0, endTimeAbs + Math.max(0.001, r));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTimeAbs);
    osc.stop(endTimeAbs + Math.max(0.001, r) + 0.05);

    return { stop: () => { try { osc.stop(); } catch {} } };
  }

  playMix(
    clips: { clip: SoundClip; trackPosition: number; durationScale: number }[],
    onProgress: (time: number) => void,
    onAmplitude: (amp: number) => void,
    onEnd: () => void
  ): { stop: () => void } {
    this.ensure();
    if (!this.ctx || !this.analyser || !this.analyserData) return { stop: () => {} };

    const total = clips.reduce(
      (m, c) => Math.max(m, c.trackPosition + c.clip.duration / c.durationScale), 0
    );

    const scheduled: { stop: () => void }[] = [];
    clips.forEach(c => {
      const dur = c.clip.duration / c.durationScale;
      const node = this.scheduleClip!(c.clip, c.trackPosition, dur, 0, 0.85);
      if (node) scheduled.push(node);
    });

    this.isPlaying = true;
    this.startTime = this.ctx.currentTime - this.pauseOffset;

    let rafId = 0;
    const tick = () => {
      if (!this.ctx || !this.isPlaying) return;
      const elapsed = this.ctx.currentTime - this.startTime;
      this.analyser!.getByteTimeDomainData(this.analyserData! as any);
      let sum = 0;
      for (let i = 0; i < this.analyserData!.length; i++) {
        const v = (this.analyserData![i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.analyserData!.length);
      onAmplitude(rms);
      onProgress(elapsed);
      if (elapsed >= total + 0.5) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        onEnd();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return {
      stop: () => {
        cancelAnimationFrame(rafId);
        this.isPlaying = false;
        this.pauseOffset = 0;
        scheduled.forEach(n => n.stop());
      }
    };
  }

  previewClip(clip: SoundClip): { stop: () => void } {
    this.ensure();
    const node = this.scheduleClip!(clip, 0.01, clip.duration, 0, 0.7);
    return { stop: () => node?.stop() };
  }

  stopAll() {
    this.activeNodes.forEach(n => n.stop());
    this.activeNodes = [];
  }

  getAmplitude(): number {
    if (!this.analyser || !this.analyserData) return 0;
    this.analyser.getByteTimeDomainData(this.analyserData as any);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      const v = (this.analyserData[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / this.analyserData.length);
  }

  getFrequencyData(): any {
    if (!this.analyser || !this.analyserData) return null;
    this.analyser.getByteFrequencyData(this.analyserData as any);
    return this.analyserData;
  }
}

const audioEngine = new AudioEngine();

/* ===================== 波形缩略图组件 ===================== */
const WaveformThumb: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  animate?: boolean;
}> = ({ data, color = '#00ffff', height = 36, width = 120, animate = false }) => {
  const bars = data.length || 40;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {data.map((val, i) => {
        const barWidth = width / bars - 1;
        const h = Math.max(2, val * height * 0.9);
        return (
          <rect
            key={i}
            x={i * (width / bars) + 0.5}
            y={(height - h) / 2}
            width={Math.max(1, barWidth)}
            height={h}
            rx={1}
            fill={color}
            opacity={0.75 + 0.25 * val}
            className={animate ? 'wf-bar' : ''}
            style={animate ? {
              animation: `pulse 1.2s ease-in-out ${i * 0.03}s infinite`
            } : undefined}
          />
        );
      })}
    </svg>
  );
};

/* ===================== 音频片段卡片 ===================== */
const ClipCard: React.FC<{
  clip: SoundClip;
  index: number;
  playing: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}> = ({ clip, index, playing, onClick, onDragStart }) => {
  const colorInfo = CLIP_COLORS[index % CLIP_COLORS.length];
  const borderColor = playing ? '#00ffff' : 'rgba(255,255,255,0.1)';
  const glowColor = playing ? '0 0 20px #00ffff, 0 0 40px rgba(0,255,255,0.4)' : 'none';
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '14px',
        cursor: 'grab',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: playing ? glowColor : '0 4px 20px rgba(0,0,0,0.3)',
        animation: playing ? 'glow-pulse 1s ease-in-out infinite' : undefined,
        userSelect: 'none'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.filter = 'brightness(1.2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.filter = 'brightness(1)';
      }}
      onDragStartCapture={e => {
        e.currentTarget.style.cursor = 'grabbing';
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{
          fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px',
          background: colorInfo, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          {clip.name}
        </span>
        <span style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace'
        }}>
          {clip.duration.toFixed(1)}s
        </span>
      </div>
      <div style={{
        height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px', overflow: 'hidden',
        background: colorInfo,
        opacity: 0.15
      }}>
        <WaveformThumb
          data={clip.waveformData}
          color={index % 2 === 0 ? '#00ffff' : '#ff00ff'}
          height={32}
          width={160}
          animate={playing}
        />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: '10px',
        fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px'
      }}>
        <span>{clip.waveType.toUpperCase()}</span>
        <span>{clip.frequency}Hz</span>
      </div>
    </div>
  );
};

/* ===================== 轨道片段块 ===================== */
const TrackBlock: React.FC<{
  clip: SoundClip;
  trackClip: TrackClip;
  secondsPerPx: number;
  selected: boolean;
  amplitude: number;
  onMouseDown: (e: React.MouseEvent, mode: 'move' | 'resize-left' | 'resize-right') => void;
  onClick: () => void;
  colorIndex: number;
}> = ({ clip, trackClip, secondsPerPx, selected, amplitude, onMouseDown, onClick, colorIndex }) => {
  const width = (clip.duration / trackClip.durationScale) / secondsPerPx;
  const left = trackClip.trackPosition / secondsPerPx;
  const floatY = -amplitude * 30;
  const gradient = CLIP_COLORS[colorIndex % CLIP_COLORS.length];

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: '12px',
        width: `${Math.max(20, width)}px`,
        height: '76px',
        background: gradient,
        borderRadius: '10px',
        border: selected ? '2px solid #ffffff' : '1.5px solid rgba(255,255,255,0.3)',
        cursor: 'grab',
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 ${10 + amplitude * 40}px rgba(255,255,255,${0.1 + amplitude * 0.3})`,
        transform: `translateY(${floatY}px)`,
        transition: selected ? 'transform 0.05s linear, box-shadow 0.2s ease' : 'transform 0.12s ease-out, box-shadow 0.2s ease',
        overflow: 'hidden',
        filter: `saturate(${1 + amplitude * 0.5}) brightness(${1 + amplitude * 0.2})`,
        zIndex: selected ? 10 : 2
      }}
      onMouseDown={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < 12) onMouseDown(e, 'resize-left');
        else if (x > rect.width - 12) onMouseDown(e, 'resize-right');
        else onMouseDown(e, 'move');
      }}
    >
      <div style={{
        position: 'absolute', top: '6px', left: '10px', right: '10px',
        fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.95)',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'space-between',
        pointerEvents: 'none'
      }}>
        <span>{clip.name}</span>
        <span style={{ fontFamily: 'monospace', opacity: 0.85 }}>
          x{trackClip.durationScale.toFixed(1)}
        </span>
      </div>
      <div style={{
        position: 'absolute', bottom: '6px', left: '6px', right: '6px', height: '34px',
        pointerEvents: 'none', opacity: 0.7,
        display: 'flex', alignItems: 'center'
      }}>
        <WaveformThumb
          data={clip.waveformData}
          color="#ffffff"
          height={28}
          width={Math.max(20, width - 12)}
          animate={false}
        />
      </div>
      <div style={{
        position: 'absolute', left: '0', top: '0', bottom: '0', width: '10px',
        cursor: 'ew-resize',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.4), transparent)',
        borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px'
      }} />
      <div style={{
        position: 'absolute', right: '0', top: '0', bottom: '0', width: '10px',
        cursor: 'ew-resize',
        background: 'linear-gradient(-90deg, rgba(255,255,255,0.4), transparent)',
        borderTopRightRadius: '10px', borderBottomRightRadius: '10px'
      }} />
    </div>
  );
};

/* ===================== 编辑器页面 ===================== */
const EditorPage: React.FC<{
  clips: SoundClip[];
  onNavigate: (route: string) => void;
}> = ({ clips, onNavigate }) => {
  const [trackClips, setTrackClips] = useState<TrackClip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [perClipAmplitude, setPerClipAmplitude] = useState<Record<string, number>>({});
  const [author, setAuthor] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [mixes, setMixes] = useState<MixSummary[]>([]);

  const trackRef = useRef<HTMLDivElement>(null);
  const TRACK_DURATION = 15;
  const trackWidth = 900;
  const secondsPerPx = TRACK_DURATION / trackWidth;

  const dragStateRef = useRef<{
    mode: 'move' | 'resize-left' | 'resize-right' | 'drop-new';
    clipId?: string;
    trackId?: string;
    startX?: number;
    startPos?: number;
    startScale?: number;
  }>({ mode: 'move' });

  const playHandleRef = useRef<{ stop: () => void } | null>(null);

  const totalDuration = useMemo(() => {
    if (trackClips.length === 0) return TRACK_DURATION;
    let maxEnd = 0;
    trackClips.forEach(tc => {
      const c = clips.find(c => c.id === tc.clipId);
      if (c) {
        const end = tc.trackPosition + c.duration / tc.durationScale;
        if (end > maxEnd) maxEnd = end;
      }
    });
    return Math.max(TRACK_DURATION, maxEnd + 2);
  }, [trackClips, clips]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (isPlaying && trackClips.length > 0) {
        const baseAmp = audioEngine.getAmplitude();
        const ampMap: Record<string, number> = {};
        trackClips.forEach(tc => {
          const c = clips.find(c => c.id === tc.clipId);
          if (!c) { ampMap[tc.id] = 0; return; }
          const start = tc.trackPosition;
          const end = start + c.duration / tc.durationScale;
          let localAmp = 0;
          if (currentTime >= start && currentTime <= end) {
            const t = (currentTime - start) / (end - start);
            const env = c.envelope;
            const a = 0.2, d = 0.3, s = env.sustain, r = 0.3;
            if (t < a) localAmp = t / a;
            else if (t < a + d) localAmp = 1 - (1 - s) * ((t - a) / d);
            else if (t < 1 - r) localAmp = s;
            else localAmp = s * (1 - (t - (1 - r)) / r);
            localAmp = Math.max(0, Math.min(1, localAmp));
            localAmp = localAmp * (0.6 + 0.4 * Math.sin(currentTime * 8 + tc.id.charCodeAt(0)));
          }
          ampMap[tc.id] = localAmp;
        });
        setPerClipAmplitude(prev => {
          const next = { ...prev };
          Object.keys(ampMap).forEach(k => {
            next[k] = (prev[k] || 0) * 0.6 + ampMap[k] * 0.4;
          });
          return next;
        });
        setAmplitude(prev => prev * 0.7 + baseAmp * 0.3);
      } else {
        setAmplitude(0);
        setPerClipAmplitude({});
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, currentTime, trackClips, clips]);

  useEffect(() => {
    if (showExplore) loadMixes();
  }, [showExplore]);

  const loadMixes = async () => {
    try {
      const r = await axios.get('/api/mixes');
      if (r.data.success) setMixes(r.data.data);
    } catch {}
  };

  const handleClipClick = useCallback((clip: SoundClip) => {
    setPreviewingId(prev => {
      if (prev === clip.id) return null;
      audioEngine.previewClip(clip);
      setTimeout(() => setPreviewingId(p => p === clip.id ? null : p), clip.duration * 1000);
      return clip.id;
    });
  }, []);

  const handleCardDragStart = (clipId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('clipId', clipId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData('clipId');
    if (!clipId || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pos = Math.max(0, x * secondsPerPx);
    const newTc: TrackClip = {
      id: uuidv4(),
      clipId,
      trackPosition: pos,
      durationScale: 1.0
    };
    setTrackClips(prev => [...prev, newTc]);
    setSelectedId(newTc.id);
  };

  const handleBlockMouseDown = (tc: TrackClip, e: React.MouseEvent, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    setSelectedId(tc.id);
    dragStateRef.current = {
      mode,
      trackId: tc.id,
      startX: e.clientX,
      startPos: tc.trackPosition,
      startScale: tc.durationScale
    };
    const onMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - (dragStateRef.current.startX || 0);
      const dt = dx * secondsPerPx;
      setTrackClips(prev => prev.map(c => {
        if (c.id !== dragStateRef.current.trackId) return c;
        const clip = clips.find(cl => cl.id === c.clipId);
        if (!clip) return c;
        if (dragStateRef.current.mode === 'move') {
          return { ...c, trackPosition: Math.max(0, (dragStateRef.current.startPos || 0) + dt) };
        } else if (dragStateRef.current.mode === 'resize-right') {
          const newDur = Math.max(0.2, clip.duration / (dragStateRef.current.startScale || 1) + dt);
          return { ...c, durationScale: Math.max(0.25, Math.min(4, clip.duration / newDur)) };
        } else {
          const origDur = clip.duration / (dragStateRef.current.startScale || 1);
          const newStart = Math.max(0, (dragStateRef.current.startPos || 0) + dt);
          const newDur = Math.max(0.2, origDur - dt);
          return {
            ...c,
            trackPosition: newStart,
            durationScale: Math.max(0.25, Math.min(4, clip.duration / newDur))
          };
        }
      }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handlePlay = () => {
    if (trackClips.length === 0) return;
    audioEngine.ensure();
    const expanded = trackClips
      .map(tc => {
        const c = clips.find(c => c.id === tc.clipId);
        return c ? { clip: c, trackPosition: tc.trackPosition, durationScale: tc.durationScale } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    playHandleRef.current?.stop();
    setCurrentTime(0);
    playHandleRef.current = audioEngine.playMix(
      expanded,
      (t) => setCurrentTime(t),
      () => {},
      () => {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    );
    setIsPlaying(true);
  };

  const handlePause = () => {
    playHandleRef.current?.stop();
    setIsPlaying(false);
  };

  const handleStop = () => {
    playHandleRef.current?.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleGenerate = async () => {
    if (trackClips.length === 0) {
      alert('请先在时间轴上添加至少一个音频片段');
      return;
    }
    setSaving(true);
    try {
      const r = await axios.post('/api/mixes', {
        clips: trackClips.map(tc => ({
          clipId: tc.clipId,
          trackPosition: tc.trackPosition,
          durationScale: tc.durationScale
        })),
        author: author.trim() || '匿名创作者',
        totalDuration
      });
      if (r.data.success) {
        onNavigate(`/view/${r.data.data.id}`);
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      setTrackClips(prev => prev.filter(c => c.id !== selectedId));
      setSelectedId(null);
    }
  };

  const clearAll = () => {
    setTrackClips([]);
    setSelectedId(null);
    handleStop();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航 */}
      <header style={{
        padding: '18px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,10,26,0.6)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #00ffff, #ff00ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0,255,255,0.3)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M2 12h2l3-8 4 16 3-12 2 8h6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '1px',
              background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              回声拼贴
            </h1>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>ECHO COLLAGE STUDIO</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowExplore(true)} style={{
            padding: '9px 18px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,255,0.3)',
            color: '#00ffff', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.3s ease',
            letterSpacing: '1px'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,255,0.1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,255,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}>
            ✦ 探索拼贴
          </button>
        </div>
      </header>

      {/* 主体布局 */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: '20px',
        padding: '20px 28px',
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* 左侧片段库 */}
        <aside style={{
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '16px',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 140px)',
          overflow: 'hidden'
        }}>
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.85)' }}>
              音频片段库
            </h2>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
              {clips.length} CLIPS
            </span>
          </div>
          <div style={{
            flex: 1, overflowY: 'auto',
            paddingRight: '4px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '12px'
            }}>
              {clips.map((clip, idx) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  index={idx}
                  playing={previewingId === clip.id}
                  onClick={() => handleClipClick(clip)}
                  onDragStart={(e) => handleCardDragStart(clip.id, e)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* 右侧编辑区 */}
        <main style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          minWidth: 0
        }}>
          {/* 播放控制条 */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '18px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isPlaying ? (
                <button onClick={handlePlay} title="播放" style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00ffff, #00aaff)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,255,255,0.4)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  color: '#0a0a1a', fontSize: '16px'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                  ▶
                </button>
              ) : (
                <button onClick={handlePause} title="暂停" style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff00ff, #aa00ff)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(255,0,255,0.4)',
                  transition: 'all 0.3s ease',
                  color: 'white', fontSize: '14px', fontWeight: 'bold'
                }}>
                  ❚❚
                </button>
              )}
              <button onClick={handleStop} title="停止" style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
                color: 'rgba(255,255,255,0.7)', fontSize: '12px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}>
                ■
              </button>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                position: 'relative',
                height: '20px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.min(100, (currentTime / totalDuration) * 100)}%`,
                  background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
                  borderRadius: '10px',
                  boxShadow: '0 0 12px rgba(0,255,255,0.5)',
                  transition: 'width 0.05s linear'
                }} />
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${(i / 14) * 100}%`,
                    top: 0, bottom: 0,
                    width: '1px',
                    background: 'rgba(255,255,255,0.12)'
                  }} />
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: '6px',
                fontSize: '10px', color: 'rgba(255,255,255,0.4)',
                fontFamily: 'monospace', letterSpacing: '1px'
              }}>
                <span>{formatTime(currentTime)}</span>
                <span>总时长: {formatTime(totalDuration)}</span>
              </div>
            </div>

            <div style={{
              width: '120px', height: '40px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <LiveSpectrum amplitude={amplitude} />
            </div>
          </div>

          {/* 时间轴轨道 */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(8px)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '18px 22px',
            overflow: 'auto'
          }}>
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', letterSpacing: '1.5px', fontWeight: 500 }}>
                ◉ 时间轴轨道
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleDeleteSelected} disabled={!selectedId} style={{
                  padding: '6px 14px', fontSize: '11px',
                  borderRadius: '6px', cursor: selectedId ? 'pointer' : 'not-allowed',
                  background: selectedId ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedId ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: selectedId ? '#ff6666' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.2s ease'
                }}>
                  删除选中
                </button>
                <button onClick={clearAll} disabled={trackClips.length === 0} style={{
                  padding: '6px 14px', fontSize: '11px',
                  borderRadius: '6px', cursor: trackClips.length ? 'pointer' : 'not-allowed',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: trackClips.length ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.2s ease'
                }}>
                  清空
                </button>
              </div>
            </div>

            {/* 刻度 */}
            <div style={{
              position: 'relative',
              height: '24px',
              marginBottom: '4px',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              {Array.from({ length: 16 }).map((_, i) => {
                const sec = i;
                const isMajor = i % 5 === 0;
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${(sec / TRACK_DURATION) * 100}%`,
                    bottom: 0,
                    width: '1px',
                    height: isMajor ? '18px' : '8px',
                    background: isMajor ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                  }}>
                    {isMajor && (
                      <span style={{
                        position: 'absolute',
                        bottom: '22px',
                        left: '-12px',
                        fontSize: '10px',
                        color: 'rgba(0,255,255,0.6)',
                        fontFamily: 'monospace',
                        width: '30px',
                        textAlign: 'center'
                      }}>
                        {sec}s
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 轨道区域 */}
            <div
              ref={trackRef}
              onDragOver={handleTrackDragOver}
              onDrop={handleTrackDrop}
              onClick={() => setSelectedId(null)}
              style={{
                position: 'relative',
                width: `${trackWidth}px`,
                height: '100px',
                minWidth: '100%',
                background: `
                  linear-gradient(180deg, rgba(0,255,255,0.03) 0%, rgba(255,0,255,0.03) 100%),
                  repeating-linear-gradient(90deg,
                    transparent 0px,
                    transparent ${trackWidth / 30}px,
                    rgba(255,255,255,0.03) ${trackWidth / 30}px,
                    rgba(255,255,255,0.03) ${trackWidth / 30 + 1}px
                  )
                `,
                borderRadius: '10px',
                border: '1.5px dashed rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
                marginTop: '12px',
                marginBottom: '16px'
              }}
            >
              {/* 播放头 */}
              {isPlaying && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  bottom: '-10px',
                  left: `${Math.min(trackWidth, currentTime / secondsPerPx)}px`,
                  width: '2px',
                  background: 'linear-gradient(180deg, #00ffff, #ff00ff)',
                  boxShadow: '0 0 10px #00ffff, 0 0 20px rgba(0,255,255,0.5)',
                  zIndex: 20,
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    position: 'absolute', top: '-6px', left: '-5px',
                    width: '12px', height: '12px',
                    background: 'linear-gradient(135deg, #00ffff, #ff00ff)',
                    borderRadius: '50%',
                    boxShadow: '0 0 10px rgba(0,255,255,0.6)'
                  }} />
                </div>
              )}

              {/* 轨道块 */}
              {trackClips.map((tc, idx) => {
                const clip = clips.find(c => c.id === tc.clipId);
                if (!clip) return null;
                return (
                  <TrackBlock
                    key={tc.id}
                    clip={clip}
                    trackClip={tc}
                    secondsPerPx={secondsPerPx}
                    selected={selectedId === tc.id}
                    amplitude={perClipAmplitude[tc.id] || 0}
                    onMouseDown={(e, mode) => handleBlockMouseDown(tc, e, mode)}
                    onClick={() => setSelectedId(tc.id)}
                    colorIndex={idx}
                  />
                );
              })}

              {/* 空提示 */}
              {trackClips.length === 0 && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
                  fontSize: '13px', letterSpacing: '2px'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }}>↔</div>
                  拖拽左侧片段至此处开始拼贴
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
                  署名:
                </span>
                <input
                  type="text"
                  placeholder="输入你的昵称"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  style={{
                    width: '180px',
                    padding: '9px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.4)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(0,255,255,0.15)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <span style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                  fontFamily: 'monospace', letterSpacing: '1px'
                }}>
                  {trackClips.length} 个片段
                </span>
              </div>
              <button
                onClick={handleGenerate}
                disabled={saving || trackClips.length === 0}
                style={{
                  padding: '12px 28px',
                  background: trackClips.length === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #00ffff, #ff00ff)',
                  border: 'none',
                  borderRadius: '10px',
                  color: trackClips.length === 0 ? 'rgba(255,255,255,0.3)' : '#0a0a1a',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  cursor: saving || trackClips.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: trackClips.length === 0 ? 'none' : '0 4px 30px rgba(0,255,255,0.4)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={e => { if (trackClips.length > 0) e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; }}
              >
                {saving ? '保存中...' : '✦ 生成可视化与分享'}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 探索拼贴弹窗 */}
      {showExplore && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowExplore(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(135deg, rgba(20,20,50,0.95), rgba(40,20,60,0.95))',
            borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.1)',
            width: '100%', maxWidth: '960px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h2 style={{
                fontSize: '18px', fontWeight: 600,
                background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '2px'
              }}>
                ✦ 探索拼贴 · 他人作品
              </h2>
              <button onClick={() => setShowExplore(false)} style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: '16px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}>
                ✕
              </button>
            </div>
            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              {mixes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>📻</div>
                  <div>暂无作品</div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '16px'
                }}>
                  {mixes.map(mix => (
                    <div
                      key={mix.id}
                      onClick={() => { setShowExplore(false); onNavigate(`/view/${mix.id}`); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                        e.currentTarget.style.borderColor = 'rgba(0,255,255,0.3)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,255,255,0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        height: '64px',
                        background: 'linear-gradient(135deg, rgba(0,255,255,0.08), rgba(255,0,255,0.08))',
                        borderRadius: '10px',
                        marginBottom: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <WaveformThumb
                          data={mix.previewWaveform}
                          color="#00ffff"
                          height={44}
                          width={220}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                          {mix.author}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: 'rgba(255,0,255,0.7)',
                          fontFamily: 'monospace',
                          background: 'rgba(255,0,255,0.1)',
                          padding: '3px 8px',
                          borderRadius: '10px'
                        }}>
                          {mix.clipCount} 片段
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{formatTime(mix.totalDuration)}</span>
                        <span>{new Date(mix.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===================== 实时频谱条 ===================== */
const LiveSpectrum: React.FC<{ amplitude: number }> = ({ amplitude }) => {
  const [bars, setBars] = useState<number[]>(() => Array(16).fill(0.1));

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setBars(prev => {
        const next = new Array(prev.length);
        for (let i = 0; i < prev.length; i++) {
          const target = Math.random() * amplitude * 0.7 + amplitude * 0.3;
          next[i] = prev[i] * 0.7 + target * 0.3;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amplitude]);

  const w = 120, h = 40, n = bars.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {bars.map((v, i) => {
        const bh = Math.max(2, v * h * 0.9);
        const x = (i / n) * w + 2;
        const hue = 200 + (i / n) * 120;
        return (
          <rect
            key={i}
            x={x}
            y={(h - bh) / 2}
            width={Math.max(1, (w / n) - 3)}
            height={bh}
            rx={1}
            fill={`hsl(${hue}, 100%, 60%)`}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
};

/* ===================== 查看/可视化页面 ===================== */
const ViewPage: React.FC<{
  mixId: string;
  onNavigate: (route: string) => void;
}> = ({ mixId, onNavigate }) => {
  const [mix, setMix] = useState<MixWithClips | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [freqData, setFreqData] = useState<number[]>([]);
  const [copyTip, setCopyTip] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const playHandleRef = useRef<{ stop: () => void } | null>(null);
  const t0Ref = useRef(0);

  useEffect(() => {
    loadMix();
    return () => {
      playHandleRef.current?.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [mixId]);

  const loadMix = async () => {
    try {
      setLoading(true);
      const r = await axios.get(`/api/mixes/${mixId}`);
      if (r.data.success) {
        const m = r.data.data;
        setMix(m);
        const bins = 128;
        setFreqData(new Array(bins).fill(0));
      } else {
        setError('作品不存在');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!mix) return;
    audioEngine.ensure();
    const expanded = mix.clips
      .filter(c => c.clip)
      .map(c => ({
        clip: c.clip!,
        trackPosition: c.trackPosition,
        durationScale: c.durationScale
      }));
    if (expanded.length === 0) return;

    playHandleRef.current?.stop();
    t0Ref.current = performance.now();
    setCurrentTime(0);
    playHandleRef.current = audioEngine.playMix(
      expanded,
      (t) => setCurrentTime(t),
      () => {
        const d = audioEngine.getFrequencyData();
        if (d) setFreqData(Array.from(d));
      },
      () => {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    );
    setIsPlaying(true);
  };

  const handleStop = () => {
    playHandleRef.current?.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    setFreqData(prev => prev.map(() => 0));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let phase = 0;
    let trailHistory: number[][] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const W = canvas.width, H = canvas.height;
      phase += 0.008;

      ctx.fillStyle = 'rgba(10, 10, 26, 0.15)';
      ctx.fillRect(0, 0, W, H);

      const bins = freqData.length || 128;
      const dataArr = freqData.length > 0 ? freqData : new Array(bins).fill(0).map((_, i) => {
        return Math.abs(Math.sin(phase * 2 + i * 0.1) * 40 + Math.sin(phase * 0.5 + i * 0.05) * 30);
      });

      if (isPlaying) {
        const realData = audioEngine.getFrequencyData();
        if (realData) {
          for (let i = 0; i < bins; i++) {
            dataArr[i] = dataArr[i] * 0.4 + (realData[i] || 0) * 0.6;
          }
        }
      }

      trailHistory.push([...dataArr]);
      if (trailHistory.length > 12) trailHistory.shift();

      const cx = W / 2, cy = H / 2;
      const layers = 5;
      for (let layer = layers - 1; layer >= 0; layer--) {
        const hist = trailHistory[trailHistory.length - 1 - layer];
        if (!hist) continue;
        const alpha = (1 - layer / layers) * 0.35;
        const radiusBase = Math.min(W, H) * (0.15 + layer * 0.06);
        ctx.beginPath();
        for (let i = 0; i <= bins; i++) {
          const idx = i % bins;
          const angle = (i / bins) * Math.PI * 2 - Math.PI / 2;
          const val = (hist[idx] || 0) / 255;
          const r = radiusBase + val * Math.min(W, H) * 0.18;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const hue = 200 + (layer / layers) * 140 + phase * 20;
        const grad = ctx.createRadialGradient(cx, cy, radiusBase * 0.5, cx, cy, radiusBase * 1.5);
        grad.addColorStop(0, `hsla(${hue}, 100%, 60%, ${alpha})`);
        grad.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 50%, ${alpha * 0.3})`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${alpha + 0.15})`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      const waveCount = 3;
      for (let wv = 0; wv < waveCount; wv++) {
        ctx.beginPath();
        const yBase = H * (0.3 + wv * 0.2);
        for (let x = 0; x <= W; x += 4 * window.devicePixelRatio) {
          const idx = Math.floor((x / W) * bins);
          const val = ((dataArr[idx] || 0) / 255) * (1 - wv * 0.2);
          const waveOffset = Math.sin(x * 0.005 + phase * (1 + wv * 0.3) + wv) * H * 0.02;
          const y = yBase + (val * H * 0.18 + waveOffset) * Math.sin(x * 0.008 + phase + wv * 2);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const hue = 220 + (wv / waveCount) * 140 + (isPlaying ? currentTime * 10 : phase * 30);
        ctx.lineWidth = (3 - wv) * window.devicePixelRatio;
        ctx.strokeStyle = `hsla(${hue % 360}, 100%, 65%, ${0.85 - wv * 0.2})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${hue % 360}, 100%, 60%, 0.9)`;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      for (let i = 0; i < 40; i++) {
        const px = ((Math.sin(phase * 0.7 + i * 1.3) + 1) / 2) * W;
        const py = ((Math.cos(phase * 0.5 + i * 0.9) + 1) / 2) * H;
        const sz = (1 + Math.sin(phase * 3 + i) * 0.5) * 2 * window.devicePixelRatio;
        const hue = (i * 9 + phase * 50) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${0.4 + Math.sin(phase + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      const totalDuration = mix ? mix.totalDuration : 10;
      const progress = Math.min(1, currentTime / totalDuration);
      if (progress > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(0, H - 4 * window.devicePixelRatio, W, 4 * window.devicePixelRatio);
        const pGrad = ctx.createLinearGradient(0, 0, W, 0);
        pGrad.addColorStop(0, '#00ffff');
        pGrad.addColorStop(1, '#ff00ff');
        ctx.fillStyle = pGrad;
        ctx.fillRect(0, H - 4 * window.devicePixelRatio, W * progress, 4 * window.devicePixelRatio);
      }

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [freqData, isPlaying, currentTime, mix]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyTip(true);
      setTimeout(() => setCopyTip(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '48px' }}>🎧</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '3px' }}>正在加载作品...</div>
      </div>
    );
  }

  if (error || !mix) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '48px' }}>😢</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px' }}>{error || '作品不存在'}</div>
        <button onClick={() => onNavigate('/')} style={{
          padding: '10px 24px', background: 'linear-gradient(135deg, #00ffff, #ff00ff)',
          border: 'none', borderRadius: '8px', color: '#0a0a1a',
          cursor: 'pointer', fontWeight: 600, letterSpacing: '1px'
        }}>返回工作室</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,10,26,0.7)',
        backdropFilter: 'blur(10px)',
        position: 'relative', zIndex: 10
      }}>
        <button onClick={() => onNavigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px', borderRadius: '8px',
          color: 'rgba(255,255,255,0.8)', fontSize: '13px',
          cursor: 'pointer', transition: 'all 0.3s ease'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.4)'; e.currentTarget.style.color = '#00ffff'; }}>
          ← 返回工作室
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '16px', fontWeight: 600,
              background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>{mix.author} 的作品</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontFamily: 'monospace' }}>
              {new Date(mix.createdAt).toLocaleString()} · {mix.clips.length} 片段 · {formatTime(mix.totalDuration)}
            </div>
          </div>
          <button onClick={copyLink} style={{
            padding: '8px 16px', borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(0,255,255,0.15), rgba(255,0,255,0.15))',
            border: '1px solid rgba(0,255,255,0.3)',
            color: '#00ffff', fontSize: '12px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.3s ease',
            position: 'relative'
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,255,0.3)'; }}>
            {copyTip ? '✓ 已复制' : '⧉ 复制分享链接'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            minHeight: '500px'
          }}
        />

        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '32px',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          zIndex: 20
        }}>
          <div style={{
            background: 'rgba(10, 10, 30, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '16px 24px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            {!isPlaying ? (
              <button onClick={handlePlay} style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #00ffff, #ff00ff)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: '#0a0a1a',
                boxShadow: '0 4px 30px rgba(0,255,255,0.5)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                ▶
              </button>
            ) : (
              <button onClick={handleStop} style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff00ff, #ff0066)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', color: 'white', fontWeight: 'bold',
                boxShadow: '0 4px 30px rgba(255,0,255,0.5)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                ■
              </button>
            )}
            <div>
              <div style={{
                width: '340px', height: '8px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (currentTime / mix.totalDuration) * 100)}%`,
                  background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
                  boxShadow: '0 0 10px rgba(0,255,255,0.6)',
                  transition: 'width 0.08s linear'
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: '6px',
                fontSize: '11px', fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.5)', letterSpacing: '1px'
              }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(mix.totalDuration)}</span>
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '2px'
          }}>
            ✦ 点击播放按钮，感受视听交织的魔法 ✦
          </div>
        </div>

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          textAlign: 'center',
          opacity: 0.06,
          zIndex: 5
        }}>
          <div style={{
            fontSize: '140px',
            fontWeight: 900,
            letterSpacing: '8px',
            background: 'linear-gradient(90deg, #00ffff, #ff00ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>ECHO</div>
        </div>
      </div>
    </div>
  );
};

/* ===================== 主应用组件 ===================== */
const App: React.FC = () => {
  const [route, setRoute] = useState<string>(window.location.hash.slice(1) || '/');
  const [clips, setClips] = useState<SoundClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(true);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get('/api/clips');
        if (r.data.success) setClips(r.data.data);
      } catch (e) {
        console.warn('加载音频片段失败，稍后重试');
      } finally {
        setClipsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (clips.length > 0 || clipsLoading) return;
    const timer = setInterval(async () => {
      try {
        const r = await axios.get('/api/clips');
        if (r.data.success) {
          setClips(r.data.data);
          clearInterval(timer);
        }
      } catch {}
    }, 800);
    return () => clearInterval(timer);
  }, [clips, clipsLoading]);

  if (clipsLoading || clips.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              width: '8px', height: '30px',
              background: 'linear-gradient(180deg, #00ffff, #ff00ff)',
              borderRadius: '4px',
              animation: `wave 1.2s ease-in-out ${i * 0.12}s infinite`
            }} />
          ))}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '3px' }}>
          初始化音频引擎 · {clips.length}/12
        </div>
      </div>
    );
  }

  let page: React.ReactNode;
  const viewMatch = route.match(/^\/view\/(.+)$/);
  if (viewMatch) {
    page = <ViewPage mixId={decodeURIComponent(viewMatch[1])} onNavigate={navigate} />;
  } else {
    page = <EditorPage clips={clips} onNavigate={navigate} />;
  }

  return (
    <>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 12px; }
          50% { height: 64px; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(0,255,255,0.6), 0 0 30px rgba(0,255,255,0.3); }
          50% { box-shadow: 0 0 25px rgba(0,255,255,0.9), 0 0 50px rgba(0,255,255,0.5); }
        }
        @keyframes pulse {
          0%, 100% { transform: scaleY(1); opacity: 0.7; }
          50% { transform: scaleY(1.3); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,255,0.25); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,255,255,0.45); }
        @media (max-width: 960px) {
          .main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {page}
    </>
  );
};

export default App;