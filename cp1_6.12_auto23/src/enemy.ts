import { GameMap, TILE_SIZE } from './gameMap';

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
    this.baseHealth = 80 + wave * 25;
    this.maxHealth = this.baseHealth;
    this.health = this.baseHealth;
    this.baseSpeed = 1.2 + wave * 0.08;
    this.speed = this.baseSpeed;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.hitFlashTimer = 0;
    this.reward = 10;
    this.size = TILE_SIZE * 0.35;
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

    let distanceToMove = currentSpeed;
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
    this.hitFlashTimer = 0.1;
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
    const particleCount = 20;
    const colors = ['#ff6b6b', '#ff8787', '#ffa8a8', '#ffc9c9', '#ffd43b'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
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
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 20;
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
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.size * 2.2;
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.size - 12;

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
}
