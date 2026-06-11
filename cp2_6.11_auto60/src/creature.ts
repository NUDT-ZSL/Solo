import type { AudioParams } from './audioProcessor';
import type { FoodColor, Maze } from './maze';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface CreatureState {
  x: number;
  y: number;
  hp: number;
  size: number;
  color: { h: number; s: number; l: number };
  evolutionLevel: number;
  evolutionCounts: Record<FoodColor, number>;
  pulsePhase: number;
  slowUntil: number;
  particles: Particle[];
}

const EVOLUTION_THRESHOLD = 10;
const MAX_PARTICLES = 200;

export class Creature {
  readonly state: CreatureState;
  private lastHpTick = 0;
  private heading: { x: number; y: number } = { x: 1, y: 0 };

  constructor() {
    this.state = {
      x: 1,
      y: 1,
      hp: 100,
      size: 20,
      color: { h: 200, s: 90, l: 65 },
      evolutionLevel: 0,
      evolutionCounts: { red: 0, blue: 0, gold: 0 },
      pulsePhase: 0,
      slowUntil: 0,
      particles: [],
    };
  }

  reset(): void {
    this.state.x = 1;
    this.state.y = 1;
    this.state.hp = 100;
    this.state.size = 20;
    this.state.color = { h: 200, s: 90, l: 65 };
    this.state.evolutionLevel = 0;
    this.state.evolutionCounts = { red: 0, blue: 0, gold: 0 };
    this.state.pulsePhase = 0;
    this.state.slowUntil = 0;
    this.state.particles.length = 0;
    this.lastHpTick = 0;
    this.heading = { x: 1, y: 0 };
  }

  update(dt: number, params: AudioParams, maze: Maze): void {
    const now = performance.now();

    this.updateAppearance(params);

    const { vx, vy } = this.computeVelocity(params, now);
    this.moveAndCollide(vx, vy, dt, maze);

    this.state.pulsePhase += dt * (params.bpm / 60) * Math.PI * 2;

    this.updateParticles(dt);
    this.emitTrailParticle();

    if (now - this.lastHpTick >= 3000) {
      this.state.hp = Math.max(0, this.state.hp - 1);
      this.lastHpTick = now;
    }
  }

  onAteFood(color: FoodColor): void {
    if (color === 'red') {
      this.state.hp = Math.min(100, this.state.hp + 10);
    }
    this.state.evolutionCounts[color]++;
    if (this.state.evolutionCounts[color] >= EVOLUTION_THRESHOLD) {
      this.state.evolutionCounts[color] -= EVOLUTION_THRESHOLD;
      this.evolve();
    }
  }

  onWallHit(): void {
    this.state.hp = Math.max(0, this.state.hp - 5);
    this.state.slowUntil = performance.now() + 500;
    for (let i = 0; i < 8; i++) {
      this.emitBurstParticle();
    }
  }

  private evolve(): void {
    this.state.evolutionLevel++;
    for (let i = 0; i < 24; i++) {
      this.emitBurstParticle();
    }
  }

  private updateAppearance(params: AudioParams): void {
    this.state.size = 20 + (params.loudness / 100) * 40;

    const freqNorm = Math.max(0, Math.min(1, (params.frequency - 60) / 2000));
    const targetHue = freqNorm < 0.33
      ? 290 + (freqNorm / 0.33) * 30
      : freqNorm < 0.66
        ? 160 + ((freqNorm - 0.33) / 0.33) * 80
        : 40 + ((freqNorm - 0.66) / 0.34) * 110;

    this.state.color.h = this.lerpAngle(this.state.color.h, targetHue, 0.15);
    this.state.color.s = 90;
    this.state.color.l = 55 + this.state.evolutionLevel * 3;
  }

