import { EnemyState, PlatformData, Hitbox } from '../types';

const PATROL_SPEED = 60;
const KNOCKBACK_SPEED = 200;
const KNOCKBACK_DURATION = 0.3;
const HIT_FLASH_DURATION = 0.3;
const DEATH_ANIM_DURATION = 0.5;

export class Enemy {
  public state: EnemyState;

  constructor(id: number, x: number, y: number, patrolLeft: number, patrolRight: number) {
    this.state = {
      id,
      x,
      y,
      vx: PATROL_SPEED,
      radius: 20,
      health: 30,
      maxHealth: 30,
      patrolLeft,
      patrolRight,
      direction: 1,
      hitFlashTimer: 0,
      deathScale: 1,
      alive: true,
      knockbackTimer: 0,
    };
  }

  public update(dt: number, platforms: PlatformData[]): void {
    const s = this.state;
    if (!s.alive) {
      s.deathScale -= dt / DEATH_ANIM_DURATION;
      if (s.deathScale < 0) s.deathScale = 0;
      return;
    }

    if (s.hitFlashTimer > 0) {
      s.hitFlashTimer -= dt;
    }

    if (s.knockbackTimer > 0) {
      s.knockbackTimer -= dt;
      s.x += s.vx * dt;
    } else {
      s.vx = s.direction * PATROL_SPEED;
      s.x += s.vx * dt;

      if (s.x - s.radius < s.patrolLeft) {
        s.x = s.patrolLeft + s.radius;
        s.direction = 1;
      } else if (s.x + s.radius > s.patrolRight) {
        s.x = s.patrolRight - s.radius;
        s.direction = -1;
      }
    }

    this.checkPlatformCollisions(platforms);
  }

  private checkPlatformCollisions(platforms: PlatformData[]): void {
    const s = this.state;
    let onPlatform = false;

    for (const p of platforms) {
      if (s.x + s.radius > p.x && s.x - s.radius < p.x + p.width) {
        if (s.y + s.radius >= p.y && s.y + s.radius <= p.y + 20) {
          s.y = p.y - s.radius;
          onPlatform = true;
        }
      }
    }

    if (!onPlatform && s.knockbackTimer <= 0) {
      s.y += 200 * 0.016;
    }
  }

  public checkHit(hitbox: Hitbox): boolean {
    const s = this.state;
    if (!s.alive) return false;

    const closestX = Math.max(hitbox.x, Math.min(s.x, hitbox.x + hitbox.width));
    const closestY = Math.max(hitbox.y, Math.min(s.y, hitbox.y + hitbox.height));
    const distance = Math.sqrt((s.x - closestX) ** 2 + (s.y - closestY) ** 2);

    return distance < s.radius;
  }

  public takeDamage(damage: number, knockback: number, attackerFacing: number): void {
    const s = this.state;
    if (!s.alive) return;

    s.health -= damage;
    s.hitFlashTimer = HIT_FLASH_DURATION;
    s.knockbackTimer = KNOCKBACK_DURATION;
    s.vx = attackerFacing * KNOCKBACK_SPEED;

    if (s.health <= 0) {
      s.health = 0;
      s.alive = false;
      s.deathScale = 1;
    }
  }

  public getHitPosition(): { x: number; y: number } {
    return { x: this.state.x, y: this.state.y };
  }

  public isDead(): boolean {
    return !this.state.alive && this.state.deathScale <= 0;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    if (!s.alive && s.deathScale <= 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const scale = s.alive ? 1 : s.deathScale;
    ctx.translate(s.x, s.y);
    ctx.scale(scale, scale);

    if (s.hitFlashTimer > 0 && Math.floor(s.hitFlashTimer * 20) % 2 === 0) {
      ctx.fillStyle = '#FFFFFF';
    } else {
      ctx.fillStyle = '#E74C3C';
    }

    ctx.beginPath();
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = s.hitFlashTimer > 0 ? '#FFCCCC' : '#C0392B';
    ctx.beginPath();
    ctx.arc(-6, -5, 4, 0, Math.PI * 2);
    ctx.arc(6, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-5 + s.direction * 1, -5, 2, 0, Math.PI * 2);
    ctx.arc(7 + s.direction * 1, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    if (s.alive) {
      const barWidth = 36;
      const barHeight = 4;
      const barX = -barWidth / 2;
      const barY = -s.radius - 12;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = '#2ECC71';
      ctx.fillRect(barX, barY, barWidth * (s.health / s.maxHealth), barHeight);
    }

    ctx.restore();
  }
}
