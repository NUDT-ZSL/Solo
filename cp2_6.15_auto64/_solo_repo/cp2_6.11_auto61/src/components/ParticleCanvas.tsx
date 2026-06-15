import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { AudioAnalyzer } from '../utils/audioAnalyzer';
import type { AudioFeature, ParticlePreset, SavedParticleState, CanvasSnapshotState } from '../types';
import { PRESET_CONFIGS, BG_COLORS } from '../types';

interface ParticleCanvasProps {
  isPlaying: boolean;
  volume: number;
  preset: ParticlePreset;
  hasAudio: boolean;
  onFeatureUpdate?: (feature: AudioFeature) => void;
  snapshotOverlay: string | null;
  snapshotOpacity: number;
  audioAnalyzerRef?: React.MutableRefObject<AudioAnalyzer | null>;
  onAnalyzerCreated?: (analyzer: AudioAnalyzer) => void;
}

export interface ParticleCanvasHandle {
  captureState: () => CanvasSnapshotState;
  restoreState: (state: CanvasSnapshotState) => void;
  getAnalyzer: () => AudioAnalyzer | null;
  setAnalyzer: (analyzer: AudioAnalyzer) => void;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 3000;
  }

  save(): SavedParticleState {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      radius: this.radius,
      color: this.color,
      alpha: this.alpha,
      life: this.life,
      maxLife: this.maxLife,
    };
  }

  restore(state: SavedParticleState): void {
    this.x = state.x;
    this.y = state.y;
    this.vx = state.vx;
    this.vy = state.vy;
    this.radius = state.radius;
    this.color = state.color;
    this.alpha = state.alpha;
    this.life = state.life;
    this.maxLife = state.maxLife;
  }
}

class ParticlePool {
  private pool: Particle[] = [];
  private activeCount: number = 0;
  private maxSize: number;

  constructor(initialSize: number, maxSize: number) {
    this.maxSize = maxSize;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(new Particle(0, 0, 0, 0, 0, '#ffffff'));
    }
  }

  acquire(): Particle | null {
    if (this.activeCount >= this.maxSize) return null;
    
    if (this.activeCount >= this.pool.length) {
      this.pool.push(new Particle(0, 0, 0, 0, 0, '#ffffff'));
    }
    
    const p = this.pool[this.activeCount++];
    p.alpha = 1;
    p.life = 0;
    return p;
  }

  release(index: number): void {
    if (index >= this.activeCount) return;
    this.activeCount--;
    if (index < this.activeCount) {
      const temp = this.pool[index];
      this.pool[index] = this.pool[this.activeCount];
      this.pool[this.activeCount] = temp;
    }
  }

  getActive(): Particle[] {
    return this.pool.slice(0, this.activeCount);
  }

  get count(): number {
    return this.activeCount;
  }

  getMaxSize(): number {
    return this.maxSize;
  }

  setMaxSize(size: number): void {
    this.maxSize = size;
  }
}