  private computeVelocity(params: AudioParams, now: number): { vx: number; vy: number } {
    const baseSpeed = 0.8 + this.state.evolutionLevel * 0.12;
    const loudFactor = 0.15 + (params.loudness / 100) * 0.85;
    let speed = baseSpeed * loudFactor;

    if (now < this.state.slowUntil) speed *= 0.4;

    if (params.loudness < 5) {
      return { vx: 0, vy: 0 };
    }

    const dirNoise = (params.frequency / 1000) * Math.PI * 2;
    const beatBias = Math.sin(params.bpm) * 0.3;
    const angle = dirNoise + beatBias + this.headingAngle() * 0.5;

    let dx = Math.cos(angle);
    let dy = Math.sin(angle);

    const candidates = [
      [dx, dy],
      [this.heading.x, this.heading.y],
      [1, 0], [0, 1], [-1, 0], [0, -1],
    ];
    for (const [cx, cy] of candidates) {
      const nx = this.state.x + cx * 0.6;
      const ny = this.state.y + cy * 0.6;
      if (!this.wouldHitWall(nx, ny, 0.35)) {
        dx = cx;
        dy = cy;
        break;
      }
    }

    this.heading.x = this.lerp(this.heading.x, dx, 0.3);
    this.heading.y = this.lerp(this.heading.y, dy, 0.3);
    const hm = Math.hypot(this.heading.x, this.heading.y) || 1;

    return {
      vx: (this.heading.x / hm) * speed,
      vy: (this.heading.y / hm) * speed,
    };
  }

  private headingAngle(): number {
    return Math.atan2(this.heading.y, this.heading.x);
  }

  private moveAndCollide(vx: number, vy: number, dt: number, maze: Maze): void {
    const prevX = this.state.x;
    const prevY = this.state.y;
    const nextX = prevX + vx * dt * 60;
    const nextY = prevY + vy * dt * 60;

    if (!this.wouldHitWall(nextX, this.state.y, 0.35)) {
      this.state.x = nextX;
    } else {
      this.triggerWallHit(prevX, prevY, maze);
    }
    if (!this.wouldHitWall(this.state.x, nextY, 0.35)) {
      this.state.y = nextY;
    } else {
      this.triggerWallHit(prevX, prevY, maze);
    }

    const limLo = 0.4;
    const limHi = maze.size - 1.4;
    this.state.x = Math.max(limLo, Math.min(limHi, this.state.x));
    this.state.y = Math.max(limLo, Math.min(limHi, this.state.y));
  }

  private wouldHitWall(x: number, y: number, r: number): boolean {
    const checks = [
      [x - r, y - r], [x + r, y - r],
      [x - r, y + r], [x + r, y + r],
      [x, y],
    ];
    for (const [cx, cy] of checks) {
      if (this.isWallCell(cx, cy)) return true;
    }
    return false;
  }

  private isWallCell(x: number, y: number): boolean {
    const gx = Math.round(x);
    const gy = Math.round(y);
    return (window as unknown as { __mazeRef?: Maze }).__mazeRef?.isWall?.(gx, gy) ?? false;
  }

  private triggerWallHit(_px: number, _py: number, maze: Maze): void {
    const gx = Math.round(this.state.x);
    const gy = Math.round(this.state.y);
    maze.markWallHit(gx, gy);
    this.onWallHit();
  }

  private updateParticles(dt: number): void {
    const arr = this.state.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt * 1000;
      if (p.life <= 0) arr.splice(i, 1);
    }
  }

  private emitTrailParticle(): void {
    if (this.state.particles.length >= MAX_PARTICLES) {
      this.state.particles.shift();
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.02 + Math.random() * 0.05;
    const life = 600 + this.state.evolutionLevel * 80 + Math.random() * 400;
    this.state.particles.push({
      x: this.state.x,
      y: this.state.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life,
      maxLife: life,
      color: `hsl(${this.state.color.h} ${this.state.color.s}% ${this.state.color.l}%)`,
    });
  }

  private emitBurstParticle(): void {
    if (this.state.particles.length >= MAX_PARTICLES) {
      this.state.particles.shift();
    }
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.08 + Math.random() * 0.15;
    const life = 500 + Math.random() * 500;
    this.state.particles.push({
      x: this.state.x,
      y: this.state.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life,
      maxLife: life,
      color: `hsl(${this.state.color.h} ${this.state.color.s}% ${this.state.color.l}%)`,
    });
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return a + diff * t;
  }
}
