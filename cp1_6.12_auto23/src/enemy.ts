import { GameMap, TILE_SIZE } from './gameMap';
import {
  DEATH_PARTICLE_COUNT,
  DEATH_PARTICLE_MIN_SPEED,
  DEATH_PARTICLE_MAX_SPEED,
  DEATH_PARTICLE_MIN_LIFE,
  DEATH_PARTICLE_MAX_LIFE,
  DEATH_PARTICLE_COLORS
} from './tower';

export const HIT_FLASH_DURATION = 0.1;
export const HIT_FLASH_SHADOW_BLUR = 20;
export const HIT_FLASH_SHADOW_COLOR = '#ff4444';

export const HEALTH_BAR_WIDTH_RATIO = 2.2;
export const HEALTH_BAR_HEIGHT = 5;
export const HEALTH_BAR_OFFSET = 12;

export const ENEMY_SIZE_RATIO = 0.35;
export const SLOW_RING_WIDTH = 2;
export const SLOW_RING_DASH = [4, 4];
export const SLOW_RING_OFFSET = 4;
export const SLOW_RING_COLOR = 'rgba(100, 200, 255, 0.7)';

export const ENEMY_BASE_HEALTH = 80;
export const ENEMY_HEALTH_PER_WAVE = 25;
export const ENEMY_BASE_SPEED = 72;
export const ENEMY_SPEED_PER_WAVE = 4.8;
export const ENEMY_KILL_REWARD = 10;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Enemy {
  private x: number;
  private y: number;
  private pathIndex: number;
  private baseHealth: number;
  private maxHealth: number;
  private health: number;
  private baseSpeed: number;
  private speed: number;
  private slowTimer: number;
  private slowFactor: number;
  private hitFlashTimer: number;
  private reward: number;
  private size: number;
  private dead: boolean;
  private reachedEnd: boolean;
  private waveNumber: number;

  constructor(wave: number, gameMap: GameMap) {
    this.waveNumber = wave;
    this.baseHealth = ENEMY_BASE_HEALTH + wave * ENEMY_HEALTH_PER_WAVE;
    this.maxHealth = this.baseHealth;
    this.health = this.baseHealth;
    this.baseSpeed = ENEMY_BASE_SPEED + wave * ENEMY_SPEED_PER_WAVE;
    this.speed = this.baseSpeed;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.hitFlashTimer = 0;
    this.reward = ENEMY_KILL_REWARD;
    this.size = TILE_SIZE * ENEMY_SIZE_RATIO;
    this.dead = false;
    this.reachedEnd = false;
    this.pathIndex = 0;

    const startPos = gameMap.getStartPosition();
    this.x = startPos.x * TILE_SIZE + TILE_SIZE / 2;
    this.y = startPos.y * TILE_SIZE + TILE_SIZE / 2;
  }

  update(gameMap: GameMap, deltaTime: number): void {
    if (this.dead || this.reachedEnd) return;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime;
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= deltaTime;
      if (this.slowTimer <= 0) {
        this.slowFactor = 1;
      }
    }

    const currentSpeed = this.speed * this.slowFactor;
    const smoothPath = gameMap.getSmoothPath();

    let distanceToMove = currentSpeed * deltaTime;
    while (distanceToMove > 0 && this.pathIndex < smoothPath.length - 1) {
      const target = smoothPath[this.pathIndex + 1];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distToTarget = Math.sqrt(dx * dx + dy * dy);

      if (distToTarget <= distanceToMove) {
        this.x = target.x;
        this.y = target.y;
        this.pathIndex++;
        distanceToMove -= distToTarget;
      } else {
        const ratio = distanceToMove / distToTarget;
        this.x += dx * ratio;
        this.y += dy * ratio;
        distanceToMove = 0;
      }
    }

    if (this.pathIndex >= smoothPath.length - 1) {
      this.reachedEnd = true;
    }
  }

  takeDamage(damage: number): void {
    this.health -= damage;
    this.hitFlashTimer = HIT_FLASH_DURATION;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  applySlow(factor: number, duration: number): void {
    if (factor < this.slowFactor) {
      this.slowFactor = factor;
    }
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  createDeathParticles(): Particle[] {
    const particles: Particle[] = [];

    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
      const baseAngle = (Math.PI * 2 * i) / DEATH_PARTICLE_COUNT;
      const angleJitter = (Math.random() - 0.5) * 0.5;
      const angle = baseAngle + angleJitter;

      const speedRange = DEATH_PARTICLE_MAX_SPEED - DEATH_PARTICLE_MIN_SPEED;
      const speed = DEATH_PARTICLE_MIN_SPEED + Math.random() * speedRange;

      const lifeRange = DEATH_PARTICLE_MAX_LIFE - DEATH_PARTICLE_MIN_LIFE;
      const life = DEATH_PARTICLE_MIN_LIFE + Math.random() * lifeRange;

      const colorIndex = Math.floor(Math.random() * DEATH_PARTICLE_COLORS.length);

      particles.push({
        x: this.x + (Math.random() - 0.5) * this.size,
        y: this.y + (Math.random() - 0.5) * this.size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: DEATH_PARTICLE_MAX_LIFE,
        color: DEATH_PARTICLE_COLORS[colorIndex],
        size: 3 + Math.random() * 5
      });
    }
    return particles;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hitFlashTimer > 0) {
      ctx.shadowColor = HIT_FLASH_SHADOW_COLOR;
      ctx.shadowBlur = HIT_FLASH_SHADOW_BLUR;
    }

    const gradient = ctx.createRadialGradient(0, -2, 0, 0, 0, this.size);
    if (this.hitFlashTimer > 0) {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#ff6666');
      gradient.addColorStop(1, '#cc0000');
    } else {
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(0.7, '#e03131');
      gradient.addColorStop(1, '#c92a2a');
    }

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#862020';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-this.size * 0.3, -this.size * 0.15, this.size * 0.2, 0, Math.PI * 2);
    ctx.arc(this.size * 0.3, -this.size * 0.15, this.size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-this.size * 0.25, -this.size * 0.12, this.size * 0.1, 0, Math.PI * 2);
    ctx.arc(this.size * 0.35, -this.size * 0.12, this.size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    this.renderHealthBar(ctx);

    if (this.slowFactor < 1) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = SLOW_RING_COLOR;
      ctx.lineWidth = SLOW_RING_WIDTH;
      ctx.setLineDash(SLOW_RING_DASH);
      ctx.beginPath();
      ctx.arc(0, 0, this.size + SLOW_RING_OFFSET, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.size * HEALTH_BAR_WIDTH_RATIO;
    const barHeight = HEALTH_BAR_HEIGHT;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.size - HEALTH_BAR_OFFSET;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    ctx.fillStyle = '#343a40';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const healthRatio = this.health / this.maxHealth;
    let healthColor = '#51cf66';
    if (healthRatio < 0.6) healthColor = '#ffd43b';
    if (healthRatio < 0.3) healthColor = '#ff6b6b';

    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  getX(): number { return this.x; }
  getY(): number { return this.y; }
  getPathIndex(): number { return this.pathIndex; }
  getHealth(): number { return this.health; }
  getMaxHealth(): number { return this.maxHealth; }
  getReward(): number { return this.reward; }
  isDead(): boolean { return this.dead; }
  hasReachedEnd(): boolean { return this.reachedEnd; }
  getWaveNumber(): number { return this.waveNumber; }

  distanceTo(otherX: number, otherY: number): number {
    const dx = this.x - otherX;
    const dy = this.y - otherY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToSq(otherX: number, otherY: number): number {
    const dx = this.x - otherX;
    const dy = this.y - otherY;
    return dx * dx + dy * dy;
  }
}
