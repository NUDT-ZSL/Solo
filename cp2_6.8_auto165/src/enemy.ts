import { Enemy } from './core';
import { random, randomChoice, ParticlePool, randomInt } from './utils';

export const ENEMY_COLORS = ['#FF6B6B', '#F72585', '#7209B7'];
const PARTICLE_COLORS = ['#FF6B6B', '#FAD02E', '#6BCB77'];

export class EnemyManager {
  enemies: Enemy[] = [];
  spawnTimer: number = 0;
  spawnInterval: number = 0.5;
  maxEnemies: number = 8;
  initialSpeed: number = 80;
  baseSize: number = 24;
  waveCounter: number = 0;
  waveIndex: number = 0;
  particlePool: ParticlePool;

  constructor(particlePool: ParticlePool) {
    this.particlePool = particlePool;
  }

  spawnEnemy(canvasWidth: number, canvasHeight: number, coreX: number, coreY: number): void {
    if (this.enemies.filter((e) => e.alive).length >= this.maxEnemies) return;

    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    switch (side) {
      case 0:
        x = random(0, canvasWidth);
        y = -this.baseSize;
        break;
      case 1:
        x = canvasWidth + this.baseSize;
        y = random(0, canvasHeight);
        break;
      case 2:
        x = random(0, canvasWidth);
        y = canvasHeight + this.baseSize;
        break;
      default:
        x = -this.baseSize;
        y = random(0, canvasHeight);
    }

    const dx = coreX - x;
    const dy = coreY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const enemy: Enemy = {
      x,
      y,
      vx: (dx / dist) * this.initialSpeed,
      vy: (dy / dist) * this.initialSpeed,
      size: this.baseSize,
      rotation: Math.PI / 4,
      color: ENEMY_COLORS[this.waveIndex % ENEMY_COLORS.length],
      alive: true,
      age: 0,
      speed: this.initialSpeed,
      waveIndex: this.waveIndex
    };

    this.enemies.push(enemy);
    this.waveCounter++;
    if (this.waveCounter >= 10) {
      this.waveCounter = 0;
      this.waveIndex++;
    }
  }

  spawnExplosion(x: number, y: number): void {
    const count = randomInt(15, 25);
    const spreadRadius = random(60, 100);
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(spreadRadius * 0.5, spreadRadius) / random(0.4, 0.8);
      const life = random(0.4, 0.8);
      const size = random(2, 4);
      const color = randomChoice(PARTICLE_COLORS);
      this.particlePool.spawn(x, y, angle, speed, size, color, life);
    }
  }

  update(dt: number, canvasWidth: number, canvasHeight: number, coreX: number, coreY: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy(canvasWidth, canvasHeight, coreX, coreY);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) {
        this.spawnExplosion(e.x, e.y);
        this.enemies.splice(i, 1);
        continue;
      }

      e.age += dt;
      const speedBonus = Math.floor(e.age / 10) * 5;
      const currentSpeed = this.initialSpeed + speedBonus;
      e.speed = currentSpeed;

      const dx = coreX - e.x;
      const dy = coreY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        e.vx = (dx / dist) * currentSpeed;
        e.vy = (dy / dist) * currentSpeed;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rotation += dt * 0.5;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rotation);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -e.size);
      ctx.lineTo(e.size, 0);
      ctx.lineTo(0, e.size);
      ctx.lineTo(-e.size, 0);
      ctx.closePath();
      ctx.stroke();

      const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size);
      innerGradient.addColorStop(0, e.color + '40');
      innerGradient.addColorStop(1, e.color + '00');
      ctx.fillStyle = innerGradient;
      ctx.fill();
      ctx.restore();
    }
  }

  clear(): void {
    this.enemies = [];
    this.spawnTimer = 0;
    this.waveCounter = 0;
    this.waveIndex = 0;
  }
}
