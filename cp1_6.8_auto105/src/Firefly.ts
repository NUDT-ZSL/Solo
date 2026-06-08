export interface FireflyData {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  baseSpeed: number;
  phase: number;
  brightness: number;
  collected: boolean;
  disappearing: boolean;
  disappearTimer: number;
  size: number;
  turnRate: number;
  evadeStrength: number;
  wanderAngle: number;
  wanderTimer: number;
}

function angleLerp(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export class FireflyManager {
  private fireflies: FireflyData[] = [];
  private width: number;
  private height: number;
  private nextId = 0;
  private spawnTimer = 0;
  private maxCount = 12;
  private spawnInterval = 2.2;
  private time = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  update(dt: number, spriteX: number, spriteY: number): FireflyData[] {
    this.time += dt;
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.spawnInterval && this.getActiveCount() < this.maxCount) {
      this.spawn();
      this.spawnTimer = 0;
      this.spawnInterval = 1.8 + Math.random() * 1.4;
    }

    for (const f of this.fireflies) {
      if (f.collected) continue;

      if (f.disappearing) {
        f.disappearTimer += dt;
        if (f.disappearTimer >= 0.4) {
          f.collected = true;
        }
        continue;
      }

      f.wanderTimer -= dt;
      if (f.wanderTimer <= 0) {
        f.wanderAngle += (Math.random() - 0.5) * Math.PI * 0.8;
        f.wanderTimer = 0.3 + Math.random() * 0.6;
      }
      f.angle = angleLerp(f.angle, f.angle + f.wanderAngle * dt * f.turnRate, 0.3);

      const dx = f.x - spriteX;
      const dy = f.y - spriteY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130 && dist > 1) {
        const evadeAngle = Math.atan2(dy, dx);
        const evadeForce = ((130 - dist) / 130) * f.evadeStrength;
        f.angle = angleLerp(f.angle, evadeAngle, evadeForce * dt * 3);
        f.speed = f.baseSpeed + 50 * ((130 - dist) / 130);
      } else {
        f.speed += (f.baseSpeed - f.speed) * 2 * dt;
      }

      const margin = 60;
      if (f.x < margin) f.angle = angleLerp(f.angle, 0, 0.08);
      if (f.x > this.width - margin) f.angle = angleLerp(f.angle, Math.PI, 0.08);
      if (f.y < margin) f.angle = angleLerp(f.angle, Math.PI * 0.5, 0.08);
      if (f.y > this.height - margin) f.angle = angleLerp(f.angle, -Math.PI * 0.5, 0.08);

      f.x += Math.cos(f.angle) * f.speed * dt;
      f.y += Math.sin(f.angle) * f.speed * dt;

      f.x = Math.max(10, Math.min(this.width - 10, f.x));
      f.y = Math.max(10, Math.min(this.height - 10, f.y));

      f.brightness = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(f.phase + this.time * 3.5));
    }

    this.fireflies = this.fireflies.filter(f => !f.collected);
    return this.fireflies;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const f of this.fireflies) {
      if (f.collected) continue;

      const alpha = f.disappearing
        ? Math.max(0, 1 - f.disappearTimer / 0.4)
        : f.brightness;
      const scale = f.disappearing
        ? 1 + f.disappearTimer * 3
        : 1 + f.brightness * 0.15;
      const radius = f.size * scale;

      const outerGlow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius * 4);
      outerGlow.addColorStop(0, `rgba(255,230,100,${alpha * 0.5})`);
      outerGlow.addColorStop(0.4, `rgba(255,210,60,${alpha * 0.15})`);
      outerGlow.addColorStop(1, 'rgba(255,180,0,0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(f.x, f.y, radius * 4, 0, Math.PI * 2);
      ctx.fill();

      const coreGlow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
      coreGlow.addColorStop(0, `rgba(255,255,220,${alpha})`);
      coreGlow.addColorStop(0.6, `rgba(255,230,100,${alpha * 0.7})`);
      coreGlow.addColorStop(1, `rgba(255,200,50,${alpha * 0.2})`);
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  checkCollision(x: number, y: number, radius: number): FireflyData | null {
    for (const f of this.fireflies) {
      if (f.collected || f.disappearing) continue;
      const dx = f.x - x;
      const dy = f.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + f.size + 8) {
        return f;
      }
    }
    return null;
  }

  collectFirefly(firefly: FireflyData): void {
    firefly.disappearing = true;
    firefly.disappearTimer = 0;
  }

  private spawn(): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    switch (side) {
      case 0: x = Math.random() * this.width; y = -20; break;
      case 1: x = this.width + 20; y = Math.random() * this.height; break;
      case 2: x = Math.random() * this.width; y = this.height + 20; break;
      default: x = -20; y = Math.random() * this.height; break;
    }

    this.fireflies.push({
      id: this.nextId++,
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      speed: 55 + Math.random() * 35,
      baseSpeed: 55 + Math.random() * 35,
      phase: Math.random() * Math.PI * 2,
      brightness: 0.5,
      collected: false,
      disappearing: false,
      disappearTimer: 0,
      size: 5 + Math.random() * 3,
      turnRate: 1.5 + Math.random() * 2.5,
      evadeStrength: 0.25 + Math.random() * 0.35,
      wanderAngle: 0,
      wanderTimer: Math.random() * 0.5,
    });
  }

  getActiveCount(): number {
    return this.fireflies.filter(f => !f.collected && !f.disappearing).length;
  }

  reset(): void {
    this.fireflies = [];
    this.nextId = 0;
    this.spawnTimer = 0;
    this.time = 0;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}
