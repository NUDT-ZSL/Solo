export interface FlowerBud {
  x: number;
  y: number;
  color: string;
  colorInner: string;
  budRadius: number;
  bloomProgress: number;
  bloomed: boolean;
  createdAt: number;
  bloomDelay: number;
  particleSpawned: boolean;
}

export interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

const FLOWER_COLORS = [
  { outer: '#ff69b4', inner: '#ffb6c1' },
  { outer: '#9370db', inner: '#d8bfd8' },
  { outer: '#6495ed', inner: '#b0c4de' },
  { outer: '#fffafa', inner: '#f0f8ff' },
];

const MAX_PARTICLES = 200;
const PETAL_LIFETIME = 3000;

export class BloomManager {
  buds: FlowerBud[] = [];
  petals: Petal[] = [];
  ripples: Ripple[] = [];
  private flowerDensity = 0.5;
  private flowerCount = 0;

  setFlowerDensity(density: number) {
    this.flowerDensity = density;
  }

  getFlowerDensity() {
    return this.flowerDensity;
  }

  getFlowerCount() {
    return this.flowerCount;
  }

  shouldCreateBud(): boolean {
    return Math.random() < this.flowerDensity * 0.15;
  }

  createBud(x: number, y: number) {
    const colorSet = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
    const bud: FlowerBud = {
      x,
      y,
      color: colorSet.outer,
      colorInner: colorSet.inner,
      budRadius: 3,
      bloomProgress: 0,
      bloomed: false,
      createdAt: performance.now(),
      bloomDelay: 1000 + Math.random() * 2000,
      particleSpawned: false,
    };
    this.buds.push(bud);
    this.flowerCount++;
  }

  addRipple(x: number, y: number, color: string = 'rgba(144,238,144,0.5)') {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 40 + Math.random() * 20,
      alpha: 0.6,
      color,
    });
  }

  addGoldenFlash() {
    this.ripples.push({
      x: -1,
      y: -1,
      radius: 0,
      maxRadius: 9999,
      alpha: 0.15,
      color: 'rgba(255,215,0,0.3)',
    });
  }

  private spawnPetals(bud: FlowerBud) {
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      if (this.petals.length >= MAX_PARTICLES) {
        this.petals.shift();
      }
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 0.3 + Math.random() * 0.8;
      this.petals.push({
        x: bud.x,
        y: bud.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? bud.color : bud.colorInner,
        alpha: 1,
        life: 0,
        maxLife: PETAL_LIFETIME + Math.random() * 1000,
      });
    }
  }

  update(dt: number, now: number) {
    for (const bud of this.buds) {
      if (bud.bloomed) continue;
      const elapsed = now - bud.createdAt;
      if (elapsed < bud.bloomDelay) continue;

      bud.bloomProgress = Math.min(1, bud.bloomProgress + dt * 0.001 * 0.8);
      bud.budRadius = 3 + bud.bloomProgress * 7;

      if (bud.bloomProgress >= 1 && !bud.particleSpawned) {
        bud.bloomed = true;
        bud.particleSpawned = true;
        this.spawnPetals(bud);
        this.addGoldenFlash();
      }
    }

    for (const petal of this.petals) {
      petal.life += dt;
      petal.x += petal.vx * dt * 0.06;
      petal.y += petal.vy * dt * 0.06;
      petal.vy += 0.003 * dt;
      petal.vx *= 0.999;
      petal.rotation += petal.rotationSpeed;
      const lifeRatio = petal.life / petal.maxLife;
      petal.alpha = 1 - lifeRatio;
      petal.size *= 0.9997;
    }

    this.petals = this.petals.filter((p) => p.life < p.maxLife);

    for (const ripple of this.ripples) {
      ripple.radius += dt * 0.08;
      ripple.alpha -= dt * 0.001;
    }
    this.ripples = this.ripples.filter((r) => r.alpha > 0);
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    this.drawRipples(ctx);
    this.drawBuds(ctx);
    this.drawPetals(ctx);
  }

  private drawRipples(ctx: CanvasRenderingContext2D) {
    for (const ripple of this.ripples) {
      ctx.save();
      ctx.beginPath();
      if (ripple.x === -1) {
        ctx.fillStyle = ripple.color;
        ctx.globalAlpha = Math.max(0, ripple.alpha);
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      } else {
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ripple.color;
        ctx.globalAlpha = Math.max(0, ripple.alpha);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawBuds(ctx: CanvasRenderingContext2D) {
    for (const bud of this.buds) {
      ctx.save();
      ctx.translate(bud.x, bud.y);

      const petalCount = 5;
      const petalLength = bud.budRadius;
      const petalWidth = bud.budRadius * 0.5;

      if (bud.bloomProgress > 0.1) {
        const openAngle = bud.bloomProgress * Math.PI * 0.4;
        for (let i = 0; i < petalCount; i++) {
          const baseAngle = (Math.PI * 2 * i) / petalCount - Math.PI / 2;
          const angle = baseAngle;

          ctx.save();
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(
            petalLength * 0.5 * bud.bloomProgress,
            0,
            petalLength * bud.bloomProgress,
            petalWidth * bud.bloomProgress,
            0,
            0,
            Math.PI * 2
          );

          const grad = ctx.createRadialGradient(
            petalLength * 0.3,
            0,
            0,
            petalLength * 0.5,
            0,
            petalLength
          );
          grad.addColorStop(0, bud.colorInner);
          grad.addColorStop(1, bud.color);
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.beginPath();
      ctx.arc(0, 0, bud.budRadius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = 1;
      ctx.fill();

      if (!bud.bloomed) {
        const glowPulse = 0.3 + Math.sin(now * 0.003) * 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, bud.budRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${glowPulse})`;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawPetals(ctx: CanvasRenderingContext2D) {
    for (const petal of this.petals) {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.globalAlpha = Math.max(0, petal.alpha);
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = petal.color;
      ctx.fill();

      ctx.shadowColor = 'rgba(255,215,0,0.3)';
      ctx.shadowBlur = 3;
      ctx.fill();
      ctx.restore();
    }
  }
}
