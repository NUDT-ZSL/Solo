export interface Vector2 {
  x: number;
  y: number;
}

export interface GameObject {
  x: number;
  y: number;
  update(deltaTime: number, ...args: unknown[]): unknown;
  render(ctx: CanvasRenderingContext2D): void;
  getBounds(): { x: number; y: number; radius: number };
}

export class Bullet implements GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isEnemy: boolean;
  life: number;
  maxLife: number;
  color: string;
  size: number;

  constructor(x: number, y: number, angle: number, speed: number, damage: number, isEnemy: boolean = false) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.isEnemy = isEnemy;
    this.life = 2;
    this.maxLife = 2;
    this.color = isEnemy ? '#ff4500' : '#39ff14';
    this.size = isEnemy ? 4 : 3;
  }

  update(deltaTime: number): void {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.life -= deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    const px = Math.floor(this.x);
    const py = Math.floor(this.y);
    ctx.fillRect(px - this.size, py - this.size, this.size * 2, this.size * 2);
    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, radius: this.size * 2 };
  }

  isExpired(): boolean {
    return this.life <= 0;
  }
}

export class PlanetCore implements GameObject {
  x: number;
  y: number;
  maxHp: number;
  currentHp: number;
  radius: number;
  pulseTime: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.maxHp = 100;
    this.currentHp = 100;
    this.radius = 40;
    this.pulseTime = 0;
  }

  update(deltaTime: number): void {
    this.pulseTime += deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pulse = Math.sin(this.pulseTime * 3) * 0.2 + 0.8;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.radius * 1.5);
    gradient.addColorStop(0, `rgba(255, 100, 50, ${0.3 * pulse})`);
    gradient.addColorStop(0.5, `rgba(100, 50, 150, ${0.2 * pulse})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const pixelSize = 4;
    const colors = [
      '#4a3a7a', '#5a4a8a', '#6a5a9a', '#7a6aaa',
      '#3a2a6a', '#2a1a5a', '#5a4a8a', '#4a3a7a'
    ];

    for (let py = -this.radius; py <= this.radius; py += pixelSize) {
      for (let px = -this.radius; px <= this.radius; px += pixelSize) {
        const dist = Math.sqrt(px * px + py * py);
        if (dist <= this.radius - pixelSize) {
          const noise = Math.sin(px * 0.1 + py * 0.1) * 0.5 + Math.cos(px * 0.05 - py * 0.08) * 0.5;
          const colorIndex = Math.floor((noise + 1) * 4) % colors.length;
          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(cx + px, cy + py, pixelSize, pixelSize);
        }
      }
    }

    ctx.fillStyle = `rgba(255, 200, 100, ${0.6 + 0.4 * pulse})`;
    ctx.shadowColor = '#ff6633';
    ctx.shadowBlur = 15 * pulse;
    ctx.fillRect(cx - 8, cy - 8, 16, 16);
    ctx.fillStyle = `rgba(255, 255, 200, ${0.8 * pulse})`;
    ctx.fillRect(cx - 4, cy - 4, 8, 8);

    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  takeDamage(damage: number): void {
    this.currentHp = Math.max(0, this.currentHp - damage);
  }

  isDestroyed(): boolean {
    return this.currentHp <= 0;
  }
}

export class Turret implements GameObject {
  x: number;
  y: number;
  angle: number;
  rotationSpeed: number;
  fireRate: number;
  lastFireTime: number;
  orbitRadius: number;
  orbitAngle: number;

  constructor(planetX: number, planetY: number) {
    this.orbitRadius = 70;
    this.orbitAngle = 0;
    this.x = planetX + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = planetY + Math.sin(this.orbitAngle) * this.orbitRadius;
    this.angle = 0;
    this.rotationSpeed = 8;
    this.fireRate = 100;
    this.lastFireTime = 0;
  }

  updateOrbit(planetX: number, planetY: number): void {
    this.x = planetX + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = planetY + Math.sin(this.orbitAngle) * this.orbitRadius;
  }

  aimAt(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.angle = Math.atan2(dy, dx);
  }

  update(deltaTime: number): void {
    this.orbitAngle += deltaTime * 0.3;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(-10, -8, 20, 16);
    ctx.fillStyle = '#4a5a6a';
    ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = '#5a6a7a';
    ctx.fillRect(-6, -4, 12, 8);

    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(0, -3, 20, 6);
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(4, -2, 16, 4);

    const glowIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(57, 255, 20, ${glowIntensity})`;
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.fillRect(18, -2, 4, 4);

    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, radius: 15 };
  }

  canFire(currentTime: number): boolean {
    return currentTime - this.lastFireTime >= this.fireRate;
  }

  fire(currentTime: number): Bullet {
    this.lastFireTime = currentTime;
    const bulletX = this.x + Math.cos(this.angle) * 24;
    const bulletY = this.y + Math.sin(this.angle) * 24;
    return new Bullet(bulletX, bulletY, this.angle, 600, 5, false);
  }
}

