import { EventBus } from './EventBus';

export interface ControlPoint {
  id: string;
  x: number;
  y: number;
  radius: number;
  angle: number;
  strength: number;
  colorIndex: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  colorPhase: number;
  trail: { x: number; y: number }[];
}

export interface ParticleData {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  trail: { x: number; y: number }[];
}

const CP_COLORS = ['#4361ee', '#f72585', '#00f5d4'];

export class FlowFieldEngine {
  private controlPoints: ControlPoint[] = [];
  private particles: Particle[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private eventBus: EventBus;
  private nextId: number = 0;
  private nextColorIndex: number = 0;
  public isPlaying: boolean = true;
  public particlesPerFrame: number = 8;
  public initialParticles: number = 256;
  public maxParticles: number = 4096;
  public particleLifetime: number = 8;
  public particleSpeed: number = 120;
  public currentParticlesPerFrame: number = 8;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.eventBus.on('cp:add', (x: number, y: number) => this.addControlPoint(x, y));
    this.eventBus.on('cp:remove', (id: string) => this.removeControlPoint(id));
    this.eventBus.on('cp:update', (id: string, data: Partial<ControlPoint>) => this.updateControlPoint(id, data));
    this.eventBus.on('cp:reset', () => this.resetField());
    this.eventBus.on('engine:toggle-play', () => {
      this.isPlaying = !this.isPlaying;
    });
    this.eventBus.on('canvas:resize', (w: number, h: number) => this.setSize(w, h));
  }

  setSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  generateId(): string {
    return `cp_${++this.nextId}`;
  }

  addControlPoint(x: number, y: number): ControlPoint {
    const cp: ControlPoint = {
      id: this.generateId(),
      x,
      y,
      radius: 80,
      angle: 0,
      strength: 1.0,
      colorIndex: this.nextColorIndex % CP_COLORS.length,
    };
    this.nextColorIndex++;
    this.controlPoints.push(cp);
    this.eventBus.emit('cp:added', cp);
    return cp;
  }

  removeControlPoint(id: string): void {
    const idx = this.controlPoints.findIndex((cp) => cp.id === id);
    if (idx !== -1) {
      const removed = this.controlPoints.splice(idx, 1)[0];
      this.eventBus.emit('cp:removed', removed);
    }
  }

  updateControlPoint(id: string, data: Partial<ControlPoint>): void {
    const cp = this.controlPoints.find((c) => c.id === id);
    if (cp) {
      Object.assign(cp, data);
      this.eventBus.emit('cp:updated', cp);
    }
  }

  getControlPoint(id: string): ControlPoint | undefined {
    return this.controlPoints.find((c) => c.id === id);
  }

  getAllControlPoints(): ControlPoint[] {
    return [...this.controlPoints];
  }

  resetField(): void {
    this.controlPoints = [];
    this.particles = [];
    this.eventBus.emit('field:reset');
  }

  resetParticles(): void {
    this.particles = [];
  }

  getColorForIndex(index: number): string {
    return CP_COLORS[index % CP_COLORS.length];
  }

  static get CP_COLORS(): string[] {
    return CP_COLORS;
  }

  private createParticle(x?: number, y?: number): Particle {
    const px = x ?? 0;
    const py = y ?? Math.random() * this.canvasHeight;
    return {
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      life: this.particleLifetime,
      maxLife: this.particleLifetime,
      colorPhase: Math.random(),
      trail: [],
    };
  }

  private lerpColor(t: number): { r: number; g: number; b: number } {
    const colors = [
      { r: 0, g: 245, b: 212 },
      { r: 247, g: 37, b: 133 },
      { r: 67, g: 97, b: 238 },
    ];
    const phase = t % 1;
    const segment = Math.floor(phase * (colors.length - 1));
    const segmentT = (phase * (colors.length - 1)) % 1;
    const c1 = colors[Math.min(segment, colors.length - 1)];
    const c2 = colors[Math.min(segment + 1, colors.length - 1)];
    return {
      r: c1.r + (c2.r - c1.r) * segmentT,
      g: c1.g + (c2.g - c1.g) * segmentT,
      b: c1.b + (c2.b - c1.b) * segmentT,
    };
  }

