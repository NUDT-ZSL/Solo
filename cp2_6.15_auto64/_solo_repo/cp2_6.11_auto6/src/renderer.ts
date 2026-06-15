import { Point, AtmosphereType, ATMOSPHERE_PRESETS, PathMemory, catmullRomSmooth } from './path';

const TRAIL_DELAY_MS = 300;
const TRAIL_LAYERS = 8;
const PARTICLE_LIFETIME_MS = 5000;
const MAX_PARTICLES = 150;
const RANDOM_BATCH_SIZE = 1024;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  alpha: number;
  birthTime: number;
  lifetime: number;
  type: AtmosphereType;
  iconType: 'note' | 'wave' | 'star' | 'lava';
  active: boolean;
}

interface CachedRandom {
  values: Float32Array;
  index: number;
}

function createRandomCache(size: number): CachedRandom {
  const values = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    values[i] = Math.random();
  }
  return { values, index: 0 };
}

function getNextRandom(cache: CachedRandom): number {
  const val = cache.values[cache.index];
  cache.index = (cache.index + 1) % cache.values.length;
  return val;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 74, g: 144, b: 217 };
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;
  private randomCache: CachedRandom;
  
  private particlePool: Particle[] = [];
  private activeParticleCount: number = 0;
  
  private trailHistory: { points: Point[]; timestamp: number }[] = [];
  private smoothedTrail: Point[] = [];
  
  private iconCache: Map<string, HTMLCanvasElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.randomCache = createRandomCache(RANDOM_BATCH_SIZE);
    this.initializeParticlePool();
    this.initializeIconCache();
    this.resize();
  }

  private initializeParticlePool(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0, size: 0, rotation: 0, rotationSpeed: 0,
        color: '#000', alpha: 0, birthTime: 0, lifetime: 0,
        type: 'forest', iconType: 'note', active: false
      });
    }
  }

  private initializeIconCache(): void {
    const types: AtmosphereType[] = ['forest', 'ocean', 'dusk', 'volcano'];
    const sizes = [8, 12, 16];
    
    for (const type of types) {
      for (const size of sizes) {
        const key = `${type}-${size}`;
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = size * 2;
        cacheCanvas.height = size * 2;
        const cacheCtx = cacheCanvas.getContext('2d')!;
        this.drawIconToContext(cacheCtx, size, size, size, ATMOSPHERE_PRESETS[type].iconGlyph, ATMOSPHERE_PRESETS[type].color, 1);
        this.iconCache.set(key, cacheCanvas);
      }
    }
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(): void {
    const ctx = this.ctx;
    
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(0, 0, this.width, this.height);
    
    ctx.strokeStyle = 'rgba(26, 35, 50, 0.05)';
    ctx.lineWidth = 1;
    
    const gridSize = 40;
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  normalizeToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.width,
      y: y * this.height
    };
  }

  canvasToNormalize(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(1, x / this.width)),
      y: Math.max(0, Math.min(1, y / this.height))
    };
  }

  addTrailPoint(point: Point, currentTime: number): void {
    this.trailHistory.push({ points: [{ ...point }], timestamp: currentTime });
    
    const cutoffTime = currentTime - TRAIL_DELAY_MS;
    while (this.trailHistory.length > 1 && this.trailHistory[0].timestamp < cutoffTime) {
      this.trailHistory.shift();
    }
    
    this.updateSmoothedTrail();
  }

  private updateSmoothedTrail(): void {
    if (this.trailHistory.length < 2) {
      this.smoothedTrail = this.trailHistory.map(h => h.points[0]);
      return;
    }
    
    const allPoints = this.trailHistory.map(h => h.points[0]);
    this.smoothedTrail = catmullRomSmooth(allPoints, 0.5, 8, 40);
  }

  drawTrail(currentTime: number): void {
    if (this.smoothedTrail.length < 2) return;
    
    const ctx = this.ctx;
    const now = currentTime;
    
    for (let layer = TRAIL_LAYERS; layer >= 1; layer--) {
      const layerAlpha = (layer / TRAIL_LAYERS) * 0.4;
      const layerBlur = (TRAIL_LAYERS - layer + 1) * 3;
      const layerWidth = 3 + (TRAIL_LAYERS - layer) * 0.5;
      const trailDelay = (TRAIL_DELAY_MS * layer) / TRAIL_LAYERS;
      
      const cutoffTime = now - trailDelay;
      const visiblePoints = this.smoothedTrail.filter(p => p.timestamp <= cutoffTime);
      
      if (visiblePoints.length < 2) continue;
      
      ctx.save();
      ctx.globalAlpha = layerAlpha;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = layerBlur;
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = layerWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      const first = this.normalizeToCanvas(visiblePoints[0].x, visiblePoints[0].y);
      ctx.moveTo(first.x, first.y);
      
      for (let i = 1; i < visiblePoints.length; i++) {
        const p = this.normalizeToCanvas(visiblePoints[i].x, visiblePoints[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }
    
    const mainPoints = this.smoothedTrail.filter(p => p.timestamp <= now - TRAIL_DELAY_MS);
    if (mainPoints.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      const first = this.normalizeToCanvas(mainPoints[0].x, mainPoints[0].y);
      ctx.moveTo(first.x, first.y);
      
      for (let i = 1; i < mainPoints.length; i++) {
        const p = this.normalizeToCanvas(mainPoints[i].x, mainPoints[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  drawFullPath(pathMemory: PathMemory, playbackTime: number, playbackSpeed: number): void {
    const ctx = this.ctx;
    const points = pathMemory.getPoints();
    const segments = pathMemory.getSegments();
    
    if (points.length < 2) return;
    
    const startTime = points[0].timestamp;
    const effectivePlaybackTime = playbackTime * playbackSpeed * 2 + startTime;
    
    let endIndex = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].timestamp <= effectivePlaybackTime) {
        endIndex = i;
      } else {
        break;
      }
    }
    
    if (endIndex < 1) return;
    
    for (let layer = 3; layer >= 1; layer--) {
      const layerAlpha = 0.3 * (layer / 3);
      const layerBlur = layer * 4;
      const layerWidth = 3 + (3 - layer);
      
      ctx.save();
      ctx.globalAlpha = layerAlpha;
      ctx.shadowBlur = layerBlur;
      ctx.lineWidth = layerWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      for (const seg of segments) {
        const segEndIdx = Math.min(seg.endIndex, endIndex);
        if (segEndIdx <= seg.startIndex) continue;
        
        const preset = ATMOSPHERE_PRESETS[seg.atmosphere];
        ctx.strokeStyle = preset.color;
        ctx.shadowColor = preset.color;
        
        ctx.beginPath();
        const first = this.normalizeToCanvas(points[seg.startIndex].x, points[seg.startIndex].y);
        ctx.moveTo(first.x, first.y);
        
        for (let i = seg.startIndex + 1; i <= segEndIdx; i++) {
          const p = this.normalizeToCanvas(points[i].x, points[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    
    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;
    
    for (const seg of segments) {
      const segEndIdx = Math.min(seg.endIndex, endIndex);
      if (segEndIdx <= seg.startIndex) continue;
      
      const preset = ATMOSPHERE_PRESETS[seg.atmosphere];
      ctx.strokeStyle = preset.color;
      ctx.shadowColor = preset.color;
      
      ctx.beginPath();
      const first = this.normalizeToCanvas(points[seg.startIndex].x, points[seg.startIndex].y);
      ctx.moveTo(first.x, first.y);
      
      for (let i = seg.startIndex + 1; i <= segEndIdx; i++) {
        const p = this.normalizeToCanvas(points[i].x, points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
    
    if (endIndex > 0 && endIndex < points.length - 1) {
      const p0 = points[endIndex];
      const p1 = points[endIndex + 1];
      const timeRange = p1.timestamp - p0.timestamp;
      if (timeRange > 0) {
        const t = Math.min(1, Math.max(0, (effectivePlaybackTime - p0.timestamp) / timeRange));
        const headX = p0.x + (p1.x - p0.x) * t;
        const headY = p0.y + (p1.y - p0.y) * t;
        const head = this.normalizeToCanvas(headX, headY);
        
        const atmosphere = pathMemory.getAtmosphereAtIndex(endIndex) || 'ocean';
        const color = ATMOSPHERE_PRESETS[atmosphere].color;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  emitParticles(
    x: number, 
    y: number, 
    atmosphere: AtmosphereType, 
    count: number, 
    currentTime: number
  ): void {
    const preset = ATMOSPHERE_PRESETS[atmosphere];
    const canvasPos = this.normalizeToCanvas(x, y);
    
    for (let i = 0; i < count && this.activeParticleCount < MAX_PARTICLES; i++) {
      let particle: Particle | null = null;
      
      for (const p of this.particlePool) {
        if (!p.active) {
          particle = p;
          break;
        }
      }
      
      if (!particle) break;
      
      const angle = getNextRandom(this.randomCache) * Math.PI * 2;
      const speed = 0.5 + getNextRandom(this.randomCache) * 1.5;
      
      particle.x = canvasPos.x;
      particle.y = canvasPos.y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 0.5;
      particle.size = 6 + getNextRandom(this.randomCache) * 8;
      particle.rotation = getNextRandom(this.randomCache) * Math.PI * 2;
      particle.rotationSpeed = (getNextRandom(this.randomCache) - 0.5) * 0.1;
      particle.color = preset.color;
      particle.alpha = 1;
      particle.birthTime = currentTime;
      particle.lifetime = PARTICLE_LIFETIME_MS * (0.8 + getNextRandom(this.randomCache) * 0.4);
      particle.type = atmosphere;
      particle.iconType = preset.iconGlyph;
      particle.active = true;
      
      this.activeParticleCount++;
    }
  }

  updateParticles(currentTime: number, fadeOutProgress: number = 0): void {
    const padding = 100;
    
    for (const particle of this.particlePool) {
      if (!particle.active) continue;
      
      const age = currentTime - particle.birthTime;
      const lifeProgress = age / particle.lifetime;
      
      if (lifeProgress >= 1) {
        particle.active = false;
        this.activeParticleCount--;
        continue;
      }
      
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.02;
      particle.vx *= 0.99;
      particle.rotation += particle.rotationSpeed;
      
      const lifeAlpha = 1 - lifeProgress * lifeProgress;
      particle.alpha = lifeAlpha * (1 - fadeOutProgress);
      
      if (particle.x < -padding || particle.x > this.width + padding ||
          particle.y < -padding || particle.y > this.height + padding) {
        particle.active = false;
        this.activeParticleCount--;
      }
    }
  }

  drawParticles(): void {
    const ctx = this.ctx;
    
    for (const particle of this.particlePool) {
      if (!particle.active) continue;
      
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      
      const sizeKey = `${particle.type}-${Math.round(particle.size)}`;
      const cachedIcon = this.iconCache.get(sizeKey);
      
      if (cachedIcon) {
        ctx.drawImage(
          cachedIcon,
          -particle.size,
          -particle.size,
          particle.size * 2,
          particle.size * 2
        );
      } else {
        this.drawIcon(ctx, 0, 0, particle.size, particle.iconType, particle.color, 1);
      }
      
      ctx.restore();
    }
  }

  resetParticles(): void {
    for (const particle of this.particlePool) {
      particle.active = false;
    }
    this.activeParticleCount = 0;
  }

  getActiveParticleCount(): number {
    return this.activeParticleCount;
  }

  private drawIconToContext(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    type: 'note' | 'wave' | 'star' | 'lava',
    color: string,
    alpha: number
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    
    switch (type) {
      case 'note':
        this.drawNote(ctx, x, y, size);
        break;
      case 'wave':
        this.drawWave(ctx, x, y, size);
        break;
      case 'star':
        this.drawStar(ctx, x, y, size);
        break;
      case 'lava':
        this.drawLava(ctx, x, y, size);
        break;
    }
    ctx.restore();
  }

  private drawIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    type: 'note' | 'wave' | 'star' | 'lava',
    color: string,
    alpha: number
  ): void {
    this.drawIconToContext(ctx, x, y, size, type, color, alpha);
  }

  private drawNote(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const h = size * 1.2;
    const w = size * 0.8;
    
    ctx.fillStyle = ctx.strokeStyle;
    
    ctx.beginPath();
    ctx.ellipse(x - w * 0.2, y + h * 0.3, w * 0.35, w * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y + h * 0.3);
    ctx.lineTo(x + w * 0.1, y - h * 0.5);
    ctx.lineTo(x + w * 0.6, y - h * 0.5);
    ctx.bezierCurveTo(
      x + w * 0.8, y - h * 0.5,
      x + w * 0.9, y - h * 0.35,
      x + w * 0.6, y - h * 0.2
    );
    ctx.lineTo(x + w * 0.3, y - h * 0.2);
    ctx.lineTo(x + w * 0.3, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(x + w * 0.45, y + h * 0.35, w * 0.3, w * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWave(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const w = size * 1.5;
    const h = size * 0.6;
    const segments = 4;
    
    ctx.lineWidth = Math.max(1.5, size * 0.15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let layer = 0; layer < 3; layer++) {
      const layerY = y - h * 0.3 + layer * h * 0.3;
      const amplitude = h * (0.3 - layer * 0.08);
      
      ctx.beginPath();
      ctx.moveTo(x - w / 2, layerY);
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const px = x - w / 2 + t * w;
        const py = layerY + Math.sin(t * Math.PI * 2 + layer * 0.5) * amplitude;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          const prevT = (i - 1) / segments;
          const prevX = x - w / 2 + prevT * w;
          const prevY = layerY + Math.sin(prevT * Math.PI * 2 + layer * 0.5) * amplitude;
          
          const cp1x = prevX + w / segments * 0.4;
          const cp1y = prevY;
          const cp2x = px - w / segments * 0.4;
          const cp2y = py;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, px, py);
        }
      }
      ctx.stroke();
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        const prevAngle = ((i - 1) * Math.PI) / spikes - Math.PI / 2;
        const prevRadius = (i - 1) % 2 === 0 ? outerRadius : innerRadius;
        
        const midAngle = (prevAngle + angle) / 2;
        const midRadius = (prevRadius + radius) / 2 * 0.95;
        const cpX = x + Math.cos(midAngle) * midRadius;
        const cpY = y + Math.sin(midAngle) * midRadius;
        
        ctx.quadraticCurveTo(cpX, cpY, px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  private drawLava(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const rgb = hexToRgb(ctx.strokeStyle as string);
    
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    
    ctx.bezierCurveTo(
      x + size * 0.8, y - size * 0.8,
      x + size, y - size * 0.3,
      x + size * 0.7, y + size * 0.2
    );
    
    ctx.bezierCurveTo(
      x + size * 0.9, y + size * 0.5,
      x + size * 0.6, y + size,
      x, y + size
    );
    
    ctx.bezierCurveTo(
      x - size * 0.6, y + size,
      x - size * 0.9, y + size * 0.5,
      x - size * 0.7, y + size * 0.2
    );
    
    ctx.bezierCurveTo(
      x - size, y - size * 0.3,
      x - size * 0.8, y - size * 0.8,
      x, y - size
    );
    
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(
      x - size * 0.2, y - size * 0.2, 0,
      x, y, size
    );
    gradient.addColorStop(0, `rgba(255, 255, 200, 0.9)`);
    gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
    gradient.addColorStop(0.7, `rgba(${Math.max(0, rgb.r - 50)}, ${Math.max(0, rgb.g - 50)}, ${Math.max(0, rgb.b - 50)}, 0.9)`);
    gradient.addColorStop(1, `rgba(${Math.max(0, rgb.r - 100)}, ${Math.max(0, rgb.g - 100)}, ${Math.max(0, rgb.b - 100)}, 0.8)`);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const dist = size * 0.3;
      const bx = x + Math.cos(angle) * dist;
      const by = y + Math.sin(angle) * dist;
      
      ctx.beginPath();
      ctx.arc(bx, by, size * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
      ctx.fill();
    }
  }

  drawMarkers(pathMemory: PathMemory): void {
    const ctx = this.ctx;
    const points = pathMemory.getPoints();
    
    if (points.length < 2) return;
    
    const start = this.normalizeToCanvas(points[0].x, points[0].y);
    const end = this.normalizeToCanvas(points[points.length - 1].x, points[points.length - 1].y);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(start.x, start.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#6BCB77';
    ctx.shadowColor = '#6BCB77';
    ctx.shadowBlur = 15;
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('起', start.x, start.y);
    ctx.restore();
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';
    ctx.shadowColor = '#FF6B6B';
    ctx.shadowBlur = 15;
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('终', end.x, end.y);
    ctx.restore();
  }

  resetTrail(): void {
    this.trailHistory = [];
    this.smoothedTrail = [];
  }

  getRandom(): number {
    return getNextRandom(this.randomCache);
  }

  getRandomRange(min: number, max: number): number {
    return min + getNextRandom(this.randomCache) * (max - min);
  }
}
