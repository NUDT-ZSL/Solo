export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  size: number;
  ownerId: number;
  alive: boolean;
}

export class PlayerShip {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  angle: number = 0;
  hp: number = 100;
  shield: number = 0;
  maxHp: number = 100;
  speed: number = 150;
  baseSpeed: number = 150;
  shootCooldown: number = 0;
  shootInterval: number = 0.8;
  bulletSpeed: number = 400;
  bullets: Bullet[] = [];
  playerId: number;
  alive: boolean = true;
  speedBoostTimer: number = 0;
  hasMissile: boolean = false;
  explosionTimer: number = 0;
  explosionParticles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  constructor(x: number, y: number, angle: number, playerId: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.playerId = playerId;
  }

  update(dt: number, input: { up: boolean; down: boolean; left: boolean; right: boolean; shoot: boolean }) {
    if (!this.alive) {
      this.updateExplosion(dt);
      return;
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      this.speed = this.baseSpeed * 2;
      if (this.speedBoostTimer <= 0) {
        this.speed = this.baseSpeed;
      }
    }

    let thrust = 0;
    let turnDir = 0;

    if (input.up) thrust = 1;
    if (input.down) thrust = -0.5;
    if (input.left) turnDir = -1;
    if (input.right) turnDir = 1;

    this.angle += turnDir * 3.5 * dt;

    if (thrust !== 0) {
      this.vx += Math.cos(this.angle) * this.speed * thrust * dt;
      this.vy += Math.sin(this.angle) * this.speed * thrust * dt;
    }

    const friction = 0.96;
    this.vx *= friction;
    this.vy *= friction;

    const maxV = this.speed;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > maxV) {
      this.vx = (this.vx / currentSpeed) * maxV;
      this.vy = (this.vy / currentSpeed) * maxV;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    if (input.shoot && this.shootCooldown <= 0) {
      this.shoot();
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > 820 || b.y < -20 || b.y > 620) {
        b.alive = false;
      }
    }

    this.bullets = this.bullets.filter(b => b.alive);
  }

  shoot() {
    const isMissile = this.hasMissile;
    const damage = isMissile ? 50 : 20;
    const size = isMissile ? 8 : 4;
    const ox = Math.cos(this.angle) * 18;
    const oy = Math.sin(this.angle) * 18;

    this.bullets.push({
      x: this.x + ox,
      y: this.y + oy,
      vx: Math.cos(this.angle) * this.bulletSpeed,
      vy: Math.sin(this.angle) * this.bulletSpeed,
      damage,
      size,
      ownerId: this.playerId,
      alive: true,
    });

    this.hasMissile = false;
    this.shootCooldown = this.shootInterval;
  }

  takeDamage(amount: number): boolean {
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        return false;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.startExplosion();
      return true;
    }
    return false;
  }

  heal(amount: number) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  addShield(amount: number) {
    this.shield = Math.min(this.shield + amount, 40);
  }

  activateSpeedBoost() {
    this.speedBoostTimer = 3;
    this.speed = this.baseSpeed * 2;
  }

  giveMissile() {
    this.hasMissile = true;
  }

  startExplosion() {
    this.explosionTimer = 0.5;
    const colors = ['#fbbf24', '#ef4444', '#f97316', '#fde68a'];
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
      const spd = 60 + Math.random() * 120;
      this.explosionParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.3 + Math.random() * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  updateExplosion(dt: number) {
    this.explosionTimer -= dt;
    for (const p of this.explosionParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.explosionParticles = this.explosionParticles.filter(p => p.life > 0);
  }

  getCollisionRadius(): number {
    return 14;
  }

  checkBulletCollision(other: PlayerShip): boolean {
    let hit = false;
    const r = other.getCollisionRadius();
    for (const b of this.bullets) {
      if (!b.alive) continue;
      const dx = b.x - other.x;
      const dy = b.y - other.y;
      if (dx * dx + dy * dy < (r + b.size) * (r + b.size)) {
        b.alive = false;
        other.takeDamage(b.damage);
        hit = true;
      }
    }
    return hit;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.alive) {
      this.drawExplosion(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const color = this.playerId === 1 ? '#8b5cf6' : '#3b82f6';
    const glowColor = this.playerId === 1 ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)';

    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.shadowBlur = 0;

    if (this.speedBoostTimer > 0) {
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-12, -5);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-12, 5);
      ctx.closePath();
      ctx.fillStyle = '#fb923c';
      ctx.fill();
    }

    if (this.hasMissile) {
      ctx.beginPath();
      ctx.arc(0, -14, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    }

    if (this.shield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(96,165,250,${0.3 + (this.shield / 40) * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    this.drawBullets(ctx);
  }

  drawBullets(ctx: CanvasRenderingContext2D) {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      const color = b.ownerId === 1 ? '#a78bfa' : '#60a5fa';
      const glowColor = b.ownerId === 1 ? 'rgba(167,139,250,0.5)' : 'rgba(96,165,250,0.5)';

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawExplosion(ctx: CanvasRenderingContext2D) {
    for (const p of this.explosionParticles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / 0.5);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  reset(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.hp = 100;
    this.shield = 0;
    this.speed = this.baseSpeed;
    this.shootCooldown = 0;
    this.bullets = [];
    this.alive = true;
    this.speedBoostTimer = 0;
    this.hasMissile = false;
    this.explosionTimer = 0;
    this.explosionParticles = [];
  }
}
