import { Vector3, Color } from 'three';
import { AppConfig } from '../types';

export class Trail {
  points: Vector3[] = [];
  color: Color;
  opacity: number = 1.0;
  isBursting: boolean = false;
  private maxPoints: number = 200;

  constructor(color: Color) {
    this.color = color.clone();
  }

  addPoint(point: Vector3): void {
    if (this.points.length >= this.maxPoints) {
      this.points.shift();
    }
    this.points.push(point.clone());
  }

  burst(burstSpeed: number): BurstParticle[] {
    this.isBursting = true;
    const particles: BurstParticle[] = [];
    const step = Math.max(1, Math.floor(this.points.length / 30));
    for (let i = 0; i < this.points.length; i += step) {
      const point = this.points[i];
      const count = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < count; j++) {
        particles.push(new BurstParticle(
          point.clone(),
          this.color.clone(),
          burstSpeed
        ));
      }
    }
    return particles;
  }
}

export class StarParticle {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: Color;
  isAlive: boolean = true;
  trail: Trail;

  constructor(position: Vector3, velocity: Vector3, color: Color, config: AppConfig) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.maxLife = 3 + Math.random() * 4;
    this.life = this.maxLife;
    this.size = config.starSize;
    this.color = color.clone();
    this.trail = new Trail(this.color);
    this.trail.addPoint(this.position);
  }

  update(dt: number): void {
    if (!this.isAlive) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.life = 0;
      this.isAlive = false;
      return;
    }

    this.velocity.y -= 0.02 * dt * 60;
    this.position.add(this.velocity.clone().multiplyScalar(dt * 60));
    this.trail.addPoint(this.position.clone());

    this.trail.opacity = Math.min(1.0, this.life / this.maxLife + 0.3);
  }

  burst(burstSpeed: number): BurstParticle[] {
    this.isAlive = false;
    return this.trail.burst(burstSpeed);
  }
}

export class BurstParticle {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: Color;
  angle: number;
  spiralRadius: number;
  isAlive: boolean = true;
  private spiralSpeed: number;
  private radialSpeed: number;

  constructor(position: Vector3, color: Color, burstSpeed: number) {
    this.position = position.clone();
    this.angle = Math.random() * Math.PI * 2;
    this.spiralRadius = 0.01;
    this.spiralSpeed = (2 + Math.random() * 3) * burstSpeed;
    this.radialSpeed = (0.5 + Math.random() * 1.5) * burstSpeed;
    this.maxLife = 1.0 + Math.random() * 1.5;
    this.life = this.maxLife;
    this.size = 0.03 + Math.random() * 0.05;
    this.color = color.clone();

    const hsl = { h: 0, s: 0, l: 0 };
    this.color.getHSL(hsl);
    hsl.h = (hsl.h + (Math.random() - 0.5) * 0.1) % 1.0;
    if (hsl.h < 0) hsl.h += 1.0;
    this.color.setHSL(hsl.h, hsl.s, hsl.l);

    const dir = new Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    this.velocity = dir.multiplyScalar(this.radialSpeed);
  }

  update(dt: number): void {
    if (!this.isAlive) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.life = 0;
      this.isAlive = false;
      return;
    }

    this.angle += this.spiralSpeed * dt;
    this.spiralRadius += this.radialSpeed * dt * 0.3;

    const spiralOffset = new Vector3(
      Math.cos(this.angle) * this.spiralRadius * dt * 60,
      Math.sin(this.angle) * this.spiralRadius * dt * 60,
      (Math.random() - 0.5) * this.spiralRadius * dt * 10
    );

    this.position.add(spiralOffset);
    this.position.add(this.velocity.clone().multiplyScalar(dt * 0.5));
  }
}

export class BackgroundStar {
  position: Vector3;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  private baseOpacity: number;

  constructor(position: Vector3) {
    this.position = position.clone();
    this.size = 0.01 + Math.random() * 0.03;
    this.baseOpacity = 0.3 + Math.random() * 0.7;
    this.opacity = this.baseOpacity;
    this.twinkleSpeed = 0.5 + Math.random() * 2.0;
    this.twinklePhase = Math.random() * Math.PI * 2;
  }

  update(time: number): void {
    this.opacity = this.baseOpacity * (0.5 + 0.5 * Math.sin(time * this.twinkleSpeed + this.twinklePhase));
  }
}

export function createStarColor(): Color {
  const t = Math.random();
  if (t < 0.5) {
    return new Color().setHSL(0.62 + Math.random() * 0.08, 0.2, 0.85 + Math.random() * 0.15);
  } else if (t < 0.8) {
    return new Color().setHSL(0.12 + Math.random() * 0.05, 0.8, 0.65 + Math.random() * 0.2);
  } else {
    return new Color().setHSL(0.0 + Math.random() * 0.05, 0.6, 0.7 + Math.random() * 0.2);
  }
}
