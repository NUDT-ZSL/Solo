import { 
  PathMemory, 
  PathPoint, 
  AtmosphereType, 
  ATMOSPHERE_CONFIGS, 
  MAX_PARTICLE_DENSITY,
  TAIL_DELAY_MS
} from './path';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'circle' | 'note' | 'wave' | 'star' | 'lava';
  rotation: number;
  rotationSpeed: number;
  active: boolean;
}

export type RenderMode = 'draw' | 'playback';

export interface PerfStats {
  fps: number;
  particleCount: number;
  pointCount: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private pathMemory: PathMemory | null = null;
  private mode: RenderMode = 'draw';
  private playbackProgress: number = 0;
  private isDrawing: boolean = false;

  private particles: Particle[] = [];
  private maxParticles: number = MAX_PARTICLE_DENSITY + 50;
  private particleDensity: number = 80;

  private tailDelayMs: number = TAIL_DELAY_MS;
  private tailFadeMs: number = 500;
  private trailPoints: { x: number; y: number; addedAt: number }[] = [];

  private lastEmittedSegmentIndex: number = -1;
  private lastEmittedProgress: number = 0;
  private fadeOutProgress: number = 0;

  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 60;
  private onFrameCallback: ((stats: PerfStats) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.initParticlePool();
  }

