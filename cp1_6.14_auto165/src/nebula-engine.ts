export interface NebulaParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  layerIndex: number;
  driftX: number;
  driftY: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
  size: number;
}

export interface StarParticle {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  blinkSpeed: number;
  blinkPhase: number;
}

const NEBULA_COLORS = [
  { r: 10, g: 10, b: 46 },
  { r: 59, g: 7, b: 100 },
  { r: 112, g: 26, b: 117 }
];

const LAYER_COUNT = 4;
const PARTICLES_PER_LAYER = 80;
const STAR_COUNT = 180;

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    let n: number;
    let q: number;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = p[i];
      p[i] = p[n];
      p[n] = q;
    }

    for (let i = 0; i < 256; i++) {
      p[256 + i] = p[i];
    }

    return p;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;

    const x1 = this.lerp(
      this.grad(this.permutation[A], x, y),
      this.grad(this.permutation[B], x - 1, y),
      u
    );
    const x2 = this.lerp(
      this.grad(this.permutation[A + 1], x, y - 1),
      this.grad(this.permutation[B + 1], x - 1, y - 1),
      u
    );

    return (this.lerp(x1, x2, v) + 1) / 2;
  }

  public octaveNoise2D(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

export class NebulaEngine {
  private width: number;
  private height: number;
  public nebulaParticles: NebulaParticle[] = [];
  public starParticles: StarParticle[] = [];
  private time: number = 0;
  private colorPhase: number = 0;
  private perlin: PerlinNoise;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.perlin = new PerlinNoise(Date.now());
    this.initNebulaParticles();
    this.initStarParticles();
  }

  private initNebulaParticles(): void {
    this.nebulaParticles = [];
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      for (let i = 0; i < PARTICLES_PER_LAYER; i++) {
        const colorIndex = layer % NEBULA_COLORS.length;
        const color = NEBULA_COLORS[colorIndex];
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        this.nebulaParticles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          radius: 120 + Math.random() * 200,
          color: { r: color.r, g: color.g, b: color.b },
          alpha: 0.1 + Math.random() * 0.2,
          layerIndex: layer,
          driftX: (Math.random() - 0.5) * 0.08,
          driftY: (Math.random() - 0.5) * 0.08,
          noiseOffsetX: Math.random() * 100,
          noiseOffsetY: Math.random() * 100,
          size: 0.8 + Math.random() * 0.6
        });
      }
    }
  }

  private initStarParticles(): void {
    this.starParticles = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.starParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        alpha: 0.3 + Math.random() * 0.7,
        blinkSpeed: 0.5 + Math.random() * 2.5,
        blinkPhase: Math.random() * Math.PI * 2
      });
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const p of this.nebulaParticles) {
      if (p.x > this.width) p.x = Math.random() * this.width;
      if (p.y > this.height) p.y = Math.random() * this.height;
      p.baseX = p.x;
      p.baseY = p.y;
    }
    for (const s of this.starParticles) {
      if (s.x > this.width) s.x = Math.random() * this.width;
      if (s.y > this.height) s.y = Math.random() * this.height;
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.colorPhase += deltaTime * 0.08;

    const timeScale = 0.0008;

    for (const p of this.nebulaParticles) {
      const noiseX = this.perlin.octaveNoise2D(
        p.noiseOffsetX + p.baseX * 0.0018 + this.time * timeScale,
        p.noiseOffsetY + p.baseY * 0.0018,
        3,
        0.5
      );

      const noiseY = this.perlin.octaveNoise2D(
        p.noiseOffsetY + p.baseY * 0.0018 + this.time * timeScale * 0.7,
        p.noiseOffsetX + p.baseX * 0.0018,
        3,
        0.5
      );

      p.x = p.baseX + (noiseX - 0.5) * 120 + Math.sin(this.time * 0.2 + p.noiseOffsetX) * 8;
      p.y = p.baseY + (noiseY - 0.5) * 120 + Math.cos(this.time * 0.15 + p.noiseOffsetY) * 8;

      p.x += this.time * p.driftX * 60;
      p.y += this.time * p.driftY * 60;

      p.x = ((p.x % this.width) + this.width) % this.width;
      p.y = ((p.y % this.height) + this.height) % this.height;

      const colorT = (Math.sin(this.colorPhase + p.layerIndex * 1.2) + 1) / 2;
      const ci1 = p.layerIndex % NEBULA_COLORS.length;
      const ci2 = (ci1 + 1) % NEBULA_COLORS.length;
      const c1 = NEBULA_COLORS[ci1];
      const c2 = NEBULA_COLORS[ci2];
      p.color.r = Math.round(c1.r + (c2.r - c1.r) * colorT);
      p.color.g = Math.round(c1.g + (c2.g - c1.g) * colorT);
      p.color.b = Math.round(c1.b + (c2.b - c1.b) * colorT);
    }

    for (const s of this.starParticles) {
      s.blinkPhase += deltaTime * s.blinkSpeed;
      s.alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(s.blinkPhase));
    }
  }

  public getLocalDensity(x: number, y: number, radius: number = 120): number {
    let totalAlpha = 0;
    for (const p of this.nebulaParticles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + p.radius * 0.5) {
        const influence = 1 - Math.min(1, dist / (radius + p.radius * 0.5));
        totalAlpha += p.alpha * influence;
      }
    }
    return Math.min(1, totalAlpha / 8);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      const layerParticles = this.nebulaParticles.filter(p => p.layerIndex === layer);
      for (const p of layerParticles) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * p.size);
        gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`);
        gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const s of this.starParticles) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      ctx.fill();
      if (s.radius > 1.5) {
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 3);
        glow.addColorStop(0, `rgba(255, 255, 255, ${s.alpha * 0.3})`);
        glow.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
