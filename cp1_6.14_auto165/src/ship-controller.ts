export interface ShipState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  maxSpeed: number;
}

export interface EngineParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class ShipController {
  public x: number;
  public y: number;
  public angle: number = -Math.PI / 2;
  public speed: number = 0;
  public readonly maxSpeed: number = 6;
  public readonly minSpeed: number = 0;
  private readonly acceleration: number = 0.12;
  private readonly deceleration: number = 0.06;
  private readonly rotationSpeed: number = 0.045;
  private width: number;
  private height: number;

  private keys: Record<string, boolean> = {};
  public engineParticles: EngineParticle[] = [];
  private particleSpawnTimer: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = width / 2;
    this.y = height / 2;
  }

  public setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  public resize(width: number, height: number): void {
    if (this.x > width) this.x = width;
    if (this.y > height) this.y = height;
    this.width = width;
    this.height = height;
  }

  public update(deltaTime: number): void {
    if (this.keys['a']) {
      this.angle -= this.rotationSpeed * deltaTime * 60;
    }
    if (this.keys['d']) {
      this.angle += this.rotationSpeed * deltaTime * 60;
    }

    if (this.keys['w']) {
      this.speed = Math.min(this.speed + this.acceleration * deltaTime * 60, this.maxSpeed);
    } else if (this.keys['s']) {
      this.speed = Math.max(this.speed - this.deceleration * deltaTime * 60, this.minSpeed);
    } else {
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.deceleration * 0.3 * deltaTime * 60);
      }
    }

    this.x += Math.cos(this.angle) * this.speed * deltaTime * 60;
    this.y += Math.sin(this.angle) * this.speed * deltaTime * 60;

    if (this.x < 0) this.x = this.width;
    if (this.x > this.width) this.x = 0;
    if (this.y < 0) this.y = this.height;
    if (this.y > this.height) this.y = 0;

    this.particleSpawnTimer += deltaTime;
    const targetParticleCount = Math.floor(5 + (this.speed / this.maxSpeed) * 25);
    const spawnInterval = this.speed > 0 ? 1 / (targetParticleCount * 4) : 0;

    if (this.speed > 0.2 && this.particleSpawnTimer >= spawnInterval) {
      this.particleSpawnTimer = 0;
      this.spawnEngineParticle();
    }

    this.updateEngineParticles(deltaTime);
  }

  private spawnEngineParticle(): void {
    const backAngle = this.angle + Math.PI;
    const offsetDist = 18;
    const spawnX = this.x + Math.cos(backAngle) * offsetDist;
    const spawnY = this.y + Math.sin(backAngle) * offsetDist;

    const spread = 0.35;
    const particleAngle = backAngle + (Math.random() - 0.5) * spread;
    const particleSpeed = 1.5 + Math.random() * 2 + this.speed * 0.3;

    this.engineParticles.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(particleAngle) * particleSpeed,
      vy: Math.sin(particleAngle) * particleSpeed,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.5,
      size: 2 + Math.random() * 3
    });
  }

  private updateEngineParticles(deltaTime: number): void {
    for (let i = this.engineParticles.length - 1; i >= 0; i--) {
      const p = this.engineParticles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= deltaTime / p.maxLife;
      if (p.life <= 0) {
        this.engineParticles.splice(i, 1);
      }
    }
  }

  public getState(): ShipState {
    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      speed: this.speed,
      maxSpeed: this.maxSpeed
    };
  }

  public getMappedSpeed(): number {
    return Math.floor((this.speed / this.maxSpeed) * 100);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.engineParticles) {
      const alpha = Math.max(0, p.life);
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, `rgba(249, 115, 22, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(249, 115, 22, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(249, 115, 22, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
    glowGradient.addColorStop(0, 'rgba(250, 204, 21, 0.3)');
    glowGradient.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-14, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 14);
    ctx.closePath();

    const bodyGradient = ctx.createLinearGradient(-14, 0, 20, 0);
    bodyGradient.addColorStop(0, '#b45309');
    bodyGradient.addColorStop(0.5, '#facc15');
    bodyGradient.addColorStop(1, '#fef08a');
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(6, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();
  }
}