  private sampleField(x: number, y: number): { vx: number; vy: number } {
    let totalVx = 0;
    let totalVy = 0;
    let totalWeight = 0;

    for (const cp of this.controlPoints) {
      const dx = x - cp.x;
      const dy = y - cp.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist > cp.radius * 3) continue;

      const radiusSq = cp.radius * cp.radius;
      const influence = Math.exp(-distSq / (radiusSq * 0.5));

      const angleRad = (cp.angle * Math.PI) / 180;
      const baseVx = Math.cos(angleRad);
      const baseVy = Math.sin(angleRad);

      const perpX = -dy / (dist || 1);
      const perpY = dx / (dist || 1);
      const swirl = 0.6;
      const dirX = baseVx + perpX * swirl;
      const dirY = baseVy + perpY * swirl;
      const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

      const weight = influence * cp.strength;
      totalVx += (dirX / len) * weight;
      totalVy += (dirY / len) * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      totalVx /= totalWeight;
      totalVy /= totalWeight;
    } else {
      totalVx = 1;
      totalVy = 0;
    }

    const mag = Math.sqrt(totalVx * totalVx + totalVy * totalVy) || 1;
    return {
      vx: (totalVx / mag) * this.particleSpeed,
      vy: (totalVy / mag) * this.particleSpeed,
    };
  }

  update(dt: number): ParticleData[] {
    if (!this.isPlaying) {
      const result: ParticleData[] = [];
      for (const p of this.particles) {
        const lifeRatio = p.life / p.maxLife;
        const colorT = Date.now() / 3000 + p.colorPhase;
        const color = this.lerpColor(colorT);
        result.push({
          x: p.x,
          y: p.y,
          r: color.r,
          g: color.g,
          b: color.b,
          a: lifeRatio,
          trail: [...p.trail],
        });
      }
      this.eventBus.emit('particles:update', result);
      this.eventBus.emit('particles:count', this.particles.length);
      return result;
    }

    if (this.particles.length < this.initialParticles && this.particles.length === 0) {
      for (let i = 0; i < this.initialParticles; i++) {
        this.particles.push(this.createParticle(0, (i / this.initialParticles) * this.canvasHeight));
      }
    }

    const toAdd = Math.min(this.currentParticlesPerFrame, this.maxParticles - this.particles.length);
    for (let i = 0; i < toAdd; i++) {
      this.particles.push(this.createParticle(0, Math.random() * this.canvasHeight));
    }

    const alive: Particle[] = [];
    const result: ParticleData[] = [];

    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      const field = this.sampleField(p.x, p.y);
      p.vx = field.vx;
      p.vy = field.vy;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) {
        p.x = 0;
        p.vx = Math.abs(p.vx);
      } else if (p.x > this.canvasWidth) {
        p.x = this.canvasWidth;
        p.vx = -Math.abs(p.vx);
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy = Math.abs(p.vy);
      } else if (p.y > this.canvasHeight) {
        p.y = this.canvasHeight;
        p.vy = -Math.abs(p.vy);
      }

      p.trail.push({ x: p.x, y: p.y });
      const maxTrail = 16;
      if (p.trail.length > maxTrail) {
        p.trail.shift();
      }

      const lifeRatio = p.life / p.maxLife;
      const colorT = Date.now() / 3000 + p.colorPhase;
      const color = this.lerpColor(colorT);

      alive.push(p);
      result.push({
        x: p.x,
        y: p.y,
        r: color.r,
        g: color.g,
        b: color.b,
        a: lifeRatio,
        trail: [...p.trail],
      });
    }

    this.particles = alive;
    this.eventBus.emit('particles:update', result);
    this.eventBus.emit('particles:count', this.particles.length);
    return result;
  }
}
