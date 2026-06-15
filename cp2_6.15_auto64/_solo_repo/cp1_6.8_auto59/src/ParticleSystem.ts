interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  targetSize: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  life: number;
  maxLife: number;
  side: 1 | -1;
}

interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private stars: StarParticle[] = [];
  private maxParticles = 300;
  private width = 0;
  private height = 0;
  private frameCount = 0;

  constructor() {
    this.initStars(100);
  }

  private initStars(count: number): void {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(averageVolume: number, frequencyData: Uint8Array): void {
    this.frameCount++;
    const centerY = this.height / 2;
    const spawnRate = Math.floor(2 + averageVolume * 12);

    if (this.particles.length < this.maxParticles) {
      for (let i = 0; i < spawnRate; i++) {
        const side: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
        const binIndex = Math.floor(Math.random() * frequencyData.length * 0.75);
        const freqVal = frequencyData[binIndex] / 255;
        const progress = binIndex / (frequencyData.length * 0.75);

        let r: number, g: number, b: number;
        if (progress < 0.3) {
          r = 255; g = 100 + progress / 0.3 * 140; b = 0;
        } else if (progress < 0.7) {
          const t = (progress - 0.3) / 0.4;
          r = 0; g = 255 - t * 30; b = 50 + t * 77;
        } else {
          const t = (progress - 0.7) / 0.3;
          r = 80 + t * 58; g = 43 - t * 20; b = 180 + t * 45;
        }

        const x = Math.random() * this.width;
        const baseY = centerY + side * (10 + Math.random() * 30);
        const speed = 0.5 + averageVolume * 3;
        const angle = (side === -1 ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - 0.5) * 1.2;

        this.particles.push({
          x,
          y: baseY,
          vx: Math.cos(angle) * speed * (0.5 + freqVal),
          vy: Math.sin(angle) * speed,
          size: 0.5,
          targetSize: 1 + averageVolume * 8 + freqVal * 3,
          r, g, b,
          alpha: 0.6 + freqVal * 0.4,
          life: 0,
          maxLife: 40 + Math.random() * 60,
          side,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;

      const lifeRatio = p.life / p.maxLife;
      const volumeMultiplier = 1 + averageVolume * 2;

      if (averageVolume < 0.15) {
        const pullStrength = (0.15 - averageVolume) * 2;
        p.vx += (this.width / 2 - p.x) * pullStrength * 0.001;
        p.vy += (centerY - p.y) * pullStrength * 0.001;
      } else {
        p.vx *= 1.01;
        p.vy += p.side * 0.02 * volumeMultiplier;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.size += (p.targetSize - p.size) * 0.1;
      p.size = Math.max(0.1, p.size * (1 - lifeRatio * 0.5));
      p.alpha = (1 - lifeRatio) * (0.5 + averageVolume * 0.5);

      if (p.life >= p.maxLife || p.x < -20 || p.x > this.width + 20 ||
          p.y < -20 || p.y > this.height + 20) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderStars(ctx);

    for (const p of this.particles) {
      if (p.alpha <= 0 || p.size <= 0) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.size > 2) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, 1)`);
        gradient.addColorStop(0.4, `rgba(${p.r}, ${p.g}, ${p.b}, 0.6)`);
        gradient.addColorStop(1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else {
        ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    const time = this.frameCount;
    for (const star of this.stars) {
      const sx = star.x * this.width;
      const sy = star.y * this.height;
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
      const alpha = star.alpha * twinkle;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();

      if (star.size > 1) {
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, star.size * 3);
        glow.addColorStop(0, `rgba(200, 220, 255, ${alpha * 0.3})`);
        glow.addColorStop(1, 'rgba(200, 220, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - star.size * 3, sy - star.size * 3, star.size * 6, star.size * 6);
      }

      ctx.restore();
    }

    const drift = 0.00002;
    for (const star of this.stars) {
      star.y += drift;
      star.x += drift * 0.3;
      if (star.y > 1.05) star.y = -0.05;
      if (star.x > 1.05) star.x = -0.05;
    }
  }
}
