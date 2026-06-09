export type BrushMode = 'ink' | 'color';

export interface ParticleSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  age: number;
  isSplash: boolean;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  age: number;
  isSplash: boolean;

  constructor(data: Omit<ParticleSnapshot, 'age'> & { age?: number }) {
    this.x = data.x;
    this.y = data.y;
    this.vx = data.vx;
    this.vy = data.vy;
    this.size = data.size;
    this.baseSize = data.baseSize;
    this.alpha = data.alpha;
    this.baseAlpha = data.baseAlpha;
    this.color = data.color;
    this.age = data.age ?? 0;
    this.isSplash = data.isSplash;
  }

  snapshot(): ParticleSnapshot {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      size: this.size,
      baseSize: this.baseSize,
      alpha: this.alpha,
      baseAlpha: this.baseAlpha,
      color: this.color,
      age: this.age,
      isSplash: this.isSplash
    };
  }

  static fromSnapshot(s: ParticleSnapshot): Particle {
    return new Particle({ ...s });
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private history: ParticleSnapshot[][] = [];
  private maxParticles = 3000;
  private mode: BrushMode = 'ink';
  private readonly colorInkColors = ['#e74c3c', '#3498db', '#2ecc71'];

  getMode(): BrushMode {
    return this.mode;
  }

  setMode(mode: BrushMode): void {
    this.mode = mode;
  }

  toggleMode(): BrushMode {
    this.mode = this.mode === 'ink' ? 'color' : 'ink';
    return this.mode;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getCount(): number {
    return this.particles.length;
  }

  private getRandomInkColor(): string {
    const gray = Math.floor(Math.random() * (136 - 51 + 1)) + 51;
    return `rgb(${gray}, ${gray}, ${gray})`;
  }

  private getRandomColorInk(): string {
    return this.colorInkColors[Math.floor(Math.random() * this.colorInkColors.length)];
  }

  saveState(): void {
    this.history.push(this.particles.map(p => p.snapshot()));
    if (this.history.length > 20) {
      this.history.shift();
    }
  }

  undo(): boolean {
    if (this.history.length === 0) return false;
    const prev = this.history.pop()!;
    this.particles = prev.map(s => Particle.fromSnapshot(s));
    return true;
  }

  clearHistory(): void {
    this.history = [];
  }

  spawnParticles(
    centerX: number,
    centerY: number,
    count: number,
    pressureMultiplier: number = 1.0,
    directionAngle: number = 0
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetRadius = 5 + Math.random() * 10;
      const x = centerX + Math.cos(offsetAngle) * offsetRadius;
      const y = centerY + Math.sin(offsetAngle) * offsetRadius;

      const angleSpread = (30 * Math.PI) / 180;
      const particleAngle = directionAngle + (Math.random() - 0.5) * 2 * angleSpread;
      const speed = 0.5 + Math.random() * 1.0;
      const vx = Math.cos(particleAngle) * speed;
      const vy = Math.sin(particleAngle) * speed;

      const baseSize = 4 + Math.random() * 8;
      const sizeMultiplier = 1.0 + Math.random() * (pressureMultiplier - 1.0);
      const size = baseSize * sizeMultiplier;

      const baseAlpha = 0.6;
      const alphaMultiplier = Math.min(1.0 + Math.random() * 0.5 * (pressureMultiplier - 1.0), 1.0);
      const alpha = Math.min(baseAlpha * (1.0 + (alphaMultiplier - 1.0) * 2), 1.0);

      const color = this.mode === 'ink' ? this.getRandomInkColor() : this.getRandomColorInk();

      this.particles.push(
        new Particle({
          x,
          y,
          vx,
          vy,
          size,
          baseSize,
          alpha,
          baseAlpha,
          color,
          isSplash: false
        })
      );
    }
  }

  spawnSplashParticles(
    x: number,
    y: number,
    directionAngle: number,
    count: number = 3
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const spreadAngle = Math.PI / 3;
      const angle = directionAngle + (Math.random() - 0.5) * spreadAngle;
      const speed = 0.3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const offsetRadius = 2 + Math.random() * 4;
      const px = x + Math.cos(angle) * offsetRadius;
      const py = y + Math.sin(angle) * offsetRadius;

      const color = this.mode === 'ink' ? '#555555' : this.getRandomColorInk();

      this.particles.push(
        new Particle({
          x: px,
          y: py,
          vx,
          vy,
          size: 1 + Math.random(),
          baseSize: 1.5,
          alpha: 0.2,
          baseAlpha: 0.2,
          color,
          isSplash: true
        })
      );
    }
  }

  update(): void {
    const particles = this.particles;
    const n = particles.length;

    for (let i = 0; i < n; i++) {
      const p = particles[i];

      if (p.isSplash) {
        p.x += p.vx + (Math.random() - 0.5) * 0.2;
        p.y += p.vy + (Math.random() - 0.5) * 0.2;
        p.alpha -= 0.015;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.alpha -= 0.02;
        p.size += 0.05;
      }

      p.age++;
    }

    for (let i = 0; i < n; i++) {
      const a = particles[i];
      if (a.alpha <= 0 || a.isSplash) continue;

      for (let j = i + 1; j < n; j++) {
        const b = particles[j];
        if (b.alpha <= 0 || b.isSplash) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 64) {
          const dist = Math.sqrt(distSq) || 0.01;
          if (dist < 8) {
            const tempVx = a.vx;
            const tempVy = a.vy;
            a.vx = b.vx;
            a.vy = b.vy;
            b.vx = tempVx;
            b.vy = tempVy;
          }
        }

        if (distSq < 36 && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = 0.01;
          const nx = dx / dist;
          const ny = dy / dist;
          a.vx += nx * force;
          a.vy += ny * force;
          b.vx -= nx * force;
          b.vy -= ny * force;
        }
      }
    }

    this.particles = particles.filter(p => p.alpha > 0.01);
  }

  clear(): void {
    this.saveState();
    this.particles = [];
  }

  hardClear(): void {
    this.particles = [];
    this.history = [];
  }
}
