export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number; alpha: number }[];
  targetX: number;
  targetY: number;
}

export type DicePhase = 'idle' | 'rotating' | 'exploding' | 'aggregating' | 'settled';

const TRAIL_DURATION = 0.3;
const PARTICLE_COUNT = 85;
const ROLL_DURATION = 1.8;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
  return { r: 255, g: 123, b: 36 };
}

const DOTS_PATTERNS: { [key: number]: [number, number][] } = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
};

export class Dice {
  x: number;
  y: number;
  size: number;
  color: string;
  phase: DicePhase = 'idle';
  currentValue: number = 1;
  targetValue: number = 1;
  
  rotationX: number = 0;
  rotationY: number = 0;
  rotationZ: number = 0;
  
  particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private rollProgress: number = 0;
  private rollDuration: number = ROLL_DURATION;
  private resolveRoll?: () => void;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private shockwaveRadius: number = 0;
  private shockwaveAlpha: number = 0;
  private baseY: number;
  private floatOffset: number = 0;
  private floatTime: number = 0;
  private currentDeltaTime: number = 0;

  constructor(x: number, y: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.size = size;
    this.color = color;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = size * 2;
    this.offscreenCanvas.height = size * 2;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.initParticlePool();
    this.prerenderDiceFace();
  }

  private initParticlePool(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
        color: this.color, size: 2, life: 0, maxLife: 1,
        trail: [], targetX: 0, targetY: 0,
      });
    }
  }

  setColor(color: string): void {
    this.color = color;
    this.prerenderDiceFace();
    this.particlePool.forEach(p => p.color = color);
    this.particles.forEach(p => p.color = color);
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.baseY = y;
  }

  private prerenderDiceFace(): void {
    const ctx = this.offscreenCtx;
    const s = this.size * 2;
    ctx.clearRect(0, 0, s, s);
    
    const gradient = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    gradient.addColorStop(0, this.lightenColor(this.color, 40));
    gradient.addColorStop(0.7, this.color);
    gradient.addColorStop(1, this.darkenColor(this.color, 30));
    
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25;
    
    ctx.fillStyle = gradient;
    this.roundRect(ctx, 10, 10, s - 20, s - 20, 15);
    ctx.fill();
    
    ctx.strokeStyle = this.lightenColor(this.color, 60);
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    this.roundRect(ctx, 10, 10, s - 20, s - 20, 15);
    ctx.stroke();
    
    ctx.restore();
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  roll(targetValue: number, duration: number = ROLL_DURATION): Promise<void> {
    this.targetValue = targetValue;
    this.rollDuration = duration;
    this.rollProgress = 0;
    this.phase = 'rotating';
    this.shockwaveRadius = 0;
    this.shockwaveAlpha = 0;
    this.explodeParticles();
    return new Promise(resolve => {
      this.resolveRoll = resolve;
    });
  }

  private explodeParticles(): void {
    const dots = DOTS_PATTERNS[this.targetValue] || DOTS_PATTERNS[1];
    const particlePerDot = Math.floor(PARTICLE_COUNT / dots.length);
    
    this.particles = [];
    
    dots.forEach((dot, dotIndex) => {
      const targetX = this.x + (dot[0] - 0.5) * this.size * 0.8;
      const targetY = this.y + (dot[1] - 0.5) * this.size * 0.8;
      
      for (let i = 0; i < particlePerDot; i++) {
        const p = this.particlePool[this.particles.length];
        if (!p) break;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 200;
        
        p.x = this.x;
        p.y = this.y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 100;
        p.ax = 0;
        p.ay = 400;
        p.color = this.color;
        p.size = 2 + Math.random() * 3;
        p.life = 0;
        p.maxLife = this.rollDuration;
        p.trail = [];
        p.targetX = targetX + (Math.random() - 0.5) * 8;
        p.targetY = targetY + (Math.random() - 0.5) * 8;
        
        this.particles.push(p);
      }
    });
    
    const remaining = PARTICLE_COUNT - this.particles.length;
    for (let i = 0; i < remaining; i++) {
      const p = this.particlePool[this.particles.length];
      if (!p) break;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 200;
      const dot = dots[Math.floor(Math.random() * dots.length)];
      
      p.x = this.x;
      p.y = this.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 100;
      p.ax = 0;
      p.ay = 400;
      p.color = this.color;
      p.size = 2 + Math.random() * 3;
      p.life = 0;
      p.maxLife = this.rollDuration;
      p.trail = [];
      p.targetX = this.x + (dot[0] - 0.5) * this.size * 0.8 + (Math.random() - 0.5) * 8;
      p.targetY = this.y + (dot[1] - 0.5) * this.size * 0.8 + (Math.random() - 0.5) * 8;
      
      this.particles.push(p);
    }
  }

  update(deltaTime: number): void {
    this.currentDeltaTime = deltaTime;
    this.floatTime += deltaTime;
    this.floatOffset = Math.sin(this.floatTime * 2) * 3;
    
    if (this.shockwaveAlpha > 0) {
      this.shockwaveRadius += 400 * deltaTime;
      this.shockwaveAlpha -= deltaTime * 1.8;
    }
    
    if (this.phase === 'idle' || this.phase === 'settled') {
      return;
    }

    this.rollProgress += deltaTime;
    const progress = this.rollProgress / this.rollDuration;

    if (progress < 0.3) {
      this.phase = 'rotating';
      this.rotationX += deltaTime * 800;
      this.rotationY += deltaTime * 600;
      this.rotationZ += deltaTime * 400;
    } else if (progress < 0.7) {
      this.phase = 'exploding';
      this.rotationX += deltaTime * 400;
      this.rotationY += deltaTime * 300;
    } else {
      this.phase = 'aggregating';
      this.rotationX *= 0.9;
      this.rotationY *= 0.9;
      this.rotationZ *= 0.9;
    }

    this.updateParticles(deltaTime, progress);

    if (progress >= 1) {
      this.phase = 'settled';
      this.currentValue = this.targetValue;
      this.rotationX = 0;
      this.rotationY = 0;
      this.rotationZ = 0;
      this.shockwaveRadius = 0;
      this.shockwaveAlpha = 1;
      if (this.resolveRoll) {
        this.resolveRoll();
        this.resolveRoll = undefined;
      }
    }
  }

  private updateParticles(deltaTime: number, progress: number): void {
    const explodeEnd = 0.6;
    const aggregateStart = 0.6;
    
    this.particles.forEach(p => {
      p.life += deltaTime;
      
      p.trail.push({ x: p.x, y: p.y, alpha: 1 });
      const maxTrailPoints = Math.ceil(TRAIL_DURATION / 0.016);
      if (p.trail.length > maxTrailPoints) {
        p.trail.shift();
      }
      
      p.trail.forEach((t, i) => {
        t.alpha = i / p.trail.length;
      });

      if (progress < explodeEnd) {
        p.vx += p.ax * deltaTime;
        p.vy += p.ay * deltaTime;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
      } else if (progress >= aggregateStart) {
        const aggregateProgress = (progress - aggregateStart) / (1 - aggregateStart);
        const easeProgress = this.easeOutCubic(aggregateProgress);
        
        const startX = p.x;
        const startY = p.y;
        
        p.x = startX + (p.targetX - startX) * easeProgress;
        p.y = startY + (p.targetY - startY) * easeProgress;
        
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.size = 2 + (3 - 2) * (1 - aggregateProgress);
      }
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const drawY = this.y + this.floatOffset;
    const rgb = hexToRgb(this.color);

    if (this.shockwaveAlpha > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.shockwaveAlpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(this.x, drawY, this.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.phase === 'idle' || this.phase === 'settled') {
      this.renderDiceFace(ctx, drawY);
      this.renderSettledParticles(ctx);
    } else {
      this.renderParticles(ctx);
      
      if (this.phase === 'rotating' || this.phase === 'exploding') {
        this.renderRotatingDice(ctx, drawY);
      }
    }
  }

  private renderDiceFace(ctx: CanvasRenderingContext2D, drawY: number): void {
    const s = this.size;
    
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 30;
    ctx.drawImage(
      this.offscreenCanvas,
      this.x - s,
      drawY - s,
      s * 2,
      s * 2
    );
    ctx.restore();

    const dots = DOTS_PATTERNS[this.currentValue] || DOTS_PATTERNS[1];
    const dotRadius = s * 0.12;
    
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 8;
    
    dots.forEach(([px, py]) => {
      const dotX = this.x + (px - 0.5) * s * 0.8;
      const dotY = drawY + (py - 0.5) * s * 0.8;
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }

  private renderRotatingDice(ctx: CanvasRenderingContext2D, drawY: number): void {
    const s = this.size;
    const alpha = 0.3 + 0.3 * Math.sin(this.rollProgress * 20);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, drawY);
    
    const scaleX = Math.cos(this.rotationX * 0.01) * 0.5 + 0.5;
    const scaleY = Math.cos(this.rotationY * 0.01) * 0.5 + 0.5;
    
    ctx.scale(scaleX, scaleY);
    
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.drawImage(this.offscreenCanvas, -s, -s, s * 2, s * 2);
    
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    const rgb = hexToRgb(this.color);
    
    this.particles.forEach(p => {
      if (p.trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = p.size * 0.8;
        
        for (let i = 1; i < p.trail.length; i++) {
          const prev = p.trail[i - 1];
          const curr = p.trail[i];
          
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          
          const gradient = ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
          gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${prev.alpha * 0.5})`);
          gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${curr.alpha * 0.8})`);
          
          ctx.strokeStyle = gradient;
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      ctx.save();
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
      ctx.shadowBlur = 15;
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderSettledParticles(ctx: CanvasRenderingContext2D): void {
    const dots = DOTS_PATTERNS[this.currentValue] || DOTS_PATTERNS[1];
    const dotRadius = this.size * 0.12;
    
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 8;
    
    dots.forEach(([px, py]) => {
      const dotX = this.x + (px - 0.5) * this.size * 0.8;
      const dotY = this.y + this.floatOffset + (py - 0.5) * this.size * 0.8;
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }

  getValue(): number {
    return this.currentValue;
  }
}
