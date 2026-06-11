import React, { useRef, useEffect, useState, useCallback } from 'react';

type MusicStyle = 'dreamy' | 'tense' | 'healing' | 'epic';

interface GenerateResult {
  id: string;
  polarity: number;
  keywords: string[];
  particleCount: number;
  particleColors: string[];
  primaryColor: string;
  music: {
    style: MusicStyle;
    chords: number[][];
    bpm: number;
    baseVolume: number;
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  baseX: number;
  baseY: number;
  phase: number;
  frequency: number;
  amplitude: number;
}

interface KeywordText {
  text: string;
  x: number;
  y: number;
  color: string;
  bouncePhase: number;
  fadeInStart: number;
  lastBounce: number;
  vertical: boolean;
  fontSize: number;
}

interface MusicVisualizerProps {
  text: string;
  style: MusicStyle;
  result: GenerateResult;
}

const MusicVisualizer: React.FC<MusicVisualizerProps> = ({ text, style, result }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const keywordsRef = useRef<KeywordText[]>([]);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicStartedRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const cssSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const count = result.particleCount;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 3 + Math.random() * 7,
        color: result.particleColors[i % result.particleColors.length],
        alpha: 0.3 + Math.random() * 0.6,
        baseX: x,
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        frequency: 0.5 + Math.random() * 1.5,
        amplitude: 2 + Math.abs(result.polarity) * 6,
      });
    }

    particlesRef.current = particles;
  }, [result.particleCount, result.particleColors, result.polarity]);

  const initKeywords = useCallback((width: number, height: number) => {
    const keywords: KeywordText[] = [];
    const positions = [
      { x: 0.5, y: 0.5 },
      { x: 0.25, y: 0.3 },
      { x: 0.75, y: 0.3 },
      { x: 0.2, y: 0.7 },
      { x: 0.8, y: 0.7 },
    ];

    result.keywords.slice(0, 5).forEach((word, i) => {
      const pos = positions[i] || { x: Math.random(), y: Math.random() };
      keywords.push({
        text: word,
        x: pos.x * width,
        y: pos.y * height,
        color: result.primaryColor,
        bouncePhase: Math.random() * Math.PI * 2,
        fadeInStart: i * 300,
        lastBounce: 0,
        vertical: Math.random() > 0.5,
        fontSize: 28,
      });
    });

    keywordsRef.current = keywords;
  }, [result.keywords, result.primaryColor]);

  const startMusic = useCallback(() => {
    if (musicStartedRef.current) return;
    musicStartedRef.current = true;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const { chords, bpm, baseVolume } = result.music;
      const beatDuration = 60 / bpm;
      const noteDuration = beatDuration * 2;

      const masterGain = audioCtx.createGain();
      masterGain.gain.value = baseVolume;
      masterGain.connect(audioCtx.destination);

      const waveforms: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];

      const scheduleNote = (startTime: number, chordIndex: number) => {
        const chord = chords[chordIndex % chords.length];
        chord.forEach((freq, noteIndex) => {
          const osc = audioCtx.createOscillator();
          osc.type = waveforms[noteIndex % waveforms.length];
          osc.frequency.value = freq;

          const gain = audioCtx.createGain();
          const attack = 0.05;
          const release = 0.1;
          const sustain = noteDuration - attack - release;

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.3, startTime + attack);
          gain.gain.setValueAtTime(0.3, startTime + attack + Math.max(0, sustain));
          gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + noteDuration + release);
        });
      };

      const totalLoops = 30;
      const loopDuration = noteDuration * 8;

      for (let loop = 0; loop < totalLoops; loop++) {
        for (let bar = 0; bar < 8; bar++) {
          const startTime = audioCtx.currentTime + loop * loopDuration + bar * noteDuration;
          scheduleNote(startTime, bar % 4);
        }
      }
    } catch (e) {
      console.warn('Web Audio API不可用:', e);
    }
  }, [result.music]);

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = cssSizeRef.current;
    const elapsed = Date.now() - startTimeRef.current;
    const elapsedSec = elapsed / 1000;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.15)';
    ctx.fillRect(0, 0, width, height);

    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.phase += 0.01 * p.frequency;
      const sineOffsetX = Math.sin(p.phase) * p.amplitude;
      const sineOffsetY = Math.cos(p.phase * 0.7) * p.amplitude * 0.5;

      p.x += p.vx + sineOffsetX * 0.02;
      p.y += p.vy + sineOffsetY * 0.02;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const pulseAlpha = p.alpha * (0.7 + Math.sin(elapsedSec * 2 + i * 0.1) * 0.3);

      ctx.beginPath();
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, hexToRgba(p.color, pulseAlpha));
      gradient.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = hexToRgba(p.color, pulseAlpha);
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const keywords = keywordsRef.current;
    const beatInterval = 60000 / result.music.bpm;

    keywords.forEach((kw, idx) => {
      if (elapsed < kw.fadeInStart) return;

      const fadeProgress = Math.min(1, (elapsed - kw.fadeInStart) / 1000);
      let alpha = fadeProgress;

      const currentBeat = Math.floor(elapsed / beatInterval);
      if (currentBeat > kw.lastBounce) {
        kw.lastBounce = currentBeat;
        kw.bouncePhase = 0;
      }

      kw.bouncePhase += 0.15;
      const bounceProgress = Math.min(1, kw.bouncePhase / Math.PI);
      const bounceHeight = (8 + Math.random() * 7) * Math.sin(bounceProgress * Math.PI);
      const scaleFactor = 1 + 0.3 * Math.sin(bounceProgress * Math.PI);

      const offsetX = kw.vertical ? 0 : bounceHeight;
      const offsetY = kw.vertical ? -bounceHeight : 0;
      const currentFontSize = 20 + (36 - 20) * scaleFactor * 0.5 + idx * 2;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${currentFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = kw.color;
      ctx.shadowBlur = 12;

      ctx.fillStyle = kw.color;
      ctx.fillText(kw.text, kw.x + offsetX, kw.y + offsetY);

      ctx.restore();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [result.music.bpm]);

  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    try {
      const stream = canvas.captureStream(30);

      if (audioContextRef.current) {
        const dest = audioContextRef.current.createMediaStreamDestination();
        audioContextRef.current.destination.disconnect();
        audioContextRef.current.resume();
      }

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yuyin_zhimeng_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordingProgress(0);
      };

      recorder.start(100);
      setIsRecording(true);
      startMusic();

      const duration = 30000;
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        setRecordingProgress(progress);
        if (elapsed >= duration) {
          clearInterval(progressInterval);
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }
      }, 100);
    } catch (e) {
      console.error('录制失败:', e);
      setIsRecording(false);
    }
  }, [isRecording, startMusic]);

  const handlePlay = useCallback(() => {
    if (!isPlaying) {
      startTimeRef.current = Date.now();
      startMusic();
      setIsPlaying(true);
    }
  }, [isPlaying, startMusic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cssSizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }

      initParticles(rect.width, rect.height);
      initKeywords(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0A0A1A';
      ctx.fillRect(0, 0, cssSizeRef.current.width, cssSizeRef.current.height);
    }

    startTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      musicStartedRef.current = false;
      setIsPlaying(false);
    };
  }, [initParticles, initKeywords, animate, result.id]);

  return (
    <div style={styles.container}>
      <div style={styles.infoBar}>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>情感极性：</span>
          <span style={{
            ...styles.infoValue,
            color: result.polarity > 0.2 ? '#FFD700' : result.polarity < -0.2 ? '#7B2D8E' : '#E0E0E0'
          }}>
            {result.polarity > 0.2 ? '积极' : result.polarity < -0.2 ? '消极' : '中性'}
            ({result.polarity.toFixed(2)})
          </span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>粒子数量：</span>
          <span style={styles.infoValue}>{result.particleCount}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>音乐BPM：</span>
          <span style={styles.infoValue}>{result.music.bpm}</span>
        </div>
      </div>

      <div ref={containerRef} style={styles.canvasContainer}>
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      <div style={styles.keywordsBar}>
        <span style={styles.keywordsLabel}>关键词：</span>
        {result.keywords.map((kw, i) => (
          <span
            key={i}
            style={{
              ...styles.keywordTag,
              backgroundColor: `${result.primaryColor}20`,
              borderColor: result.primaryColor,
              color: result.primaryColor,
            }}
          >
            {kw}
          </span>
        ))}
      </div>

      <div style={styles.actionButtons}>
        {!isPlaying && !isRecording && (
          <button style={styles.playButton} onClick={handlePlay}>
            ▶ 播放预览
          </button>
        )}
        <button
          style={{
            ...styles.recordButton,
            ...(isRecording ? styles.recordButtonActive : {}),
          }}
          onClick={startRecording}
          disabled={isRecording}
        >
          {isRecording ? `录制中 ${Math.floor(recordingProgress)}%` : '● 生成并下载视频'}
        </button>
      </div>

      {isRecording && (
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${recordingProgress}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '20px',
  },
  infoBar: {
    display: 'flex',
    gap: '32px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: '12px 24px',
    backgroundColor: 'rgba(30, 30, 50, 0.5)',
    borderRadius: '10px',
    border: '1px solid #333',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  infoLabel: {
    color: '#888',
    fontSize: '13px',
  },
  infoValue: {
    color: '#E0E0E0',
    fontSize: '13px',
    fontWeight: 600,
  },
  canvasContainer: {
    width: 'calc(100% - 60px)',
    minHeight: '500px',
    height: '60vh',
    maxHeight: '700px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    border: '1px solid #333',
    backgroundColor: '#0A0A1A',
    padding: 0,
    position: 'relative',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  keywordsBar: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keywordsLabel: {
    color: '#888',
    fontSize: '13px',
    marginRight: '4px',
  },
  keywordTag: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: 600,
  },
  actionButtons: {
    display: 'flex',
    gap: '16px',
    marginTop: '24px',
  },
  playButton: {
    padding: '14px 36px',
    borderRadius: '30px',
    border: '2px solid #7B68EE',
    backgroundColor: 'rgba(123, 104, 238, 0.1)',
    color: '#7B68EE',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '2px',
  },
  recordButton: {
    padding: '14px 36px',
    borderRadius: '30px',
    border: 'none',
    background: 'linear-gradient(135deg, #FF4500 0%, #FF6B6B 100%)',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255, 69, 0, 0.4)',
    transition: 'all 0.3s ease',
    letterSpacing: '2px',
  },
  recordButtonActive: {
    opacity: 0.8,
    cursor: 'not-allowed',
  },
  progressBar: {
    width: '300px',
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    marginTop: '16px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #7B68EE, #FF69B4)',
    borderRadius: '3px',
    transition: 'width 0.1s linear',
  },
};

const mvStyleSheet = document.createElement('style');
mvStyleSheet.textContent = `
  @media (max-width: 768px) {
    .canvas-container-style {
      min-height: 400px !important;
    }
  }
`;
document.head.appendChild(mvStyleSheet);

export default MusicVisualizer;
