export enum EnemyType {
  ASTEROID_SMALL = 'asteroid_small',
  ASTEROID_MEDIUM = 'asteroid_medium',
  ASTEROID_LARGE = 'asteroid_large',
  FIGHTER = 'fighter',
  BOSS = 'boss'
}

export const COLORS = {
  NEON_GREEN: '#39ff14',
  NEON_RED: '#ff4500',
  NEON_ORANGE: '#ff6600',
  NEON_YELLOW: '#ffaa00',
  SHIELD_BLUE: '#64c8ff',
  SHIELD_LIGHT: '#88ddff',
  SHIELD_DARK: '#4a90c0',
  PLANET_1: '#4a3a7a',
  PLANET_2: '#5a4a8a',
  PLANET_3: '#6a5a9a',
  PLANET_4: '#7a6aaa',
  ASTEROID_1: '#5a5a5a',
  ASTEROID_2: '#6a6a6a',
  ASTEROID_3: '#7a7a7a',
  ASTEROID_4: '#4a4a4a',
  ASTEROID_5: '#8a8a8a',
  ASTEROID_6: '#3a3a3a',
  FIGHTER_DARK: '#8b0000',
  FIGHTER_MID: '#ff4500',
  FIGHTER_LIGHT: '#ffff00',
  BOSS_1: '#4a0a0a',
  BOSS_2: '#6a1a1a',
  BOSS_3: '#8b0000',
  BOSS_4: '#a02020',
  BOSS_5: '#ff4500',
  BOSS_COCKPIT: '#2a2a4a'
} as const;

export interface EnemyConfig {
  hp: number;
  radius: number;
  damage: number;
  score: number;
  speed: number;
  fireRate?: number;
  shield?: number;
  shieldRegen?: number;
}

export const ENEMY_CONFIG: Record<EnemyType, EnemyConfig> = {
  [EnemyType.ASTEROID_SMALL]: { hp: 30, radius: 15, damage: 10, score: 50, speed: 60 },
  [EnemyType.ASTEROID_MEDIUM]: { hp: 50, radius: 22, damage: 15, score: 100, speed: 45 },
  [EnemyType.ASTEROID_LARGE]: { hp: 80, radius: 30, damage: 20, score: 200, speed: 30 },
  [EnemyType.FIGHTER]: { hp: 15, radius: 12, damage: 5, score: 150, speed: 120, fireRate: 2000 },
  [EnemyType.BOSS]: { hp: 500, radius: 50, damage: 30, score: 1000, speed: 40, fireRate: 800, shield: 200, shieldRegen: 5 }
} as const;

export const DEFAULT_ENEMY_TYPE = EnemyType.ASTEROID_SMALL;

export interface Vector2 {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  radius: number;
}

export interface GameObject {
  x: number;
  y: number;
  update(deltaTime: number, ...args: unknown[]): unknown;
  render(ctx: CanvasRenderingContext2D): void;
  getBounds(): Bounds;
}

export interface ShieldHitResult {
  shieldDamage: number;
  hpDamage: number;
  shieldBroken: boolean;
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
    this.color = isEnemy ? COLORS.NEON_RED : COLORS.NEON_GREEN;
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