  private initParticlePool(): void {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 5000,
        size: 0, color: '#fff',
        type: 'circle', rotation: 0, rotationSpeed: 0,
        active: false
      });
    }
  }

  public setPathMemory(memory: PathMemory): void {
    this.pathMemory = memory;
    this.particleDensity = memory.particleDensity;
  }

  public setMode(mode: RenderMode): void {
    this.mode = mode;
    if (mode === 'playback') {
      this.lastEmittedProgress = 0;
      this.lastEmittedSegmentIndex = -1;
      this.fadeOutProgress = 0;
      this.resetParticles();
    } else {
      this.trailPoints = [];
      this.resetParticles();
    }
  }

  public setPlaybackProgress(progress: number): void {
    this.playbackProgress = progress;
  }

  public setDrawing(drawing: boolean): void {
    this.isDrawing = drawing;
    if (!drawing) {
      this.trailPoints = [];
    }
  }

  public setParticleDensity(density: number): void {
    this.particleDensity = density;
  }

  public setOnFrameCallback(callback: ((stats: PerfStats) => void) | null): void {
    this.onFrameCallback = callback;
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public start(): void {
    if (this.animationFrameId !== null) return;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    this.loop();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = Math.min(now - this.lastFrameTime, 50);
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    this.update(deltaTime, now);
    this.render();

    if (this.onFrameCallback) {
      const activeParticles = this.particles.filter(p => p.active).length;
      this.onFrameCallback({
        fps: this.currentFps,
        particleCount: activeParticles,
        pointCount: this.pathMemory?.points.length || 0
      });
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number, now: number): void {
    this.updateParticles(deltaTime);
    
    if (this.mode === 'draw') {
      this.updateTrail(now);
    }

    if (this.mode === 'playback' && this.pathMemory) {
      this.emitPlaybackParticles(deltaTime);
    }
  }

  private updateTrail(now: number): void {
    const cutoffAge = this.tailDelayMs + this.tailFadeMs;
    while (this.trailPoints.length > 0 && now - this.trailPoints[0].addedAt > cutoffAge) {
      this.trailPoints.shift();
    }
  }

  public addPendingTailPoint(x: number, y: number): void {
    this.trailPoints.push({
      x, y,
      addedAt: performance.now()
    });
  }

  private resetParticles(): void {
    for (const p of this.particles) {
      p.active = false;
    }
  }

  private emitPlaybackParticles(deltaTime: number): void {
    if (!this.pathMemory || this.pathMemory.isEmpty()) return;

    const currentProgress = this.playbackProgress;
    const startProgress = this.lastEmittedProgress;

    if (currentProgress <= startProgress) {
      this.lastEmittedProgress = currentProgress;
      return;
    }

    const points = this.pathMemory.points;
    const totalDuration = this.pathMemory.getTotalDuration();
    const startTime = startProgress * totalDuration;
    const endTime = currentProgress * totalDuration;

    const newlyActiveSegments: number[] = [];
    
    for (let segIdx = 0; segIdx < this.pathMemory.segments.length; segIdx++) {
      if (segIdx <= this.lastEmittedSegmentIndex) continue;
      
      const segment = this.pathMemory.segments[segIdx];
      const segmentEndTime = points[Math.min(segment.endIndex, points.length - 1)].timestamp;
      
      if (endTime >= segmentEndTime) {
        newlyActiveSegments.push(segIdx);
        this.lastEmittedSegmentIndex = segIdx;
      }
    }

    for (const segIdx of newlyActiveSegments) {
      this.emitParticlesForSegment(segIdx);
    }

    for (let i = 1; i < points.length; i++) {
      const pointTime = points[i].timestamp;
      if (pointTime >= startTime && pointTime <= endTime) {
        if (Math.random() < 0.15) {
          const atmosphere = this.pathMemory.getAtmosphereAtPoint(i);
          if (atmosphere) {
            this.emitSingleParticle(points[i].x, points[i].y, atmosphere);
          }
        }
      }
      if (pointTime > endTime) break;
    }

    if (currentProgress >= 0.97) {
      this.fadeOutProgress = Math.min(1, this.fadeOutProgress + deltaTime / 1000);
    } else {
      this.fadeOutProgress = 0;
    }

    this.lastEmittedProgress = currentProgress;
  }

  private emitParticlesForSegment(segmentIndex: number): void {
    if (!this.pathMemory) return;
    
    const segment = this.pathMemory.segments[segmentIndex];
    if (!segment) return;

    const points = this.pathMemory.points;
    const segPixelLength = this.calculateSegmentPixelLength(
      points,
      segment.startIndex,
      segment.endIndex
    );

    const pixelsPerParticle = Math.max(15, 80 - this.particleDensity * 0.4);
    let particleCount = Math.floor(segPixelLength / pixelsPerParticle);
    particleCount = Math.min(Math.max(3, particleCount), MAX_PARTICLE_DENSITY);

    const config = ATMOSPHERE_CONFIGS[segment.atmosphere];

    for (let i = 0; i < particleCount; i++) {
      const t = particleCount > 1 ? i / (particleCount - 1) : 0.5;
      const interpolated = this.interpolatePointAlongSegment(
        points,
        segment.startIndex,
        segment.endIndex,
        t
      );
      
      const offsetX = (Math.random() - 0.5) * 0.01;
      const offsetY = (Math.random() - 0.5) * 0.01;
      
      this.emitParticle(
        interpolated.x + offsetX,
        interpolated.y + offsetY,
        segment.atmosphere,
        config.color
      );
    }
  }

  private calculateSegmentPixelLength(
    points: PathPoint[],
    startIdx: number,
    endIdx: number
  ): number {
    let length = 0;
    for (let i = startIdx + 1; i <= endIdx && i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = (curr.x - prev.x) * this.width;
      const dy = (curr.y - prev.y) * this.height;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  private interpolatePointAlongSegment(
    points: PathPoint[],
    startIdx: number,
    endIdx: number,
    t: number
  ): { x: number; y: number } {
    const totalLen = this.calculateSegmentPixelLength(points, startIdx, endIdx);
    const targetDist = t * totalLen;
    let acc = 0;

    for (let i = startIdx + 1; i <= endIdx && i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = (curr.x - prev.x) * this.width;
      const dy = (curr.y - prev.y) * this.height;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      
      if (acc + segLen >= targetDist || i === endIdx) {
        const segT = segLen > 0 ? (targetDist - acc) / segLen : 0;
        return {
          x: prev.x + (curr.x - prev.x) * segT,
          y: prev.y + (curr.y - prev.y) * segT
        };
      }
      acc += segLen;
    }
    return { x: points[endIdx].x, y: points[endIdx].y };
  }

  private emitSingleParticle(x: number, y: number, atmosphere: AtmosphereType): void {
    const config = ATMOSPHERE_CONFIGS[atmosphere];
    this.emitParticle(x, y, atmosphere, config.color);
  }

  private emitParticle(
    x: number, 
    y: number, 
    atmosphere: AtmosphereType,
    color: string
  ): void {
    const particle = this.getInactiveParticle();
    if (!particle) return;

    const angle = Math.random() * Math.PI * 2;
    const speed = 0.015 + Math.random() * 0.03;

    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed - 0.008;
    particle.life = 0;
    particle.maxLife = 5000;
    particle.size = 3 + Math.random() * 6;
    particle.color = color;
    particle.rotation = Math.random() * Math.PI * 2;
    particle.rotationSpeed = (Math.random() - 0.5) * 0.025;
    particle.active = true;

    switch (atmosphere) {
      case 'forest':
        particle.type = Math.random() > 0.4 ? 'note' : 'circle';
        break;
      case 'ocean':
        particle.type = 'wave';
        particle.vy *= 0.5;
        break;
      case 'dusk':
        particle.type = 'star';
        particle.rotationSpeed *= 3;
        break;
      case 'volcano':
        particle.type = 'lava';
        particle.vy = -Math.abs(particle.vy) * 2 - 0.02;
        particle.vx *= 0.5;
        particle.maxLife = 4000;
        break;
      default:
        particle.type = 'circle';
    }
  }

  private getInactiveParticle(): Particle | null {
    for (const p of this.particles) {
      if (!p.active) return p;
    }
    let oldestIndex = -1;
    let oldestLife = -1;
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].life > oldestLife) {
        oldestLife = this.particles[i].life;
        oldestIndex = i;
      }
    }
    return oldestIndex >= 0 ? this.particles[oldestIndex] : null;
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime * 0.06;
    for (const p of this.particles) {
      if (!p.active) continue;

      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      if (p.type === 'lava') {
        p.vy += 0.00005 * dt;
      } else if (p.type === 'star' || p.type === 'note') {
        p.vy -= 0.00002 * dt;
      } else {
        p.vy += 0.00001 * dt;
      }
      
      p.rotation += p.rotationSpeed * dt;
    }
  }

  private render(): void {
    this.ctx.fillStyle = '#F5F0E8';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.drawBackgroundGrid();

    if (this.mode === 'draw') {
      this.drawPathDrawMode();
    } else {
      this.drawPathPlaybackMode();
    }

    this.drawParticles();
  }

  private drawBackgroundGrid(): void {
    this.ctx.strokeStyle = 'rgba(26, 35, 50, 0.05)';
    this.ctx.lineWidth = 1;
    
    const gridSize = 40;
    this.ctx.beginPath();
    for (let x = 0; x <= this.width; x += gridSize) {
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, this.height);
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(this.width, y + 0.5);
    }
    this.ctx.stroke();
  }

  private drawPathDrawMode(): void {
    if (!this.pathMemory) return;

    const now = performance.now();
    const committedPoints = this.pathMemory.points;
    const trailLen = this.trailPoints.length;
    const committedCount = Math.max(0, committedPoints.length - trailLen);

    if (committedCount > 1) {
      this.drawPathPoints(committedPoints.slice(0, committedCount), 1);
    }

    if (trailLen > 0) {
      const committedLast = committedCount > 0 ? committedPoints[committedCount - 1] : null;
      this.drawTrailWithFade(committedLast, now);
    }

    if (this.isDrawing && this.trailPoints.length > 0) {
      this.drawCurrentCursor();
    }
  }

  private drawTrailWithFade(
    anchorPoint: PathPoint | null,
    now: number
  ): void {
    if (this.trailPoints.length === 0) return;

    const trail = this.trailPoints;
    const fullPoints: { x: number; y: number; age: number }[] = [];

    if (anchorPoint) {
      const anchorAge = this.tailDelayMs + 1;
      fullPoints.push({ x: anchorPoint.x, y: anchorPoint.y, age: anchorAge });
    }

    for (const tp of trail) {
      fullPoints.push({
        x: tp.x,
        y: tp.y,
        age: now - tp.addedAt
      });
    }

    if (fullPoints.length < 2) return;

    for (let i = 1; i < fullPoints.length; i++) {
      const prev = fullPoints[i - 1];
      const curr = fullPoints[i];

      const prevAlpha = this.getTailAlphaForAge(prev.age);
      const currAlpha = this.getTailAlphaForAge(curr.age);
      const alpha = (prevAlpha + currAlpha) * 0.5;

      const prevWidth = this.getTailWidthForAge(prev.age);
      const currWidth = this.getTailWidthForAge(curr.age);
      const lineWidth = (prevWidth + currWidth) * 0.5;

      if (alpha <= 0.01 || lineWidth <= 0.1) continue;

      this.drawPathSegment(
        { x: prev.x, y: prev.y, timestamp: 0 },
        { x: curr.x, y: curr.y, timestamp: 0 },
        '#4A90D9',
        lineWidth,
        alpha
      );
    }
  }

  private getTailAlphaForAge(age: number): number {
    if (age >= this.tailDelayMs) return 1;
    const t = age / this.tailDelayMs;
    const eased = t * t * (3 - 2 * t);
    return 0.1 + eased * 0.9;
  }

  private getTailWidthForAge(age: number): number {
    if (age >= this.tailDelayMs) return 3;
    const t = age / this.tailDelayMs;
    const eased = t * t * (3 - 2 * t);
    return 0.8 + eased * 2.2;
  }

  private drawCurrentCursor(): void {
    if (this.trailPoints.length === 0) return;
    
    const latest = this.trailPoints[this.trailPoints.length - 1];
    const x = latest.x * this.width;
    const y = latest.y * this.height;
    
    this.ctx.save();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 15, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(74, 144, 217, 0.15)';
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(74, 144, 217, 0.4)';
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = '#4A90D9';
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawPathPlaybackMode(): void {
    if (!this.pathMemory || this.pathMemory.isEmpty()) return;

    const visiblePoints = this.pathMemory.getPointsUpToProgress(this.playbackProgress);
    if (visiblePoints.length < 2) return;

    this.drawPathPoints(visiblePoints, 1);

    if (visiblePoints.length > 0 && this.playbackProgress < 1) {
      const lastPoint = visiblePoints[visiblePoints.length - 1];
      const pointIndex = this.findNearestPointIndex(lastPoint);
      const atmosphere = this.pathMemory.getAtmosphereAtPoint(pointIndex);
      const color = atmosphere ? ATMOSPHERE_CONFIGS[atmosphere].color : '#4A90D9';
      this.drawPlaybackHead(lastPoint, color);
    }
  }

  private drawPlaybackHead(point: PathPoint, color: string): void {
    const x = point.x * this.width;
    const y = point.y * this.height;
    
    this.ctx.save();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, 0, Math.PI * 2);
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 20);
    gradient.addColorStop(0, this.hexToRgba(color, 0.4));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawPathPoints(points: PathPoint[], baseAlpha: number): void {
    if (points.length < 2) return;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const atmosphere = this.pathMemory?.getAtmosphereAtPoint(
        this.findNearestPointIndex(curr)
      );
      const color = atmosphere 
        ? ATMOSPHERE_CONFIGS[atmosphere].color 
        : '#4A90D9';
      
      const progress = points.length > 1 ? i / points.length : 1;
      const alpha = baseAlpha * Math.min(1, progress * 5);
      
      this.drawPathSegment(prev, curr, color, 3, alpha);
    }
  }

  private findNearestPointIndex(target: PathPoint): number {
    if (!this.pathMemory) return 0;
    const points = this.pathMemory.points;
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - target.x;
      const dy = points[i].y - target.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    return nearest;
  }

  private drawPathSegment(
    prev: PathPoint,
    curr: PathPoint,
    color: string,
    lineWidth: number,
    alpha: number
  ): void {
    const x1 = prev.x * this.width;
    const y1 = prev.y * this.height;
    const x2 = curr.x * this.width;
    const y2 = curr.y * this.height;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth + 6;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 12;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    this.ctx.lineWidth = Math.max(1, lineWidth - 1.5);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1 - 1);
    this.ctx.lineTo(x2, y2 - 1);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      if (!p.active) continue;

      const lifeRatio = p.life / p.maxLife;
      let alpha = this.easeOutQuad(1 - lifeRatio);

      if (this.fadeOutProgress > 0) {
        alpha *= (1 - this.fadeOutProgress);
      }

      if (alpha <= 0.01) continue;

      const x = p.x * this.width;
      const y = p.y * this.height;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(x, y);
      this.ctx.rotate(p.rotation);

      switch (p.type) {
        case 'circle':
          this.drawCircleParticle(p.size, p.color);
          break;
        case 'note':
          this.drawNoteParticle(p.size, p.color);
          break;
        case 'wave':
          this.drawWaveParticle(p.size, p.color);
          break;
        case 'star':
          this.drawStarParticle(p.size, p.color);
          break;
        case 'lava':
          this.drawLavaParticle(p.size, p.color, lifeRatio);
          break;
      }

      this.ctx.restore();
    }
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private drawCircleParticle(size: number, color: string): void {
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(-size * 0.15, -size * 0.15, size * 0.15, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fill();
  }

  private drawNoteParticle(size: number, color: string): void {
    const s = size;
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = Math.max(1, s * 0.12);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const hx = -s * 0.3;
    const hy = s * 0.2;
    const hrx = s * 0.42;
    const hry = s * 0.3;
    const tilt = -0.35;

    this.ctx.beginPath();
    this.ctx.moveTo(
      hx + Math.cos(tilt) * hrx,
      hy + Math.sin(tilt) * hrx
    );
    this.ctx.bezierCurveTo(
      hx + Math.cos(tilt) * hrx - Math.sin(tilt) * hry * 0.6,
      hy + Math.sin(tilt) * hrx + Math.cos(tilt) * hry * 0.6,
      hx - Math.cos(tilt) * hrx - Math.sin(tilt) * hry * 0.6,
      hy - Math.sin(tilt) * hrx + Math.cos(tilt) * hry * 0.6,
      hx - Math.cos(tilt) * hrx,
      hy - Math.sin(tilt) * hrx
    );
    this.ctx.bezierCurveTo(
      hx - Math.cos(tilt) * hrx + Math.sin(tilt) * hry * 0.6,
      hy - Math.sin(tilt) * hrx - Math.cos(tilt) * hry * 0.6,
      hx + Math.cos(tilt) * hrx + Math.sin(tilt) * hry * 0.6,
      hy + Math.sin(tilt) * hrx - Math.cos(tilt) * hry * 0.6,
      hx + Math.cos(tilt) * hrx,
      hy + Math.sin(tilt) * hrx
    );
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(hx - s * 0.08, hy - s * 0.05, s * 0.15, s * 0.09, tilt, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fill();

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = Math.max(1.5, s * 0.16);
    this.ctx.beginPath();
    this.ctx.moveTo(hx + Math.cos(tilt) * hrx * 0.9, hy + Math.sin(tilt) * hrx * 0.9 - hry * 0.15);
    this.ctx.quadraticCurveTo(
      s * 0.05, -s * 0.2,
      s * 0.02, -s * 0.78
    );
    this.ctx.stroke();

    this.ctx.lineWidth = Math.max(1, s * 0.1);
    this.ctx.beginPath();
    this.ctx.moveTo(s * 0.02, -s * 0.78);
    this.ctx.bezierCurveTo(
      s * 0.18, -s * 0.85,
      s * 0.75, -s * 0.65,
      s * 0.6, -s * 0.2
    );
    this.ctx.bezierCurveTo(
      s * 0.55, -s * 0.08,
      s * 0.18, -s * 0.32,
      s * 0.08, -s * 0.42
    );
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(s * 0.3, -s * 0.5, s * 0.09, s * 0.05, 0.35, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this.ctx.fill();
  }

  private drawWaveParticle(size: number, color: string): void {
    const s = size;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = Math.max(1, s * 0.18);
    this.ctx.lineCap = 'round';

    for (let row = -1; row <= 1; row++) {
      const y = row * s * 0.35;
      this.ctx.beginPath();
      this.ctx.moveTo(-s * 0.9, y);
      this.ctx.bezierCurveTo(
        -s * 0.6, y - s * 0.25,
        -s * 0.3, y + s * 0.25,
        0, y
      );
      this.ctx.bezierCurveTo(
        s * 0.3, y - s * 0.25,
        s * 0.6, y + s * 0.25,
        s * 0.9, y
      );
      this.ctx.globalAlpha = 0.7 + row * 0.15;
      this.ctx.stroke();
    }
  }

  private drawStarParticle(size: number, color: string): void {
    const s = size;
    const spikes = 5;
    const outerRadius = s * 0.55;
    const innerRadius = s * 0.22;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fill();

    this.ctx.save();
    this.ctx.rotate(Math.PI / spikes);
    this.ctx.beginPath();
    this.ctx.moveTo(0, -s * 0.7);
    this.ctx.lineTo(0, s * 0.7);
    this.ctx.moveTo(-s * 0.7, 0);
    this.ctx.lineTo(s * 0.7, 0);
    this.ctx.strokeStyle = this.hexToRgba(color, 0.3);
    this.ctx.lineWidth = s * 0.08;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawLavaParticle(size: number, color: string, lifeRatio: number): void {
    const s = size * (1 + lifeRatio * 0.4);
    
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.7);
    gradient.addColorStop(0, '#FFEB99');
    gradient.addColorStop(0.25, '#FFD93D');
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    
    const wobble = Math.sin(lifeRatio * Math.PI * 4) * 0.1;
    this.ctx.moveTo(s * (0.6 + wobble), 0);
    this.ctx.bezierCurveTo(
      s * (0.6 + wobble), -s * (0.5 - wobble),
      s * (0.2 - wobble), -s * (0.7 + wobble),
      0, -s * (0.55 + wobble * 0.5)
    );
    this.ctx.bezierCurveTo(
      -s * (0.2 + wobble), -s * (0.7 - wobble),
      -s * (0.6 - wobble), -s * (0.45 + wobble),
      -s * (0.6 + wobble * 0.5), 0
    );
    this.ctx.bezierCurveTo(
      -s * (0.55 + wobble), s * (0.5 - wobble),
      -s * (0.15 - wobble * 0.5), s * (0.65 + wobble),
      0, s * (0.55 - wobble * 0.5)
    );
    this.ctx.bezierCurveTo(
      s * (0.15 + wobble * 0.5), s * (0.7 - wobble),
      s * (0.55 - wobble), s * (0.4 + wobble),
      s * (0.6 + wobble), 0
    );
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(-s * 0.12, -s * 0.15, s * 0.15, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / this.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / this.height))
    };
  }

  public resetFadeOut(): void {
    this.fadeOutProgress = 0;
    this.lastEmittedProgress = 0;
    this.lastEmittedSegmentIndex = -1;
  }

  public resetDrawingState(): void {
    this.trailPoints = [];
  }
}
