/**
 * ParticleSystem — 粒子系统类
 * 职责：管理所有粒子、处理用户交互生成粒子、物理计算、碰撞融合、渲染调度
 * 调用者：main.ts
 * 被调用者：Particle
 *
 * 数据流向：
 *   main.ts 事件监听 → handleMouseDown/Move/Up → spawnParticle
 *   main.ts rAF 循环  → update(dt) → 物理/碰撞/清理
 *                    → render(ctx) → 绘制光晕 + 所有粒子
 */

import { Particle } from './particle';

export interface SystemConfig {
  gravityStrength: number;
  repulsionStrength: number;
  spawnRate: number;
}

const GRAVITY_RADIUS = 120;
const REPULSION_RADIUS = 40;
const MAX_PARTICLES = 500;
const HALO_RADIUS = 15;

export class ParticleSystem {
  public particles: Particle[] = [];

  public gravityStrength: number;
  public repulsionStrength: number;
  public spawnRate: number;

  public shadowBlur: number = 10;
  public maxParticles: number = MAX_PARTICLES;

  private isMouseDown: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;

  private currentHue: number = 0;
  private spawnAccumulator: number = 0;

  private canvasWidth: number;
  private canvasHeight: number;

  private isClearing: boolean = false;
  private clearStartTime: number = 0;
  private readonly CLEAR_DURATION: number = 500;

  public constructor(
    canvasWidth: number,
    canvasHeight: number,
    config: SystemConfig
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.gravityStrength = config.gravityStrength;
    this.repulsionStrength = config.repulsionStrength;
    this.spawnRate = config.spawnRate;
  }

  public setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  public handleMouseDown(x: number, y: number): void {
    this.isMouseDown = true;
    this.mouseX = x;
    this.mouseY = y;
    this.prevMouseX = x;
    this.prevMouseY = y;
    this.spawnAccumulator = 0;
  }

  public handleMouseMove(x: number, y: number): void {
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = x;
    this.mouseY = y;
  }

  public handleMouseUp(): void {
    this.isMouseDown = false;
  }

  public startClear(now: number): void {
    this.isClearing = true;
    this.clearStartTime = now;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getCurrentHue(): number {
    return this.currentHue;
  }

  /**
   * 更新整个粒子系统
   * @param dt 秒
   * @param now 毫秒
   */
  public update(dt: number, now: number): void {
    if (this.isClearing) {
      this.updateClearAnimation(now);
    }

    if (this.isMouseDown && !this.isClearing) {
      this.spawnParticlesAlongStroke(dt, now);
    }

    for (const p of this.particles) {
      p.update(dt, now);
      this.wrapBounds(p);
    }

    this.applyPhysics(dt);
    this.resolveCollisions();
    this.removeDeadParticles();
    this.enforceMaxParticles();
  }

  private updateClearAnimation(now: number): void {
    const elapsed = now - this.clearStartTime;
    const t = Math.min(1, elapsed / this.CLEAR_DURATION);
    const fadeMultiplier = 1 - t;

    for (const p of this.particles) {
      p.fadeOutMultiplier = fadeMultiplier;
    }

    if (t >= 1) {
      this.particles.length = 0;
      this.isClearing = false;
    }
  }

  private spawnParticlesAlongStroke(dt: number, now: number): void {
    this.spawnAccumulator += dt * this.spawnRate;

    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;

      const t = 1 - (this.spawnAccumulator + 1) / Math.max(1, this.spawnRate * dt);
      const ix = this.prevMouseX + (this.mouseX - this.prevMouseX) * t;
      const iy = this.prevMouseY + (this.mouseY - this.prevMouseY) * t;

      this.spawnParticle(ix, iy, now);
    }
  }

  private spawnParticle(x: number, y: number, now: number): void {
    if (this.particles.length >= this.maxParticles) return;

    const jitter = (Math.random() - 0.5) * 8;
    const particle = new Particle({
      x: x + jitter,
      y: y + jitter,
      hue: this.currentHue,
      birthTime: now
    });

    this.particles.push(particle);
    this.currentHue = (this.currentHue + 5) % 360;
  }

  private wrapBounds(p: Particle): void {
    const margin = 50;
    if (p.x < -margin) p.x = this.canvasWidth + margin;
    if (p.x > this.canvasWidth + margin) p.x = -margin;
    if (p.y < -margin) p.y = this.canvasHeight + margin;
    if (p.y > this.canvasHeight + margin) p.y = -margin;
  }

  private applyPhysics(dt: number): void {
    const len = this.particles.length;
    const g = this.gravityStrength;
    const r = this.repulsionStrength;
    const gR = GRAVITY_RADIUS;
    const rR = REPULSION_RADIUS;

    for (let i = 0; i < len; i++) {
      const a = this.particles[i];
      if (a.markedForRemoval) continue;

      for (let j = i + 1; j < len; j++) {
        const b = this.particles[j];
        if (b.markedForRemoval) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > gR * gR) continue;
        if (distSq < 0.0001) continue;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        if (dist < gR) {
          const forceG = g * (gR - dist) / dist;
          const fxG = nx * forceG * dt;
          const fyG = ny * forceG * dt;
          a.vx += fxG;
          a.vy += fyG;
          b.vx -= fxG;
          b.vy -= fyG;
        }

        if (dist < rR) {
          const factor = (rR - dist) / rR;
          const forceR = r * factor * factor * (rR * rR) / Math.max(distSq, 1);
          const fxR = nx * forceR * dt;
          const fyR = ny * forceR * dt;
          a.vx -= fxR;
          a.vy -= fyR;
          b.vx += fxR;
          b.vy += fyR;
        }
      }
    }
  }

  private resolveCollisions(): void {
    const len = this.particles.length;

    for (let i = 0; i < len; i++) {
      const a = this.particles[i];
      if (a.markedForRemoval) continue;

      for (let j = i + 1; j < len; j++) {
        const b = this.particles[j];
        if (b.markedForRemoval) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const rSum = a.radius + b.radius;

        if (distSq < rSum * rSum) {
          if (a.mass >= b.mass) {
            a.mergeWith(b);
            b.markedForRemoval = true;
          } else {
            b.mergeWith(a);
            a.markedForRemoval = true;
            break;
          }
        }
      }
    }
  }

  private removeDeadParticles(): void {
    if (this.isClearing) return;
    this.particles = this.particles.filter(p => !p.markedForRemoval && p.alpha > 0.001);
  }

  private enforceMaxParticles(): void {
    const overflow = this.particles.length - this.maxParticles;
    if (overflow > 0) {
      this.particles.splice(0, overflow);
    }
  }

  /**
   * 渲染光晕和所有粒子
   */
  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      p.render(ctx, this.shadowBlur);
    }

    if (this.isMouseDown && !this.isClearing) {
      this.renderHalo(ctx);
    }
  }

  private renderHalo(ctx: CanvasRenderingContext2D): void {
    const color = `hsla(${this.currentHue}, 80%, 90%, 0.3)`;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, HALO_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
