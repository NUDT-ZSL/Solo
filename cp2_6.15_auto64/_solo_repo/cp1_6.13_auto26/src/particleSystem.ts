import { Particle, Vector3 } from './particle';

export interface Star {
  x: number;
  y: number;
  z: number;
  radius: number;
  baseOpacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private stars: Star[] = [];

  private density: number = 3000;
  private targetDensity: number = 3000;
  private tailLength: number = 60;
  private targetTailLength: number = 60;
  private speed: number = 1.0;
  private targetSpeed: number = 1.0;

  private gravity: number = 0.15;
  private spawnAccumulator: number = 0;

  private worldBounds = {
    minX: -600,
    maxX: 600,
    minY: -500,
    maxY: 500,
    minZ: -600,
    maxZ: 600
  };

  private activeCount: number = 0;

  private static readonly SMOOTH_RATE = 5.0;

  constructor() {
    this.initPool(6000);
    this.initStars(200);
  }

  private initPool(size: number): void {
    for (let i = 0; i < size; i++) {
      this.pool.push(new Particle());
    }
  }

  private initStars(count: number): void {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 1500,
        z: (Math.random() - 0.5) * 2000 - 300,
        radius: 1,
        baseOpacity: 0.3 + Math.random() * 0.7,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: (Math.PI * 2) / (3 + Math.random() * 2)
      });
    }
  }

  private getParticleFromPool(): Particle | null {
    if (this.pool.length > 0) {
      const p = this.pool.pop()!;
      this.particles.push(p);
      return p;
    }
    return null;
  }

  private recycleParticle(p: Particle): void {
    p.active = false;
    const idx = this.particles.indexOf(p);
    if (idx > -1) {
      this.particles.splice(idx, 1);
    }
    this.pool.push(p);
  }

  private spawnParticle(): void {
    const p = this.getParticleFromPool();
    if (!p) return;

    const x = this.worldBounds.minX + Math.random() * (this.worldBounds.maxX - this.worldBounds.minX);
    const y = this.worldBounds.maxY + Math.random() * 100;
    const z = this.worldBounds.minZ + Math.random() * (this.worldBounds.maxZ - this.worldBounds.minZ);

    const baseAngle = Math.PI / 2;
    const angleOffset = (Math.random() - 0.5) * (Math.PI / 6);
    const angle = baseAngle + angleOffset;
    const horizontalAngle = Math.random() * Math.PI * 2;

    const speedMag = 2 + Math.random() * 3;
    const vy = -Math.cos(angle) * speedMag;
    const horizontalSpeed = Math.sin(angle) * speedMag;
    const vx = Math.cos(horizontalAngle) * horizontalSpeed;
    const vz = Math.sin(horizontalAngle) * horizontalSpeed;

    const radius = 2 + Math.random() * 2;
    const maxLife = 3 + Math.random() * 4;
    const tailLen = 40 + Math.random() * 40;

    p.reset(x, y, z, vx, vy, vz, radius, maxLife, tailLen, this.tailLength / 60);
  }

  public update(deltaTime: number, time: number): void {
    const t = 1 - Math.exp(-ParticleSystem.SMOOTH_RATE * deltaTime);
    this.speed += (this.targetSpeed - this.speed) * t;
    this.tailLength += (this.targetTailLength - this.tailLength) * t;
    this.density += (this.targetDensity - this.density) * t;

    const spawnRate = this.density / 3.5;
    this.spawnAccumulator += spawnRate * deltaTime;

    while (this.spawnAccumulator >= 1 && this.particles.length < 6000) {
      this.spawnParticle();
      this.spawnAccumulator -= 1;
    }

    const tailScale = this.tailLength / 60;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const alive = p.update(deltaTime, this.gravity, this.speed);
      p.tailLength = p.baseTailLength * tailScale;

      if (!alive || p.y < this.worldBounds.minY) {
        this.recycleParticle(p);
      }
    }

    this.activeCount = this.particles.length;

    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed * deltaTime;
    }
  }

  public getActiveParticles(): Particle[] {
    return this.particles;
  }

  public getStars(): Star[] {
    return this.stars;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public setDensity(value: number): void {
    this.targetDensity = Math.max(1000, Math.min(6000, value));
  }

  public setTailLength(value: number): void {
    this.targetTailLength = Math.max(20, Math.min(100, value));
  }

  public setSpeed(value: number): void {
    this.targetSpeed = Math.max(0.5, Math.min(2.0, value));
  }

  public getDensity(): number {
    return this.targetDensity;
  }

  public getTailLength(): number {
    return this.targetTailLength;
  }

  public getSpeed(): number {
    return this.targetSpeed;
  }

  public getWorldBounds() {
    return this.worldBounds;
  }

  public pickParticle(screenX: number, screenY: number, project: (p: Vector3) => { x: number; y: number; scale: number }): Particle | null {
    let closest: Particle | null = null;
    let minDist = 25;

    for (const p of this.particles) {
      if (!p.active) continue;
      const proj = project({ x: p.x, y: p.y, z: p.z });
      if (proj.scale <= 0) continue;

      const dx = screenX - proj.x;
      const dy = screenY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = Math.max(12, p.radius * proj.scale * 3);

      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    return closest;
  }
}
