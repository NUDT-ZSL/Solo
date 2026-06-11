import React, { useEffect, useRef, useCallback } from 'react';
import { AudioAnalyzer } from '../utils/audioAnalyzer';
import type { AudioFeature, ParticlePreset } from '../types';
import { PRESET_CONFIGS, BG_COLORS } from '../types';

interface ParticleCanvasProps {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  particleCanvasRef: React.MutableRefObject<any>;
  isPlaying: boolean;
  volume: number;
  preset: ParticlePreset;
  hasAudio: boolean;
  onFeatureUpdate?: (feature: AudioFeature) => void;
  snapshotOverlay: string | null;
  snapshotOpacity: number;
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
  targetColor: string;

  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.targetColor = color;
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 3000;
  }

  update(deltaTime: number, feature: AudioFeature | null, preset: ParticlePreset): boolean {
    this.life += deltaTime;
    
    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio < 0.1) {
      this.alpha = lifeRatio / 0.1;
    } else if (lifeRatio > 0.7) {
      this.alpha = (1 - lifeRatio) / 0.3;
    } else {
      this.alpha = 1;
    }
    
    if (feature) {
      const config = PRESET_CONFIGS[preset];
      const speedMultiplier = 1 + feature.energy * 2;
      
      if (feature.dominant === 'low') {
        this.vy += 0.05 * feature.lowFreq;
      } else if (feature.dominant === 'high') {
        const angle = Math.atan2(this.vy, this.vx);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const newSpeed = speed * (1 + feature.highFreq * 0.1);
        this.vx = Math.cos(angle) * newSpeed;
        this.vy = Math.sin(angle) * newSpeed;
      } else if (feature.dominant === 'mid') {
        const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
        const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
        const dx = centerX - this.x;
        const dy = centerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          this.vx += (dx / dist) * 0.02 * feature.midFreq;
          this.vy += (dy / dist) * 0.02 * feature.midFreq;
        }
      }
      
      const baseSpeed = config.baseSpeed;
      const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const maxSpeed = baseSpeed * speedMultiplier * 3;
      if (currentSpeed > maxSpeed) {
        this.vx = (this.vx / currentSpeed) * maxSpeed;
        this.vy = (this.vy / currentSpeed) * maxSpeed;
      }
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    this.vx *= 0.99;
    this.vy *= 0.99;
    
    return this.life < this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.radius * 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  particles: Particle[];
  maxParticles: number;
  canvasWidth: number;
  canvasHeight: number;
  lastSpawnTime: number;
  spawnInterval: number;

  constructor(width: number, height: number) {
    this.particles = [];
    this.maxParticles = 200;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.lastSpawnTime = 0;
    this.spawnInterval = 50;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  spawnParticles(feature: AudioFeature | null, preset: ParticlePreset, count: number): void {
    const config = PRESET_CONFIGS[preset];
    
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let vx: number, vy: number;
      
      const speed = config.baseSpeed * (0.5 + Math.random() * 1);
      const angle = Math.random() * Math.PI * 2;
      
      switch (config.spawnType) {
        case 'center':
          x = this.canvasWidth / 2;
          y = this.canvasHeight / 2;
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
          break;
        case 'bottom':
          x = Math.random() * this.canvasWidth;
          y = this.canvasHeight - 10;
          vx = (Math.random() - 0.5) * speed * 0.5;
          vy = -speed * (0.5 + Math.random() * 0.5);
          break;
        case 'random':
        default:
          x = Math.random() * this.canvasWidth;
          y = Math.random() * this.canvasHeight;
          vx = Math.cos(angle) * speed * 0.5;
          vy = Math.sin(angle) * speed * 0.5;
          break;
      }
      
      let color: string;
      if (feature) {
        const colors = config.colorTendency;
        const total = feature.lowFreq + feature.midFreq + feature.highFreq;
        if (total === 0) {
          color = colors.mid;
        } else {
          const rand = Math.random() * total;
          if (rand < feature.lowFreq) {
            color = colors.low;
          } else if (rand < feature.lowFreq + feature.midFreq) {
            color = colors.mid;
          } else {
            color = colors.high;
          }
        }
      } else {
        color = `rgba(255, 255, 255, 0.6)`;
      }
      
      const baseRadius = 2;
      const sizeMultiplier = config.sizeMultiplier;
      const energyMultiplier = feature ? 1 + feature.energy * 3 : 1;
      const radius = baseRadius * sizeMultiplier * energyMultiplier * (0.8 + Math.random() * 0.4);
      
      if (this.particles.length < this.maxParticles) {
        this.particles.push(new Particle(x, y, vx, vy, radius, color));
      }
    }
  }

  update(deltaTime: number, feature: AudioFeature | null, preset: ParticlePreset): void {
    if (feature) {
      this.maxParticles = Math.floor(200 + feature.bpm * 4);
      this.spawnInterval = Math.max(10, 100 - feature.energy * 80);
    } else {
      this.maxParticles = 20;
      this.spawnInterval = 400;
    }
    
    this.particles = this.particles.filter(p => p.update(deltaTime, feature, preset));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  canvasRef,
  particleCanvasRef,
  isPlaying,
  volume,
  preset,
  hasAudio,
  onFeatureUpdate,
  snapshotOverlay,
  snapshotOpacity,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const currentBgColorRef = useRef<{ r: number; g: number; b: number }>({ r: 10, g: 10, b: 15 });
  const targetBgColorRef = useRef<{ r: number; g: number; b: number }>({ r: 10, g: 10, b: 15 });
  const bgTransitionStartRef = useRef<number>(0);
  const featuresRef = useRef<AudioFeature[]>([]);
  const overlayImageRef = useRef<HTMLImageElement | null>(null);
  const defaultParticleTimerRef = useRef<number>(0);

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const updateBackgroundColor = useCallback((dominant: 'low' | 'mid' | 'high') => {
    let targetColor: string;
    switch (dominant) {
      case 'low':
        targetColor = BG_COLORS.low;
        break;
      case 'high':
        targetColor = BG_COLORS.high;
        break;
      default:
        targetColor = BG_COLORS.mid;
    }
    
    const targetRgb = hexToRgb(targetColor);
    if (
      targetRgb.r !== targetBgColorRef.current.r ||
      targetRgb.g !== targetBgColorRef.current.g ||
      targetRgb.b !== targetBgColorRef.current.b
    ) {
      currentBgColorRef.current = { ...targetBgColorRef.current };
      targetBgColorRef.current = targetRgb;
      bgTransitionStartRef.current = performance.now();
    }
  }, []);

  const lerpColor = (
    current: { r: number; g: number; b: number },
    target: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } => {
    const clampedT = Math.min(t, 1);
    return {
      r: Math.floor(current.r + (target.r - current.r) * clampedT),
      g: Math.floor(current.g + (target.g - current.g) * clampedT),
      b: Math.floor(current.b + (target.b - current.b) * clampedT),
    };
  };

  const getDominantFromHistory = useCallback((): 'low' | 'mid' | 'high' => {
    const features = featuresRef.current;
    if (features.length === 0) return 'mid';
    
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    
    for (const f of features) {
      lowSum += f.lowFreq;
      midSum += f.midFreq;
      highSum += f.highFreq;
    }
    
    const max = Math.max(lowSum, midSum, highSum);
    if (max === lowSum) return 'low';
    if (max === highSum) return 'high';
    return 'mid';
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      
      if (particleSystemRef.current) {
        particleSystemRef.current.resize(rect.width, rect.height);
      } else {
        particleSystemRef.current = new ParticleSystem(rect.width, rect.height);
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasRef]);

  useEffect(() => {
    if (!snapshotOverlay) {
      overlayImageRef.current = null;
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      overlayImageRef.current = img;
    };
    img.src = snapshotOverlay;
    
    return () => {
      overlayImageRef.current = null;
    };
  }, [snapshotOverlay]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!particleSystemRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const audioAnalyzer = new AudioAnalyzer();
    audioAnalyzerRef.current = audioAnalyzer;
    
    particleCanvasRef.current = {
      getAnalyzer: () => audioAnalyzerRef.current,
      setAudioAnalyzer: (analyzer: AudioAnalyzer) => {
        audioAnalyzerRef.current = analyzer;
      },
    };
    
    const animate = (time: number) => {
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      let currentFeature: AudioFeature | null = null;
      
      if (hasAudio && isPlaying && audioAnalyzerRef.current) {
        currentFeature = audioAnalyzerRef.current.getCurrentFeature();
        
        if (onFeatureUpdate) {
          onFeatureUpdate(currentFeature);
        }
        
        featuresRef.current.push(currentFeature);
        if (featuresRef.current.length > 10) {
          featuresRef.current.shift();
        }
        
        const dominant = getDominantFromHistory();
        updateBackgroundColor(dominant);
        
        if (particleSystemRef.current && time - lastSpawnRef.current > particleSystemRef.current.spawnInterval) {
          const spawnCount = Math.floor(1 + currentFeature.energy * 5);
          particleSystemRef.current.spawnParticles(currentFeature, preset, spawnCount);
          lastSpawnRef.current = time;
        }
      } else {
        defaultParticleTimerRef.current += deltaTime;
        if (defaultParticleTimerRef.current > 400 && particleSystemRef.current) {
          particleSystemRef.current.spawnParticles(null, preset, 5);
          defaultParticleTimerRef.current = 0;
        }
      }
      
      const bgT = Math.min((time - bgTransitionStartRef.current) / 500, 1);
      const bgColor = lerpColor(currentBgColorRef.current, targetBgColorRef.current, bgT);
      
      ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
      ctx.fillRect(0, 0, width, height);
      
      if (particleSystemRef.current) {
        particleSystemRef.current.update(deltaTime, currentFeature, preset);
        particleSystemRef.current.draw(ctx);
      }
      
      if (overlayImageRef.current && snapshotOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = snapshotOpacity / 100;
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
      audioAnalyzer.close();
    };
  }, [
    canvasRef,
    particleCanvasRef,
    isPlaying,
    hasAudio,
    preset,
    onFeatureUpdate,
    snapshotOpacity,
    getDominantFromHistory,
    updateBackgroundColor,
  ]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} className="particle-canvas" />
    </div>
  );
};

export default ParticleCanvas;
