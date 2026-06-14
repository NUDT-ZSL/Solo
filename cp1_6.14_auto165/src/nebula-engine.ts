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
  noiseOffset: number;
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

export class NebulaEngine {
  private width: number;
  private height: number;
  public nebulaParticles: NebulaParticle[] = [];
  public starParticles: StarParticle[] = [];
  private time: number = 0;
  private colorPhase: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
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
          driftX: (Math.random() - 0.5) * 0.15,
          driftY: (Math.random() - 0.5) * 0.15,
          noiseOffset: Math.random() * 1000,
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

    for (const p of this.nebulaParticles) {
      const noiseVal = this.perlinNoise(
        p.baseX * 0.0015 + this.time * 0.00008 + p.noiseOffset,
        p.baseY * 0.0015 + p.noiseOffset * 0.5
      );
      const noiseVal2 = this.perlinNoise(
        p.baseY * 0.0015 + this.time * 0.0001 + p.noiseOffset * 0.3,
        p.baseX * 0.0015 + p.noiseOffset * 0.7
      );

      p.x = p.baseX + Math.cos(noiseVal * Math.PI * 2) * 40 + this.time * p.driftX * 60;
      p.y = p.baseY + Math.sin(noiseVal2 * Math.PI * 2) * 40 + this.time * p.driftY * 60;

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
    let count = 0;
    let totalAlpha = 0;
    for (const p of this.nebulaParticles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + p.radius * 0.5) {
        const influence = 1 - Math.min(1, dist / (radius + p.radius * 0.5));
        totalAlpha += p.alpha * influence;
        count++;
      }
    }
    return Math.min(1, totalAlpha / 8);
  }

  private perlinNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.hash(xi, yi);
    const ab = this.hash(xi, yi + 1);
    const ba = this.hash(xi + 1, yi);
    const bb = this.hash(xi + 1, yi + 1);

    const x1 = this.lerp(aa, ba, u);
    const x2 = this.lerp(ab, bb, u);

    return this.lerp(x1, x2, v);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return ((h & 0xffffffff) / 0xffffffff + 1) / 2;
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
