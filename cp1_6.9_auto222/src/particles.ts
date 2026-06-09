import { WaveRenderer } from './wave';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  initialSize: number;
  color: [number, number, number];
  alpha: number;
  age: number;
  lifetime: number;
  type: 'float' | 'burst' | 'ambient';
  wavePhase: number;
  waveAmp: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 200;
  private spawnTimer: number = 0;
  private spawnInterval: number = 50;
  private ctx: CanvasRenderingContext2D;
  private wave: WaveRenderer;
  private width: number = 0;
  private height: number = 0;

  constructor(_canvas: HTMLCanvasElement, wave: WaveRenderer) {
    const ctx = _canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.wave = wave;
    this.resize();
  }

  public resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  public spawnAmbientParticles(count: number): void {
    const wallHeight = this.height * 0.6;
    const wallTop = (this.height - wallHeight) / 2;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const side = Math.random() < 0.5 ? -1 : 1;
      const depth = Math.random();
      const perspective = 1 / (1 + depth * 2.5);
      const yRatio = 0.2 + Math.random() * 0.6;
      const baseX = side === -1
        ? this.width * (0.25 + 0.25 * (1 - perspective))
        : this.width * (0.75 - 0.25 * (1 - perspective));

      const size = (2 + Math.random() * 3) * perspective;
      const color = this.wave.sampleWaveColor(yRatio);

      this.particles.push({
        x: baseX + (Math.random() - 0.5) * 30 * perspective,
        y: wallTop + wallHeight * (1 - yRatio) + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.3 + Math.random() * 0.5),
        size,
        initialSize: size,
        color,
        alpha: 0.8,
        age: 0,
        lifetime: 2000 + Math.random() * 500,
        type: 'ambient',
        wavePhase: Math.random() * Math.PI * 2,
        waveAmp: 1 + Math.random() * 2,
      });
    }
  }

  public spawnBurstParticles(points: { x: number; y: number; color: [number, number, number] }[]): void {
    for (const pt of points) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      const size = 3 + Math.random() * 4;
      const color = this.wave.getRandomWarmColor();

      this.particles.push({
        x: pt.x,
        y: pt.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size,
        initialSize: size,
        color: color,
        alpha: 1,
        age: 0,
        lifetime: 800,
        type: 'burst',
        wavePhase: 0,
        waveAmp: 0,
      });
    }
  }

  public update(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const spawnCount = 1;
      this.spawnAmbientParticles(spawnCount);
    }

    const pulsePoints = this.wave.getPulseSpawnPoints();
    if (pulsePoints.length > 0) {
      this.spawnBurstParticles(pulsePoints);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.age / p.lifetime;

      if (p.type === 'ambient') {
        const wave = Math.sin(p.age * 0.003 + p.wavePhase) * p.waveAmp;
        p.x += p.vx + wave * dt * 0.01;
        p.y += p.vy * dt * 0.05;

        const fadeStart = 0.7;
        if (lifeRatio > fadeStart) {
          p.alpha = 1 - (lifeRatio - fadeStart) / (1 - fadeStart);
        }
      } else if (p.type === 'burst') {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vy += 0.008 * dt;
        p.size = p.initialSize * (1 - lifeRatio * 0.6);
        p.alpha = 1 - lifeRatio;
      } else if (p.type === 'float') {
        p.x += p.vx * dt * 0.02;
        p.y += p.vy * dt * 0.02;
        const fadeStart = 0.6;
        if (lifeRatio > fadeStart) {
          p.alpha = 1 - (lifeRatio - fadeStart) / (1 - fadeStart);
        }
      }
    }
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      const glowSize = p.size * 3;
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, glowSize
      );

      const [r, g, b] = p.color;
      const a = Math.max(0, Math.min(1, p.alpha));

      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${a * 0.5})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.9})`;
      ctx.fill();
    }

    ctx.restore();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
