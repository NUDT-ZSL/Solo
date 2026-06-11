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
    audioDataUrl?: string;
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
  lastBounceBeat: number;
  vertical: boolean;
  fontSize: number;
  baseFontSize: number;
}

interface MusicVisualizerProps {
  text: string;
  style: MusicStyle;
  result: GenerateResult;
}

const MIN_PARTICLES = 150;
const MAX_PARTICLES = 500;
const DEFAULT_PARTICLES = 300;
const FPS_SAMPLE_INTERVAL = 500;
const LOW_FPS_THRESHOLD = 30;
const HIGH_FPS_THRESHOLD = 50;

const MusicVisualizer: React.FC<MusicVisualizerProps> = ({ result }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const keywordsRef = useRef<KeywordText[]>([]);
  const startTimeRef = useRef<number>(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const cssSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const activeParticleCountRef = useRef<number>(DEFAULT_PARTICLES);

  const frameCountRef = useRef<number>(0);
  const lastFpsCheckRef = useRef<number>(0);
  const currentFpsRef = useRef<number>(60);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [currentFps, setCurrentFps] = useState(60);
  const [activeParticles, setActiveParticles] = useState(DEFAULT_PARTICLES);

  const createParticle = useCallback((width: number, height: number, colorIndex: number): Particle => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 3 + Math.random() * 7,
      color: result.particleColors[colorIndex % result.particleColors.length],
      alpha: 0.3 + Math.random() * 0.6,
      baseX: x,
      baseY: y,
      phase: Math.random() * Math.PI * 2,
      frequency: 0.5 + Math.random() * 1.5,
      amplitude: 2 + Math.abs(result.polarity) * 6,
    };
  }, [result.particleColors, result.polarity]);

  const initParticles = useCallback((width: number, height: number, count: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(width, height, i));
    }
    particlesRef.current = particles;
    activeParticleCountRef.current = count;
    setActiveParticles(count);
  }, [createParticle]);

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
      const baseFontSize = 24 + i * 2;
      keywords.push({
        text: word,
        x: pos.x * width,
        y: pos.y * height,
        color: result.primaryColor,
        bouncePhase: Math.random() * Math.PI * 2,
        fadeInStart: i * 300,
        lastBounceBeat: -1,
        vertical: Math.random() > 0.5,
        fontSize: baseFontSize,
        baseFontSize,
      });
    });

    keywordsRef.current = keywords;
  }, [result.keywords, result.primaryColor]);

  const adjustParticleCount = useCallback((width: number, height: number) => {
    const fps = currentFpsRef.current;
    let targetCount = activeParticleCountRef.current;

    if (fps < LOW_FPS_THRESHOLD) {
      targetCount = Math.max(MIN_PARTICLES, Math.floor(activeParticleCountRef.current * 0.7));
    } else if (fps > HIGH_FPS_THRESHOLD) {
      targetCount = Math.min(MAX_PARTICLES, Math.floor(activeParticleCountRef.current * 1.2));
    }

    if (targetCount !== activeParticleCountRef.current) {
      const current = particlesRef.current;
      if (targetCount > current.length) {
        for (let i = current.length; i < targetCount; i++) {
          current.push(createParticle(width, height, i));
        }
      } else {
        current.length = targetCount;
      }
      activeParticleCountRef.current = targetCount;
      setActiveParticles(targetCount);
    }
  }, [createParticle]);

  const playBackendAudio = useCallback(() => {
    if (!result.music.audioDataUrl) {
      console.warn('后端未返回音频数据');
      return;
    }

    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      const audio = new Audio(result.music.audioDataUrl);
      audio.loop = true;
      audio.volume = 0.5;
      audioElementRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn('自动播放被阻止，需要用户交互:', e);
        });
      }
    } catch (e) {
      console.error('播放后端音频失败:', e);
    }
  }, [result.music.audioDataUrl]);

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
    if (width === 0 || height === 0) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const elapsedSec = elapsed / 1000;

    frameCountRef.current++;
    if (now - lastFpsCheckRef.current >= FPS_SAMPLE_INTERVAL) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastFpsCheckRef.current));
      currentFpsRef.current = fps;
      setCurrentFps(fps);
      frameCountRef.current = 0;
      lastFpsCheckRef.current = now;
      adjustParticleCount(width, height);
    }

    ctx.fillStyle = 'rgba(10, 10, 26, 0.15)';
    ctx.fillRect(0, 0, width, height);

    const particles = particlesRef.current;
    const activeCount = activeParticleCountRef.current;
    for (let i = 0; i < activeCount && i < particles.length; i++) {
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
    const beatDurationMs = 60000 / result.music.bpm;
    const currentBeat = Math.floor(elapsed / beatDurationMs);

    keywords.forEach((kw, idx) => {
      if (elapsed < kw.fadeInStart) return;

      const fadeProgress = Math.min(1, (elapsed - kw.fadeInStart) / 1000);
      const alpha = fadeProgress;

      if (currentBeat > kw.lastBounceBeat) {
        kw.lastBounceBeat = currentBeat;
        kw.bouncePhase = 0;
      }

      kw.bouncePhase += 0.12;
      const bounceProgress = Math.min(1, kw.bouncePhase / Math.PI);
      const bounceHeight = (8 + (idx % 3) * 3) * Math.sin(bounceProgress * Math.PI);
      const scaleFactor = 1 + 0.35 * Math.sin(bounceProgress * Math.PI);
      kw.fontSize = kw.baseFontSize + (36 - kw.baseFontSize) * scaleFactor * 0.5;

      const offsetX = kw.vertical ? 0 : bounceHeight;
      const offsetY = kw.vertical ? -bounceHeight : 0;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${kw.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = kw.color;
      ctx.shadowBlur = 12;

      ctx.fillStyle = kw.color;
      ctx.fillText(kw.text, kw.x + offsetX, kw.y + offsetY);

      ctx.restore();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [result.music.bpm, adjustParticleCount]);

  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    try {
      const stream = canvas.captureStream(30);
      recordedChunksRef.current = [];

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        console.log('录制停止，数据块数量:', recordedChunksRef.current.length);
        if (recordedChunksRef.current.length === 0) {
          console.error('没有录制到任何数据');
          setIsRecording(false);
          setRecordingProgress(0);
          return;
        }

        const totalSize = recordedChunksRef.current.reduce((sum, b) => sum + b.size, 0);
        console.log('录制数据总大小:', Math.round(totalSize / 1024), 'KB');

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

      recorder.onerror = (e) => {
        console.error('MediaRecorder错误:', e);
        setIsRecording(false);
      };

      recorder.start(100);
      setIsRecording(true);
      playBackendAudio();

      const duration = 30000;
      const startTimestamp = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTimestamp;
        const progress = Math.min(100, (elapsed / duration) * 100);
        setRecordingProgress(progress);
        if (elapsed >= duration) {
          clearInterval(progressInterval);
          if (recorder.state !== 'inactive') {
            console.log('达到30秒，停止录制');
            recorder.stop();
          }
        }
      }, 100);
    } catch (e) {
      console.error('录制失败:', e);
      setIsRecording(false);
    }
  }, [isRecording, playBackendAudio]);

  const handlePlay = useCallback(() => {
    if (!isPlaying) {
      startTimeRef.current = Date.now();
      lastFpsCheckRef.current = Date.now();
      frameCountRef.current = 0;
      playBackendAudio();
      setIsPlaying(true);
    }
  }, [isPlaying, playBackendAudio]);

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
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }

      initParticles(rect.width, rect.height, activeParticleCountRef.current);
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
    lastFpsCheckRef.current = Date.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [initParticles, initKeywords, animate, result.id]);

  const fpsColor = currentFps >= 50 ? '#98FB98' : currentFps >= 30 ? '#FFD700' : '#FF6B6B';

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
          <span style={styles.infoLabel}>粒子：</span>
          <span style={{ ...styles.infoValue, color: '#7B68EE' }}>{activeParticles}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>音乐BPM：</span>
          <span style={styles.infoValue}>{result.music.bpm}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>FPS：</span>
          <span style={{ ...styles.infoValue, color: fpsColor, fontWeight: 700 }}>{currentFps}</span>
        </div>
        {result.music.audioDataUrl && (
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>音频：</span>
            <span style={{ ...styles.infoValue, color: '#98FB98' }}>后端WAV</span>
          </div>
        )}
      </div>

      <div ref={containerRef} style={styles.canvasContainer}>
        <canvas ref={canvasRef} />
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
    gap: '24px',
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

export default MusicVisualizer;