export enum EnemyType {
  ASTEROID_SMALL = 'asteroid_small',
  ASTEROID_MEDIUM = 'asteroid_medium',
  ASTEROID_LARGE = 'asteroid_large',
  FIGHTER = 'fighter',
  BOSS = 'boss'
}

export class Enemy implements GameObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  radius: number;
  damage: number;
  score: number;
  rotation: number;
  rotationSpeed: number;
  lastFireTime: number;
  fireRate: number;
  shield: number;
  maxShield: number;
  shieldRegenRate: number;
  pixels: { x: number; y: number; color: string }[];
  hitFlashTime: number;

  constructor(type: EnemyType, x: number, y: number, targetX: number, targetY: number) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.lastFireTime = 0;
    this.hitFlashTime = 0;
    this.pixels = [];

    const angle = Math.atan2(targetY - y, targetX - x);
    const spread = (Math.random() - 0.5) * 0.5;

    switch (type) {
      case EnemyType.ASTEROID_SMALL:
        this.hp = 30; this.maxHp = 30;
        this.radius = 15; this.damage = 10; this.score = 50;
        this.vx = Math.cos(angle + spread) * 60;
        this.vy = Math.sin(angle + spread) * 60;
        this.fireRate = 0; this.shield = 0; this.maxShield = 0; this.shieldRegenRate = 0;
        this.generateAsteroidPixels(15);
        break;
      case EnemyType.ASTEROID_MEDIUM:
        this.hp = 50; this.maxHp = 50;
        this.radius = 22; this.damage = 15; this.score = 100;
        this.vx = Math.cos(angle + spread) * 45;
        this.vy = Math.sin(angle + spread) * 45;
        this.fireRate = 0; this.shield = 0; this.maxShield = 0; this.shieldRegenRate = 0;
        this.generateAsteroidPixels(22);
        break;
      case EnemyType.ASTEROID_LARGE:
        this.hp = 80; this.maxHp = 80;
        this.radius = 30; this.damage = 20; this.score = 200;
        this.vx = Math.cos(angle + spread) * 30;
        this.vy = Math.sin(angle + spread) * 30;
        this.fireRate = 0; this.shield = 0; this.maxShield = 0; this.shieldRegenRate = 0;
        this.generateAsteroidPixels(30);
        break;
      case EnemyType.FIGHTER:
        this.hp = 15; this.maxHp = 15;
        this.radius = 12; this.damage = 5; this.score = 150;
        this.vx = Math.cos(angle + spread) * 120;
        this.vy = Math.sin(angle + spread) * 120;
        this.fireRate = 2000; this.shield = 0; this.maxShield = 0; this.shieldRegenRate = 0;
        this.generateFighterPixels();
        break;
      case EnemyType.BOSS:
        this.hp = 500; this.maxHp = 500;
        this.radius = 50; this.damage = 30; this.score = 1000;
        this.vx = Math.cos(angle) * 20;
        this.vy = Math.sin(angle) * 20;
        this.fireRate = 800; this.shield = 200; this.maxShield = 200; this.shieldRegenRate = 5;
        this.generateBossPixels();
        break;
      default:
        this.hp = 30; this.maxHp = 30;
        this.radius = 15; this.damage = 10; this.score = 50;
        this.vx = 50; this.vy = 0;
        this.fireRate = 0; this.shield = 0; this.maxShield = 0; this.shieldRegenRate = 0;
        this.generateAsteroidPixels(15);
    }
  }

  private generateAsteroidPixels(size: number): void {
    const pixelSize = 4;
    const colors = ['#5a5a5a', '#6a6a6a', '#7a7a7a', '#4a4a4a', '#8a8a8a', '#3a3a3a'];
    for (let py = -size; py <= size; py += pixelSize) {
      for (let px = -size; px <= size; px += pixelSize) {
        const dist = Math.sqrt(px * px + py * py);
        const noise = Math.sin(px * 0.2) * Math.cos(py * 0.15) * 6;
        if (dist <= size + noise - pixelSize) {
          const colorIndex = Math.floor(Math.random() * colors.length);
          this.pixels.push({ x: px, y: py, color: colors[colorIndex] });
        }
      }
    }
  }

  private generateFighterPixels(): void {
    const pixelSize = 3;
    const shape = [
      [0,0,0,1,0,0,0],
      [0,0,1,1,1,0,0],
      [0,1,1,2,1,1,0],
      [1,1,2,2,2,1,1],
      [1,2,2,3,2,2,1],
      [0,1,1,2,1,1,0],
      [0,0,1,1,1,0,0],
    ];
    const colors = ['transparent', '#8b0000', '#ff4500', '#ffff00'];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        const colorIndex = shape[row][col];
        if (colorIndex > 0) {
          this.pixels.push({
            x: (col - 3) * pixelSize,
            y: (row - 3) * pixelSize,
            color: colors[colorIndex]
          });
        }
      }
    }
  }

  private generateBossPixels(): void {
    const pixelSize = 4;
    const colors = ['#4a0a0a', '#6a1a1a', '#8b0000', '#a02020', '#ff4500', '#2a2a4a'];
    for (let py = -this.radius; py <= this.radius; py += pixelSize) {
      for (let px = -this.radius; px <= this.radius; px += pixelSize) {
        const dist = Math.sqrt(px * px + py * py);
        if (dist <= this.radius - pixelSize) {
          let colorIndex = 0;
          if (Math.abs(px) < 8 && Math.abs(py) < 12) colorIndex = 5;
          else if (dist < this.radius * 0.3) colorIndex = 4;
          else if (dist < this.radius * 0.6) colorIndex = 3;
          else if (dist < this.radius * 0.85) colorIndex = 2;
          else colorIndex = Math.floor(Math.random() * 2);
          this.pixels.push({ x: px, y: py, color: colors[colorIndex] });
        }
      }
    }
  }

  update(deltaTime: number, currentTime: number, targetX: number, targetY: number): Bullet | null {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;
    if (this.hitFlashTime > 0) this.hitFlashTime -= deltaTime;

    if (this.shieldRegenRate > 0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * deltaTime);
    }

    if (this.type === EnemyType.FIGHTER || this.type === EnemyType.BOSS) {
      const angle = Math.atan2(targetY - this.y, targetX - this.x);
      this.vx = this.vx * 0.98 + Math.cos(angle) * 2;
      this.vy = this.vy * 0.98 + Math.sin(angle) * 2;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const maxSpeed = this.type === EnemyType.BOSS ? 40 : 150;
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }
    }

    if (this.fireRate > 0 && currentTime - this.lastFireTime >= this.fireRate) {
      this.lastFireTime = currentTime;
      const angle = Math.atan2(targetY - this.y, targetX - this.x);
      if (this.type === EnemyType.BOSS) {
        return new Bullet(this.x, this.y, angle, 250, 10, true);
      }
      return new Bullet(this.x, this.y, angle, 200, 8, true);
    }

    return null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    if (this.shield > 0) {
      const shieldAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.005);
      ctx.strokeStyle = `rgba(100, 200, 255, ${shieldAlpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#64c8ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);

    const flash = this.hitFlashTime > 0;
    for (const p of this.pixels) {
      ctx.fillStyle = flash ? '#ffffff' : p.color;
      if (flash) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
      }
      ctx.fillRect(p.x, p.y, 4, 4);
    }

    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  takeDamage(damage: number): number {
    this.hitFlashTime = 0.1;
    if (this.shield > 0) {
      const shieldDamage = Math.min(this.shield, damage);
      this.shield -= shieldDamage;
      damage -= shieldDamage;
    }
    this.hp = Math.max(0, this.hp - damage);
    return damage;
  }

  isDestroyed(): boolean {
    return this.hp <= 0;
  }
}

export function checkCollision(a: { x: number; y: number; radius: number }, b: { x: number; y: number; radius: number }): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < a.radius + b.radius;
}