const ParticleCanvas = forwardRef<ParticleCanvasHandle, ParticleCanvasProps>((props, ref) => {
  const {
    isPlaying,
    volume,
    preset,
    hasAudio,
    onFeatureUpdate,
    snapshotOverlay,
    snapshotOpacity,
    audioAnalyzerRef,
    onAnalyzerCreated,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  
  const particlePoolRef = useRef<ParticlePool>(new ParticlePool(200, 1500));
  const audioAnalyzerInternalRef = useRef<AudioAnalyzer | null>(null);
  
  const presetRef = useRef<ParticlePreset>(preset);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const hasAudioRef = useRef<boolean>(hasAudio);
  const volumeRef = useRef<number>(volume);
  
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const defaultTimerRef = useRef<number>(0);
  
  const bgColorRef = useRef<{ r: number; g: number; b: number }>({ r: 10, g: 10, b: 15 });
  const targetBgColorRef = useRef<{ r: number; g: number; b: number }>({ r: 10, g: 10, b: 15 });
  const bgTransitionStartRef = useRef<number>(0);
  
  const featureHistoryRef = useRef<AudioFeature[]>([]);
  
  const overlayImageRef = useRef<HTMLImageElement | null>(null);
  const snapshotStateRef = useRef<CanvasSnapshotState | null>(null);
  const snapshotOpacityRef = useRef<number>(snapshotOpacity);
  const compositeOperationRef = useRef<GlobalCompositeOperation>('source-over');
  
  const onFeatureUpdateRef = useRef(onFeatureUpdate);

  useEffect(() => { presetRef.current = preset; }, [preset]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { hasAudioRef.current = hasAudio; }, [hasAudio]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { onFeatureUpdateRef.current = onFeatureUpdate; }, [onFeatureUpdate]);
  useEffect(() => { snapshotOpacityRef.current = snapshotOpacity; }, [snapshotOpacity]);

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  };

  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

  const lerpColor = (
    current: { r: number; g: number; b: number },
    target: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } => ({
    r: Math.floor(lerp(current.r, target.r, t)),
    g: Math.floor(lerp(current.g, target.g, t)),
    b: Math.floor(lerp(current.b, target.b, t)),
  });

  const updateBackgroundColor = (dominant: 'low' | 'mid' | 'high') => {
    let targetHex: string;
    switch (dominant) {
      case 'low': targetHex = BG_COLORS.low; break;
      case 'high': targetHex = BG_COLORS.high; break;
      default: targetHex = BG_COLORS.mid;
    }
    const target = hexToRgb(targetHex);
    const cur = targetBgColorRef.current;
    if (cur.r !== target.r || cur.g !== target.g || cur.b !== target.b) {
      bgColorRef.current = { ...targetBgColorRef.current };
      targetBgColorRef.current = target;
      bgTransitionStartRef.current = performance.now();
    }
  };

  const getDominantFromHistory = (): 'low' | 'mid' | 'high' => {
    const hist = featureHistoryRef.current;
    if (hist.length === 0) return 'mid';
    let l = 0, m = 0, h = 0;
    for (const f of hist) { l += f.lowFreq; m += f.midFreq; h += f.highFreq; }
    const max = Math.max(l, m, h);
    if (max === l) return 'low';
    if (max === h) return 'high';
    return 'mid';
  };

  useImperativeHandle(ref, (): ParticleCanvasHandle => ({
    captureState: () => {
      const pool = particlePoolRef.current;
      const particles: SavedParticleState[] = [];
      for (let i = 0; i < pool.count; i++) {
        particles.push(pool.getActive()[i].save());
      }
      return {
        particles,
        backgroundColor: { ...bgColorRef.current },
        overlayOpacity: snapshotOpacityRef.current,
        globalCompositeOperation: compositeOperationRef.current,
        preset: presetRef.current,
        timestamp: performance.now(),
      };
    },
    restoreState: (state: CanvasSnapshotState) => {
      snapshotStateRef.current = state;
      bgColorRef.current = { ...state.backgroundColor };
      targetBgColorRef.current = { ...state.backgroundColor };
      snapshotOpacityRef.current = state.overlayOpacity ?? 30;
      compositeOperationRef.current = state.globalCompositeOperation ?? 'source-over';
      if (state.preset) {
        presetRef.current = state.preset;
      }
      
      const pool = particlePoolRef.current;
      while (pool.count > 0) pool.release(0);
      
      for (const saved of state.particles) {
        const p = pool.acquire();
        if (p) p.restore(saved);
      }
    },
    getAnalyzer: () => audioAnalyzerInternalRef.current,
    setAnalyzer: (analyzer: AudioAnalyzer) => {
      audioAnalyzerInternalRef.current = analyzer;
      if (audioAnalyzerRef) {
        audioAnalyzerRef.current = analyzer;
      }
    },
  }));

  useEffect(() => {
    if (!audioAnalyzerInternalRef.current) {
      audioAnalyzerInternalRef.current = new AudioAnalyzer();
      if (onAnalyzerCreated) {
        onAnalyzerCreated(audioAnalyzerInternalRef.current);
      }
      if (audioAnalyzerRef) {
        audioAnalyzerRef.current = audioAnalyzerInternalRef.current;
      }
    }
  }, [audioAnalyzerRef, onAnalyzerCreated]);

  useEffect(() => {
    const analyzerFromProp = audioAnalyzerRef?.current;
    if (analyzerFromProp && audioAnalyzerInternalRef.current !== analyzerFromProp) {
      audioAnalyzerInternalRef.current = analyzerFromProp;
    }
  }, [audioAnalyzerRef]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const canvas = canvasRef.current;
        if (!canvas) continue;
        const rect = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!snapshotOverlay) {
      overlayImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { overlayImageRef.current = img; };
    img.src = snapshotOverlay;
    return () => { overlayImageRef.current = null; };
  }, [snapshotOverlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const spawnParticle = (
      width: number,
      height: number,
      feature: AudioFeature | null,
      presetKey: ParticlePreset
    ) => {
      const config = PRESET_CONFIGS[presetKey];
      const pool = particlePoolRef.current;
      const p = pool.acquire();
      if (!p) return;

      const speed = config.baseSpeed * (0.5 + Math.random() * 1);
      const angle = Math.random() * Math.PI * 2;

      switch (config.spawnType) {
        case 'center': {
          if (presetKey === 'volcano') {
            p.x = width / 2 + (Math.random() - 0.5) * width * 0.15;
            p.y = height - 10;
            const volcanoAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
            const volcanoSpeed = speed * (2 + Math.random() * 2.5);
            p.vx = Math.cos(volcanoAngle) * volcanoSpeed;
            p.vy = Math.sin(volcanoAngle) * volcanoSpeed;
          } else {
            p.x = width / 2;
            p.y = height / 2;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
          }
          break;
        }
        case 'bottom': {
          if (presetKey === 'deepSea') {
            p.x = Math.random() * width;
            p.y = height - Math.random() * height * 0.3;
            const seaAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5;
            const seaSpeed = speed * (0.6 + Math.random() * 0.8);
            p.vx = Math.cos(seaAngle) * seaSpeed;
            p.vy = Math.sin(seaAngle) * seaSpeed;
          } else {
            p.x = Math.random() * width;
            p.y = height - 5;
            p.vx = (Math.random() - 0.5) * speed * 0.5;
            p.vy = -speed * (0.5 + Math.random() * 0.5);
          }
          break;
        }
        case 'random':
        default: {
          if (presetKey === 'nebula') {
            const centerX = width / 2;
            const centerY = height / 2;
            const maxRadius = Math.min(width, height) * 0.45;
            const radius = maxRadius * Math.pow(Math.random(), 0.5);
            const randAngle = Math.random() * Math.PI * 2;
            p.x = centerX + Math.cos(randAngle) * radius;
            p.y = centerY + Math.sin(randAngle) * radius;
            const tangent = randAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.8;
            const orbitSpeed = speed * (0.4 + Math.random() * 0.6);
            p.vx = Math.cos(tangent) * orbitSpeed;
            p.vy = Math.sin(tangent) * orbitSpeed;
          } else {
            p.x = Math.random() * width;
            p.y = Math.random() * height;
            p.vx = Math.cos(angle) * speed * 0.5;
            p.vy = Math.sin(angle) * speed * 0.5;
          }
          break;
        }
      }

      const colors = config.colorTendency;
      let color: string;
      if (feature) {
        const total = feature.lowFreq + feature.midFreq + feature.highFreq;
        if (total === 0) {
          color = colors.mid;
        } else {
          const rand = Math.random() * total;
          if (rand < feature.lowFreq) color = colors.low;
          else if (rand < feature.lowFreq + feature.midFreq) color = colors.mid;
          else color = colors.high;
        }
        if (feature.isOnset) {
          color = colors.high;
        }
      } else {
        const alpha = 0.3 + Math.random() * 0.4;
        color = `rgba(255, 255, 255, ${alpha})`;
      }
      p.color = color;

      const baseRadius = 2;
      const sizeMultiplier = config.sizeMultiplier;
      const energyMult = feature ? 1 + feature.energy * 3 + (feature.beatIntensity * 1.5) : 1;
      p.radius = baseRadius * sizeMultiplier * energyMult * (0.8 + Math.random() * 0.4);

      p.alpha = 0;
      p.life = 0;
      p.maxLife = 3000 + Math.random() * 1000;
    };

    const updateParticle = (
      p: Particle,
      dt: number,
      width: number,
      height: number,
      feature: AudioFeature | null,
      presetKey: ParticlePreset
    ): boolean => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;

      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio < 0.08) {
        p.alpha = lifeRatio / 0.08;
      } else if (lifeRatio > 0.75) {
        p.alpha = (1 - lifeRatio) / 0.25;
      } else {
        p.alpha = 1;
      }

      const config = PRESET_CONFIGS[presetKey];

      if (feature) {
        const speedMult = 1 + feature.energy * 2 + feature.beatIntensity;

        if (presetKey === 'nebula') {
          const centerX = width / 2;
          const centerY = height / 2;
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const orbitStrength = 0.02 * (1 + feature.midFreq);
          p.vx += (-dy / dist) * orbitStrength * speedMult;
          p.vy += (dx / dist) * orbitStrength * speedMult;
          const pullStrength = 0.005 * feature.lowFreq;
          p.vx -= (dx / dist) * pullStrength;
          p.vy -= (dy / dist) * pullStrength;
          if (feature.highFreq > 0.3) {
            const pushStrength = 0.01 * feature.highFreq;
            p.vx += (dx / dist) * pushStrength;
            p.vy += (dy / dist) * pushStrength;
          }
        } else if (presetKey === 'volcano') {
          p.vy += 0.05 + feature.lowFreq * 0.03;
          if (feature.isOnset) {
            p.vx += (Math.random() - 0.5) * 3;
            p.vy -= 2 + feature.beatIntensity * 3;
          }
          if (feature.dominant === 'high') {
            p.vx += (Math.random() - 0.5) * 0.5;
          }
        } else if (presetKey === 'deepSea') {
          const centerX = width / 2;
          const vortex = config.vortexStrength || 0.3;
          const dx = p.x - centerX;
          const dy = p.y - height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const vortexStr = vortex * (0.5 + feature.midFreq);
          p.vx += (-dy / dist) * vortexStr * 0.05 * speedMult;
          p.vy += (dx / dist) * vortexStr * 0.05 * speedMult;
          const buoyancy = -0.02 - feature.highFreq * 0.04;
          p.vy += buoyancy;
          if (feature.dominant === 'low') {
            p.vy += 0.03 * feature.lowFreq;
          }
        } else {
          switch (feature.dominant) {
            case 'low':
              p.vy += 0.05 * feature.lowFreq;
              break;
            case 'high': {
              const curSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) + 0.001;
              const accel = feature.highFreq * 0.3;
              p.vx = (p.vx / curSpeed) * (curSpeed + accel);
              p.vy = (p.vy / curSpeed) * (curSpeed + accel);
              break;
            }
            case 'mid': {
              const cx = width / 2;
              const cy = height / 2;
              const ddx = cx - p.x;
              const ddy = cy - p.y;
              const d = Math.sqrt(ddx * ddx + ddy * ddy) + 0.001;
              p.vx += (ddx / d) * 0.02 * feature.midFreq;
              p.vy += (ddy / d) * 0.02 * feature.midFreq;
              break;
            }
          }
        }

        if (feature.isOnset) {
          p.vx += (Math.random() - 0.5) * feature.beatIntensity * 4;
          p.vy += (Math.random() - 0.5) * feature.beatIntensity * 4;
        }

        const maxSpeed = config.baseSpeed * speedMult * 4;
        const curSpd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (curSpd > maxSpeed) {
          p.vx = (p.vx / curSpd) * maxSpeed;
          p.vy = (p.vy / curSpd) * maxSpeed;
        }
      }

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vx *= 0.995;
      p.vy *= 0.995;

      if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
        return false;
      }

      return true;
    };

    const drawParticle = (c: CanvasRenderingContext2D, p: Particle) => {
      if (p.alpha <= 0) return;
      c.save();
      c.globalAlpha = p.alpha;
      c.fillStyle = p.color;
      c.shadowColor = p.color;
      c.shadowBlur = p.radius * 2;
      c.beginPath();
      c.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const animate = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      if (dt <= 0 || dt > 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const width = rect.width;
      const height = rect.height;

      const currentPreset = presetRef.current;
      const pool = particlePoolRef.current;
      const config = PRESET_CONFIGS[currentPreset];

      let feature: AudioFeature | null = null;
      if (hasAudioRef.current && isPlayingRef.current && audioAnalyzerInternalRef.current) {
        try {
          feature = audioAnalyzerInternalRef.current.getCurrentFeature();
          
          const vol = volumeRef.current / 100;
          feature.energy *= vol;
          feature.lowFreq *= vol;
          feature.midFreq *= vol;
          feature.highFreq *= vol;
          feature.beatIntensity *= vol;

          featureHistoryRef.current.push(feature);
          if (featureHistoryRef.current.length > 10) featureHistoryRef.current.shift();

          const dominant = getDominantFromHistory();
          updateBackgroundColor(dominant);

          if (onFeatureUpdateRef.current) {
            try { onFeatureUpdateRef.current(feature); } catch (_) {}
          }

          const maxParticles = Math.min(1500, Math.floor(200 + feature.bpm * 4 + feature.beatIntensity * 300));
          pool.setMaxSize(maxParticles);

          const baseInterval = Math.max(8, 80 - feature.energy * 60 - feature.beatIntensity * 30);
          if (time - lastSpawnRef.current > baseInterval) {
            const spawnCount = Math.floor(1 + feature.energy * 8 + feature.beatIntensity * 5);
            for (let i = 0; i < spawnCount; i++) {
              spawnParticle(width, height, feature, currentPreset);
            }
            if (feature.isOnset) {
              const burstCount = Math.floor(10 + feature.beatIntensity * 30);
              for (let i = 0; i < burstCount; i++) {
                spawnParticle(width, height, feature, currentPreset);
              }
            }
            lastSpawnRef.current = time;
          }
        } catch (err) {
          console.warn('Feature extraction error:', err);
        }
      } else {
        pool.setMaxSize(100);
        defaultTimerRef.current += dt;
        if (defaultTimerRef.current > 400) {
          for (let i = 0; i < 5; i++) {
            spawnParticle(width, height, null, currentPreset);
          }
          defaultTimerRef.current = 0;
        }
      }

      const bgT = Math.min((time - bgTransitionStartRef.current) / 500, 1);
      const bgColor = lerpColor(bgColorRef.current, targetBgColorRef.current, bgT);
      bgColorRef.current = bgColor;

      ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
      ctx.fillRect(0, 0, width, height);

      const active = pool.getActive();
      const count = pool.count;
      for (let i = count - 1; i >= 0; i--) {
        const p = active[i];
        const alive = updateParticle(p, dt, width, height, feature, currentPreset);
        if (!alive) {
          pool.release(i);
        } else {
          drawParticle(ctx, p);
        }
      }

      if (overlayImageRef.current && snapshotOpacityRef.current > 0) {
        ctx.save();
        ctx.globalAlpha = snapshotOpacityRef.current / 100;
        ctx.globalCompositeOperation = compositeOperationRef.current;
        ctx.drawImage(overlayImageRef.current, 0, 0, width, height);
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    lastSpawnRef.current = performance.now();
    bgTransitionStartRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} className="particle-canvas" />
    </div>
  );
});

ParticleCanvas.displayName = 'ParticleCanvas';
export default ParticleCanvas;
