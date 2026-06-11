export enum ParticleType {
  TRAIL = 'trail',
  EXPLOSION = 'explosion',
  FRAGMENT = 'fragment',
  SPARK = 'spark'
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: ParticleType;
  rotation: number;
  rotationSpeed: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.color = '#ffffff';
    this.size = 2;
    this.type = ParticleType.SPARK;
    this.rotation = 0;
    this.rotationSpeed = 0;
  }

  init(x: number, y: number, vx: number, vy: number, life: number, color: string, size: number, type: ParticleType): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
  }

  update(deltaTime: number): boolean {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.life -= deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;

    if (this.type === ParticleType.EXPLOSION || this.type === ParticleType.FRAGMENT) {
      this.vx *= 0.98;
      this.vy *= 0.98;
    }

    return this.life > 0;
  }

  render(ctx: CanvasRenderingContext2D, quality: number): void {
    const t = this.life / this.maxLife;
    const alpha = t;

    let sizeCurve: number;
    if (this.type === ParticleType.TRAIL) {
      sizeCurve = t * t * (3 - 2 * t);
    } else {
      sizeCurve = 0.5 + 0.5 * (1 - Math.pow(1 - t, 2));
    }

    let size = this.size * sizeCurve;
    if (quality === 1) {
      size *= 0.7;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (quality >= 2) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.type === ParticleType.TRAIL ? 4 : 6;
    } else if (quality === 1 && this.type !== ParticleType.TRAIL) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 3;
    }

    const px = Math.floor(this.x);
    const py = Math.floor(this.y);
    const s = quality === 0 ? 1 : Math.max(1, Math.floor(size));

    if (this.type === ParticleType.FRAGMENT && quality >= 2) {
      ctx.translate(px, py);
      ctx.rotate(this.rotation);
      ctx.fillRect(-s, -s / 2, s * 2, s);
    } else {
      ctx.fillRect(px - s, py - s, s * 2, s * 2);
    }

    ctx.restore();
  }

  isExpired(): boolean {
    return this.life <= 0;
  }
}

export class ParticleSystem {
  private particles: Particle[];
  private pool: Particle[];
  private maxParticles: number;
  private trailEmitCounter: number;

  constructor(maxParticles: number = 300) {
    this.maxParticles = maxParticles;
    this.particles = [];
    this.pool = [];
    this.trailEmitCounter = 0;

    for (let i = 0; i < maxParticles; i++) {
      this.pool.push(new Particle());
    }
  }

  private getParticle(): Particle | null {
    if (this.particles.length >= this.maxParticles) {
      return null;
    }
    if (this.pool.length > 0) {
      const p = this.pool.pop()!;
      this.particles.push(p);
      return p;
    }
    return null;
  }

  emitTrail(x: number, y: number, color: string, quality: number): void {
    const emitRate = quality >= 2 ? 1 : (quality === 1 ? 0.75 : 0.5);
    this.trailEmitCounter += emitRate;

    while (this.trailEmitCounter >= 1) {
      this.trailEmitCounter -= 1;
      const p = this.getParticle();
      if (p) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 20;
        p.init(
          x + (Math.random() - 0.5) * 4,
          y + (Math.random() - 0.5) * 4,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.3 + Math.random() * 0.2,
          color,
          2 + Math.random() * 2,
          ParticleType.TRAIL
        );
      }
    }
  }

  emitExplosion(x: number, y: number, count: number, colors: string[], quality: number): void {
    const actualCount = Math.floor(count * (quality >= 2 ? 1 : (quality === 1 ? 0.8 : 0.6)));

    for (let i = 0; i < actualCount; i++) {
      const p = this.getParticle();
      if (p) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 150;
        const color = colors[Math.floor(Math.random() * colors.length)];
        p.init(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.5 + Math.random() * 0.5,
          color,
          3 + Math.random() * 4,
          ParticleType.EXPLOSION
        );
      }
    }

    const fragmentCount = Math.floor(actualCount * 0.5);
    for (let i = 0; i < fragmentCount; i++) {
      const p = this.getParticle();
      if (p) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 200;
        const color = colors[Math.floor(Math.random() * colors.length)];
        p.init(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.8 + Math.random() * 0.8,
          color,
          2 + Math.random() * 3,
          ParticleType.FRAGMENT
        );
      }
    }

    const sparkCount = Math.floor(actualCount * 0.3);
    for (let i = 0; i < sparkCount; i++) {
      const p = this.getParticle();
      if (p) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 250;
        p.init(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.3 + Math.random() * 0.3,
          '#ffffff',
          1 + Math.random() * 2,
          ParticleType.SPARK
        );
      }
    }
  }

  emitHit(x: number, y: number, quality: number): void {
    const count = Math.floor(8 * (quality >= 2 ? 1 : (quality === 1 ? 0.75 : 0.5)));
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (p) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 120;
        p.init(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.2 + Math.random() * 0.2,
          '#ffffaa',
          2 + Math.random() * 2,
          ParticleType.SPARK
        );
      }
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.update(deltaTime)) {
        this.particles.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const quality = this.getQuality();
    let drawStep: number;
    if (quality >= 2) {
      drawStep = 1;
    } else if (quality === 1) {
      drawStep = 1;
    } else {
      drawStep = this.particles.length > 250 ? 3 : 2;
    }

    for (let i = 0; i < this.particles.length; i += drawStep) {
      this.particles[i].render(ctx, quality);
    }
  }

  getQuality(): number {
    const count = this.particles.length;
    if (count < 100) {
      return 2;
    } else if (count <= 200) {
      return 1;
    } else {
      return 0;
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    for (const p of this.particles) {
      this.pool.push(p);
    }
    this.particles = [];
  }

  getPoolAvailable(): number {
    return this.pool.length;
  }
}

export class StarField {
  private stars: { x: number; y: number; size: number; brightness: number; twinkleSpeed: number; twinklePhase: number }[];
  private width: number;
  private height: number;

  constructor(width: number, height: number, count: number = 100) {
    this.width = width;
    this.height = height;
    this.stars = [];

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() < 0.8 ? 1 : 2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const star of this.stars) {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    }
  }

  update(deltaTime: number): void {
    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed * deltaTime;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 2
    );
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#0f0a1e');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      const px = Math.floor(star.x);
      const py = Math.floor(star.y);
      ctx.fillRect(px, py, star.size, star.size);
    }

    ctx.restore();
  }
}