  getBounds(): Bounds {
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
      COLORS.PLANET_1, COLORS.PLANET_2, COLORS.PLANET_3, COLORS.PLANET_4,
      '#3a2a6a', '#2a1a5a', COLORS.PLANET_2, COLORS.PLANET_1
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

  getBounds(): Bounds {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  takeDamage(damage: number): void {
    this.currentHp = Math.max(0, this.currentHp - damage);
  }

  getHpPercent(): number {
    return this.currentHp / this.maxHp;
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
    ctx.shadowColor = COLORS.NEON_GREEN;
    ctx.shadowBlur = 8;
    ctx.fillRect(18, -2, 4, 4);

    ctx.restore();
  }

  getBounds(): Bounds {
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
  shieldFlashTime: number;
  shieldHitIntensity: number;
  shieldCracks: { angle: number; startR: number; segments: { len: number; angle: number }[] }[];
  pixels: { x: number; y: number; color: string }[];
  hitFlashTime: number;
  wasShieldBroken: boolean;

  constructor(type: EnemyType, x: number, y: number, targetX: number, targetY: number) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.lastFireTime = 0;
    this.hitFlashTime = 0;
    this.shieldFlashTime = 0;
    this.shieldHitIntensity = 0;
    this.shieldCracks = [];
    this.pixels = [];
    this.wasShieldBroken = false;

    const angle = Math.atan2(targetY - y, targetX - x);
    const spread = (Math.random() - 0.5) * 0.5;

    const config = ENEMY_CONFIG[type] || ENEMY_CONFIG[DEFAULT_ENEMY_TYPE];

    this.hp = config.hp;
    this.maxHp = config.hp;
    this.radius = config.radius;
    this.damage = config.damage;
    this.score = config.score;
    this.vx = Math.cos(angle + spread) * config.speed;
    this.vy = Math.sin(angle + spread) * config.speed;

    this.fireRate = config.fireRate ?? 0;
    this.shield = config.shield ?? 0;
    this.maxShield = config.shield ?? 0;
    this.shieldRegenRate = config.shieldRegen ?? 0;

    if ((config.shield ?? 0) > 0) {
      this.generateShieldCracks();
    }

    switch (type) {
      case EnemyType.ASTEROID_SMALL:
      case EnemyType.ASTEROID_MEDIUM:
      case EnemyType.ASTEROID_LARGE:
        this.generateAsteroidPixels(config.radius);
        break;
      case EnemyType.FIGHTER:
        this.generateFighterPixels();
        break;
      case EnemyType.BOSS:
        this.generateBossPixels();
        break;
      default:
        this.generateAsteroidPixels(config.radius);
    }
  }

  private generateShieldCracks(): void {
    this.shieldCracks = [];
    const crackCount = 6;
    for (let i = 0; i < crackCount; i++) {
      const segments: { len: number; angle: number }[] = [];
      const segCount = 3 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segCount; s++) {
        segments.push({
          len: 8 + Math.random() * 10,
          angle: (Math.random() - 0.5) * 1.0
        });
      }
      this.shieldCracks.push({
        angle: (i / crackCount) * Math.PI * 2 + Math.random() * 0.3,
        startR: this.radius + 2,
        segments
      });
    }
  }

  private generateAsteroidPixels(size: number): void {
    const pixelSize = 4;
    const colors = [
      COLORS.ASTEROID_1, COLORS.ASTEROID_2, COLORS.ASTEROID_3,
      COLORS.ASTEROID_4, COLORS.ASTEROID_5, COLORS.ASTEROID_6
    ];
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
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 1, 2, 1, 1, 0],
      [1, 1, 2, 2, 2, 1, 1],
      [1, 2, 2, 3, 2, 2, 1],
      [0, 1, 1, 2, 1, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
    ];
    const colors = ['transparent', COLORS.FIGHTER_DARK, COLORS.FIGHTER_MID, COLORS.FIGHTER_LIGHT];
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
    const colors = [
      COLORS.BOSS_1, COLORS.BOSS_2, COLORS.BOSS_3,
      COLORS.BOSS_4, COLORS.BOSS_5, COLORS.BOSS_COCKPIT
    ];
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
    if (this.shieldFlashTime > 0) this.shieldFlashTime -= deltaTime;
    if (this.shieldHitIntensity > 0) this.shieldHitIntensity = Math.max(0, this.shieldHitIntensity - deltaTime * 3);

    if (this.shieldRegenRate > 0 && this.shield < this.maxShield && this.shieldFlashTime <= 0) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * deltaTime);
    }

    if (this.type === EnemyType.FIGHTER || this.type === EnemyType.BOSS) {
      const angle = Math.atan2(targetY - this.y, targetX - this.x);
      this.vx = this.vx * 0.98 + Math.cos(angle) * 2;
      this.vy = this.vy * 0.98 + Math.sin(angle) * 2;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const config = ENEMY_CONFIG[this.type] || ENEMY_CONFIG[DEFAULT_ENEMY_TYPE];
      const maxSpeed = config.speed;
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

  private drawPixelatedPolygon(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number, sides: number,
    rotation: number, pixelSize: number,
    fillColor: string, strokeColor: string,
    alpha: number
  ): void {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = rotation + (i * Math.PI * 2) / sides;
      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      });
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    for (let py = Math.floor(minY / pixelSize) * pixelSize; py <= maxY; py += pixelSize) {
      for (let px = Math.floor(minX / pixelSize) * pixelSize; px <= maxX; px += pixelSize) {
        if (this.isPointInPolygon(px + pixelSize / 2, py + pixelSize / 2, points)) {
          ctx.fillStyle = fillColor;
          ctx.fillRect(Math.floor(px), Math.floor(py), pixelSize, pixelSize);
        }
      }
    }

    ctx.fillStyle = strokeColor;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      this.drawPixelatedLine(ctx, p1.x, p1.y, p2.x, p2.y, pixelSize);
    }

    ctx.restore();
  }

  private isPointInPolygon(px: number, py: number, points: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private drawPixelatedLine(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    pixelSize: number
  ): void {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? pixelSize : -pixelSize;
    const sy = y1 < y2 ? pixelSize : -pixelSize;
    let err = dx - dy;
    let x = Math.floor(x1 / pixelSize) * pixelSize;
    let y = Math.floor(y1 / pixelSize) * pixelSize;
    const endX = Math.floor(x2 / pixelSize) * pixelSize;
    const endY = Math.floor(y2 / pixelSize) * pixelSize;

    while (true) {
      ctx.fillRect(x, y, pixelSize, pixelSize);
      if (x === endX && y === endY) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  private drawShieldHitEffect(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    shieldRadius: number
  ): void {
    if (this.shieldHitIntensity <= 0) return;

    const intensity = this.shieldHitIntensity;
    const rings = 3;
    for (let r = 0; r < rings; r++) {
      const ringRadius = shieldRadius + r * 4 + intensity * 8;
      const ringAlpha = (1 - r / rings) * intensity * 0.6;
      ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawShieldCracksOnHit(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    shieldRadius: number,
    pixelSize: number,
    shieldRatio: number
  ): void {
    if (this.shieldCracks.length === 0) return;

    const crackAlpha = Math.max(this.shieldHitIntensity * 0.8, (1 - shieldRatio) * 0.6);
    if (crackAlpha <= 0.05) return;

    ctx.save();
    ctx.fillStyle = `rgba(255, 100, 100, ${crackAlpha})`;
    ctx.shadowColor = '#ff6666';
    ctx.shadowBlur = 3;

    const extendRatio = shieldRadius / (this.radius + 8);
    for (const crack of this.shieldCracks) {
      const startR = crack.startR * extendRatio;
      let currentX = cx + Math.cos(crack.angle) * startR;
      let currentY = cy + Math.sin(crack.angle) * startR;
      let currentAngle = crack.angle;

      for (const seg of crack.segments) {
        const segLen = seg.len * extendRatio;
        const endX = currentX + Math.cos(currentAngle + seg.angle) * segLen;
        const endY = currentY + Math.sin(currentAngle + seg.angle) * segLen;
        this.drawPixelatedLine(ctx, currentX, currentY, endX, endY, pixelSize);
        currentX = endX;
        currentY = endY;
        currentAngle += seg.angle;
      }
    }

    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    if (this.type === EnemyType.BOSS) {
      const shieldRadius = this.radius + 14;
      const pixelSize = 4;
      const shieldRatio = this.maxShield > 0 ? this.shield / this.maxShield : 0;
      const isFlashing = this.shieldFlashTime > 0;
      const flashFlicker = isFlashing ? (Math.sin(this.shieldFlashTime * 80) > 0 ? 1 : 0.4) : 1;

      if (this.shield > 0) {
        const baseAlpha = 0.35 + 0.15 * Math.sin(Date.now() * 0.006);
        const intensityAlpha = baseAlpha + this.shieldHitIntensity * 0.4;

        const fillColor = isFlashing
          ? `rgba(255, 255, 255, ${0.7 * flashFlicker})`
          : `rgba(80, 160, 255, ${0.25 + this.shieldHitIntensity * 0.2})`;
        const strokeColor = isFlashing
          ? '#ffffff'
          : COLORS.SHIELD_BLUE;

        ctx.shadowColor = isFlashing ? '#ffffff' : COLORS.SHIELD_BLUE;
        ctx.shadowBlur = (isFlashing ? 25 : 12) * flashFlicker + this.shieldHitIntensity * 10;

        this.drawPixelatedPolygon(
          ctx, cx, cy, shieldRadius, 8, this.rotation * 0.3,
          pixelSize, fillColor, strokeColor, intensityAlpha
        );

        this.drawPixelatedPolygon(
          ctx, cx, cy, shieldRadius - 6, 6, -this.rotation * 0.2,
          pixelSize, 'rgba(100, 180, 255, 0.15)', COLORS.SHIELD_LIGHT, baseAlpha * 0.7
        );

        this.drawShieldCracksOnHit(ctx, cx, cy, shieldRadius, pixelSize, shieldRatio);

        this.drawShieldHitEffect(ctx, cx, cy, shieldRadius);
      } else if (this.maxShield > 0) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';

        const fragmentCount = 8;
        for (let i = 0; i < fragmentCount; i++) {
          const angle = this.rotation * 0.3 + (i * Math.PI * 2) / fragmentCount;
          const fragRadius = shieldRadius * (0.6 + Math.random() * 0.3);
          const fragCx = cx + Math.cos(angle) * fragRadius * 0.5;
          const fragCy = cy + Math.sin(angle) * fragRadius * 0.5;
          const fragSize = 4 + Math.random() * 6;

          for (let py = -fragSize; py <= fragSize; py += pixelSize) {
            for (let px = -fragSize; px <= fragSize; px += pixelSize) {
              if (Math.random() > 0.5 && Math.sqrt(px * px + py * py) <= fragSize) {
                ctx.fillRect(
                  Math.floor(fragCx + px),
                  Math.floor(fragCy + py),
                  pixelSize, pixelSize
                );
              }
            }
          }
        }
        ctx.restore();
      }
    } else {
      if (this.shield > 0) {
        const shieldAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.005);
        ctx.strokeStyle = `rgba(100, 200, 255, ${shieldAlpha})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = COLORS.SHIELD_BLUE;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, this.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);

    const flash = this.hitFlashTime > 0;
    const flashFlicker = flash ? (Math.sin(this.hitFlashTime * 100) > 0 ? 1 : 0.5) : 1;

    for (const p of this.pixels) {
      ctx.fillStyle = flash ? `rgba(255, 255, 255, ${flashFlicker})` : p.color;
      if (flash) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10 * flashFlicker;
      }
      ctx.fillRect(p.x, p.y, 4, 4);
    }

    ctx.restore();
  }

  getBounds(): Bounds {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  takeDamage(damage: number): ShieldHitResult {
    this.hitFlashTime = 0.1;

    const result: ShieldHitResult = {
      shieldDamage: 0,
      hpDamage: 0,
      shieldBroken: false
    };

    if (this.shield > 0) {
      const shieldDamage = Math.min(this.shield, damage);
      this.shield -= shieldDamage;
      damage -= shieldDamage;
      result.shieldDamage = shieldDamage;

      this.shieldFlashTime = 0.2;
      this.shieldHitIntensity = Math.min(1, this.shieldHitIntensity + shieldDamage / this.maxShield * 1.5);

      if (this.shield <= 0 && !this.wasShieldBroken) {
        this.wasShieldBroken = true;
        result.shieldBroken = true;
      }
    }

    this.hp = Math.max(0, this.hp - damage);
    result.hpDamage = damage;

    return result;
  }

  isDestroyed(): boolean {
    return this.hp <= 0;
  }

  getHpPercent(): number {
    return this.hp / this.maxHp;
  }

  getShieldPercent(): number {
    if (this.maxShield <= 0) return 0;
    return this.shield / this.maxShield;
  }
}

export function checkCollision(a: Bounds, b: Bounds): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distSq = dx * dx + dy * dy;
  const radiusSum = a.radius + b.radius;
  return distSq < radiusSum * radiusSum;
}

export function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
