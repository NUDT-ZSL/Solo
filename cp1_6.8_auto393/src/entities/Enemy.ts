import { ParticleSystem } from '../effects/ParticleSystem';

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead';

export class Enemy {
  x: number;
  y: number = 0;
  width: number = 36;
  height: number = 60;
  vx: number = 0;
  vy: number = 0;
  facing: number = -1;
  grounded: boolean = false;

  state: EnemyState = 'patrol';
  stateTimer: number = 0;
  health: number = 3;
  maxHealth: number = 3;
  alive: boolean = true;

  patrolDir: number = 1;
  patrolDist: number = 0;
  patrolMaxDist: number = 120;

  moveSpeed: number = 100;
  chaseSpeed: number = 160;
  gravity: number = 1400;
  attackRange: number = 70;
  attackCooldown: number = 0;
  attackDuration: number = 0.35;
  hurtDuration: number = 0.3;
  sightRange: number = 300;
  attackDamage: number = 1;

  hitFlashTimer: number = 0;

  constructor(x: number) {
    this.x = x;
    this.patrolDir = Math.random() < 0.5 ? 1 : -1;
  }

  update(dt: number, playerX: number, playerY: number, particles: ParticleSystem, canvasWidth: number, groundY: number): void {
    if (!this.alive) return;

    this.stateTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    switch (this.state) {
      case 'patrol': {
        this.vx = this.patrolDir * this.moveSpeed;
        this.patrolDist += Math.abs(this.vx * dt);
        if (this.patrolDist >= this.patrolMaxDist) {
          this.patrolDir *= -1;
          this.patrolDist = 0;
        }
        this.facing = this.patrolDir;
        if (dist < this.sightRange) {
          this.state = 'chase';
        }
        break;
      }
      case 'chase': {
        if (dist > this.sightRange * 1.5) {
          this.state = 'patrol';
          break;
        }
        this.facing = dx > 0 ? 1 : -1;
        if (dist < this.attackRange && this.attackCooldown <= 0) {
          this.state = 'attack';
          this.stateTimer = this.attackDuration;
          this.vx = 0;
        } else {
          this.vx = this.facing * this.chaseSpeed;
        }
        break;
      }
      case 'attack': {
        this.vx = 0;
        if (this.stateTimer <= 0) {
          this.attackCooldown = 1.2 + Math.random() * 0.5;
          this.state = 'chase';
        }
        break;
      }
      case 'hurt': {
        this.vx *= 0.9;
        if (this.stateTimer <= 0) {
          this.state = 'chase';
        }
        break;
      }
    }

    if (!this.grounded) {
      this.vy += this.gravity * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height;
      this.vy = 0;
      this.grounded = true;
    }

    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvasWidth) this.x = canvasWidth - this.width;
  }

  takeDamage(amount: number, knockbackDir: number, particles: ParticleSystem): void {
    if (!this.alive) return;
    this.health -= amount;
    this.hitFlashTimer = 0.15;
    this.state = 'hurt';
    this.stateTimer = this.hurtDuration;
    this.vx = knockbackDir * 200;
    this.vy = -150;
    this.grounded = false;

    particles.emitInkBurst(this.x + this.width / 2, this.y + this.height / 2, 10, knockbackDir === 1 ? 0 : Math.PI);

    if (this.health <= 0) {
      this.alive = false;
      particles.emitInkBurst(this.x + this.width / 2, this.y + this.height / 2, 20, 0);
      particles.emitSplashFan(this.x + this.width / 2, this.y + this.height / 2, knockbackDir, 15);
    }
  }

  getAttackHitbox(): { x: number; y: number; w: number; h: number } | null {
    if (this.state !== 'attack' || this.stateTimer > this.attackDuration * 0.6) return null;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - 50,
      y: this.y + 5,
      w: 50,
      h: this.height - 10,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();

    const alpha = this.hitFlashTimer > 0 ? 0.9 : 0.6;
    ctx.globalAlpha = alpha;

    ctx.shadowColor = 'rgba(255,50,50,0.7)';
    ctx.shadowBlur = this.hitFlashTimer > 0 ? 20 : 12;

    const glowColor = this.hitFlashTimer > 0 ? 'rgba(255,200,200,0.9)' : 'rgba(255,60,60,0.7)';
    ctx.fillStyle = glowColor;
    ctx.strokeStyle = 'rgba(255,80,80,0.8)';
    ctx.lineWidth = 1;

    const bx = this.x;
    const by = this.y;

    ctx.beginPath();
    ctx.ellipse(bx + this.width / 2, by + 8, 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2 - 3, by + 15);
    ctx.lineTo(bx + this.width / 2 + 3, by + 15);
    ctx.lineTo(bx + this.width / 2 + 5, by + 40);
    ctx.lineTo(bx + this.width / 2 - 5, by + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const armAngle = this.state === 'attack'
      ? (this.stateTimer / this.attackDuration) * 1.5
      : 0.3;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2, by + 18);
    ctx.lineTo(
      bx + this.width / 2 + this.facing * (15 + armAngle * 20),
      by + 22 + armAngle * 10,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2 - 3, by + 40);
    ctx.lineTo(bx + this.width / 2 - 7, by + this.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2 + 3, by + 40);
    ctx.lineTo(bx + this.width / 2 + 7, by + this.height);
    ctx.stroke();

    if (this.state === 'attack') {
      const sx = bx + this.width / 2 + this.facing * 30;
      const sy = by + 20;
      ctx.strokeStyle = 'rgba(255,100,100,0.8)';
      ctx.shadowColor = 'rgba(255,50,50,0.6)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + this.facing * 35, sy + 5);
      ctx.stroke();
    }

    const hpW = 30;
    const hpH = 3;
    const hpX = bx + (this.width - hpW) / 2;
    const hpY = by - 8;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#300';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = 'rgba(255,60,60,0.8)';
    ctx.fillRect(hpX, hpY, hpW * (this.health / this.maxHealth), hpH);

    ctx.restore();
  }
}
