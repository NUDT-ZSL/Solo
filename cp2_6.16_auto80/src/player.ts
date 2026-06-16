// ===== 类型定义 =====
export interface Vec2 { x: number; y: number; }

export interface Bullet {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  damage: number;
}

export interface SlowField {
  active: boolean;
  x: number; y: number;
  radius: number;
  duration: number;
  maxDuration: number;
}

export interface EngineParticle {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface LevelUpEffect {
  active: boolean;
  flashTimer: number;       // 0.3秒闪光
  flashMax: number;
  textTimer: number;        // 2秒文字上浮
  textMax: number;
  textY: number;
}

export interface PlayerStats {
  x: number; y: number;
  angle: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  score: number;
  weaponLevel: number;
  bulletSpeed: number;
  fireRate: number;         // 每秒发数
  fireCooldown: number;
  slowCooldown: number;
  slowCooldownMax: number;
  slowField: SlowField;
  level: number;
  levelUp: LevelUpEffect;
}

// ===== 输入状态 =====
export interface InputState {
  keys: { [k: string]: boolean };
  mouseX: number; mouseY: number;
  mouseDown: boolean;
  rightDown: boolean;
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const BASE_BULLET_POOL = 120;
const ENGINE_PARTICLE_POOL = 120;

export class Player {
  // 位置与运动
  x: number = CANVAS_W / 2;
  y: number = CANVAS_H / 2;
  vx: number = 0;
  vy: number = 0;
  angle: number = 0;

  // 运动参数
  readonly maxSpeed: number = 200;       // 像素/秒
  readonly acceleration: number = 0.5;   // 加速度系数（0..1线性插值）
  readonly friction: number = 0.92;      // 每帧摩擦

  // 状态
  shield: number = 100;
  readonly maxShield: number = 100;
  energy: number = 50;
  readonly maxEnergy: number = 100;
  score: number = 0;
  level: number = 1;
  alive: boolean = true;

  // 武器
  weaponLevel: number = 1;
  bulletSpeed: number = 800;             // 像素/秒
  fireRate: number = 3;                  // 每秒发数
  fireCooldown: number = 0;              // 剩余冷却秒数

  // 减速力场
  slowCooldown: number = 0;
  readonly slowCooldownMax: number = 5;
  slowField: SlowField = {
    active: false, x: 0, y: 0,
    radius: 150, duration: 0, maxDuration: 1.5,
  };

  // 星暴减速系数（由 Environment 写入）
  starstormSlowFactor: number = 1.0;     // 1.0=正常，0.7=减速30%

  // 对象池：子弹
  bullets: Bullet[] = [];
  readonly bulletPoolSize = BASE_BULLET_POOL;

  // 对象池：引擎尾焰粒子
  engineParticles: EngineParticle[] = [];
  readonly enginePoolSize = ENGINE_PARTICLE_POOL;

  // 升级特效
  levelUp: LevelUpEffect = {
    active: false,
    flashTimer: 0, flashMax: 0.3,
    textTimer: 0, textMax: 2.0,
    textY: 0,
  };

  // 红色脉冲边框（护盾<30时）
  lowShieldPulse: number = 0;

  constructor() {
    this.initPools();
  }

  // ===== 对象池初始化 =====
  private initPools(): void {
    for (let i = 0; i < this.bulletPoolSize; i++) {
      this.bullets.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        radius: 3, damage: 1,
      });
    }
    for (let i = 0; i < this.enginePoolSize; i++) {
      this.engineParticles.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, size: 0,
      });
    }
  }

  reset(): void {
    this.x = CANVAS_W / 2;
    this.y = CANVAS_H / 2;
    this.vx = 0; this.vy = 0;
    this.shield = 100;
    this.energy = 50;
    this.score = 0;
    this.level = 1;
    this.weaponLevel = 1;
    this.bulletSpeed = 800;
    this.fireRate = 3;
    this.fireCooldown = 0;
    this.slowCooldown = 0;
    this.slowField.active = false;
    this.alive = true;
    this.starstormSlowFactor = 1.0;
    this.levelUp.active = false;
    // 清空池中激活项
    for (const b of this.bullets) b.active = false;
    for (const p of this.engineParticles) p.active = false;
  }

  // ===== 从对象池获取一个空闲对象 =====
  private acquireBullet(): Bullet | null {
    for (let i = 0; i < this.bulletPoolSize; i++) {
      if (!this.bullets[i].active) return this.bullets[i];
    }
    return null;
  }

  private acquireEngineParticle(): EngineParticle | null {
    for (let i = 0; i < this.enginePoolSize; i++) {
      if (!this.engineParticles[i].active) return this.engineParticles[i];
    }
    return null;
  }

  // ===== 对外接口：增加护盾 =====
  addShield(n: number): void {
    this.shield = Math.min(this.maxShield, this.shield + n);
  }
  damageShield(n: number): void {
    this.shield -= n;
    if (this.shield <= 0) {
      this.shield = 0;
      this.alive = false;
    }
  }
  addEnergy(n: number): void {
    this.energy = Math.min(this.maxEnergy, this.energy + n);
    if (this.energy >= this.maxEnergy && this.weaponLevel < 2) {
      this.upgradeWeapon();
    }
  }
  addScore(n: number): void {
    this.score += n;
  }

  // ===== 武器升级 =====
  private upgradeWeapon(): void {
    this.weaponLevel = 2;
    this.bulletSpeed = 1000;
    this.fireRate = 4;
    this.energy = 0; // 重置能量
    this.level += 1;
    // 触发特效
    this.levelUp.active = true;
    this.levelUp.flashTimer = this.levelUp.flashMax;
    this.levelUp.textTimer = this.levelUp.textMax;
    this.levelUp.textY = CANVAS_H + 40;
  }

  // ===== 发射子弹 =====
  private tryFire(input: InputState): void {
    if (this.fireCooldown > 0) return;
    if (!input.mouseDown) return;
    const b = this.acquireBullet();
    if (!b) return;

    // 从飞船尖端发出
    const noseX = this.x + Math.cos(this.angle) * 24;
    const noseY = this.y + Math.sin(this.angle) * 24;
    b.active = true;
    b.x = noseX; b.y = noseY;
    b.radius = 3; // 直径6px
    b.vx = Math.cos(this.angle) * this.bulletSpeed;
    b.vy = Math.sin(this.angle) * this.bulletSpeed;
    b.damage = 1;

    this.fireCooldown = 1 / this.fireRate;
  }

  // ===== 释放减速力场 =====
  private trySlowField(input: InputState): void {
    if (!input.rightDown) return;
    if (this.slowCooldown > 0) return;
    this.slowField.active = true;
    this.slowField.x = this.x;
    this.slowField.y = this.y;
    this.slowField.duration = this.slowField.maxDuration;
    this.slowCooldown = this.slowCooldownMax;
  }

  // ===== 生成引擎尾焰粒子 =====
  private spawnEngineParticle(dt: number): void {
    // 飞船尾部（angle + PI）
    const tx = this.x + Math.cos(this.angle + Math.PI) * 16;
    const ty = this.y + Math.sin(this.angle + Math.PI) * 16;
    // 根据dt控制生成密度
    const spawnChance = 0.8;
    if (Math.random() < spawnChance) {
      const p = this.acquireEngineParticle();
      if (p) {
        const spread = (Math.random() - 0.5) * 0.8;
        const dir = this.angle + Math.PI + spread;
        const speed = 80 + Math.random() * 120;
        p.active = true;
        p.x = tx + (Math.random() - 0.5) * 4;
        p.y = ty + (Math.random() - 0.5) * 4;
        p.vx = Math.cos(dir) * speed;
        p.vy = Math.sin(dir) * speed;
        p.maxLife = 0.35 + Math.random() * 0.25;
        p.life = p.maxLife;
        p.size = 2 + Math.random() * 3;
      }
    }
  }

  // ===== 主更新 =====
  update(dt: number, input: InputState): void {
    if (!this.alive) return;

    // --- 朝向鼠标 ---
    this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

    // --- 基于 WASD 计算目标方向 ---
    let ix = 0, iy = 0;
    if (input.keys['w'] || input.keys['W'] || input.keys['ArrowUp']) iy -= 1;
    if (input.keys['s'] || input.keys['S'] || input.keys['ArrowDown']) iy += 1;
    if (input.keys['a'] || input.keys['A'] || input.keys['ArrowLeft']) ix -= 1;
    if (input.keys['d'] || input.keys['D'] || input.keys['ArrowRight']) ix += 1;

    // 归一化方向
    const ilen = Math.hypot(ix, iy);
    if (ilen > 0) { ix /= ilen; iy /= ilen; }

    // --- 目标速度（考虑星暴减速） ---
    const effectiveMaxSpeed = this.maxSpeed * this.starstormSlowFactor;
    const targetVx = ix * effectiveMaxSpeed;
    const targetVy = iy * effectiveMaxSpeed;

    // 用加速度系数插值（按dt修正）
    // 每毫秒加速系数：accel_per_sec = 1 - (1-acceleration)^(dt*60)
    const t = 1 - Math.pow(1 - this.acceleration, dt * 60);
    this.vx += (targetVx - this.vx) * t;
    this.vy += (targetVy - this.vy) * t;

    // 无输入时摩擦衰减
    if (ilen === 0) {
      const fric = Math.pow(this.friction, dt * 60);
      this.vx *= fric;
      this.vy *= fric;
    }

    // --- 积分位移 ---
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // --- 边界（飞船中心不超出画布） ---
    const margin = 22;
    if (this.x < margin) { this.x = margin; this.vx = 0; }
    if (this.x > CANVAS_W - margin) { this.x = CANVAS_W - margin; this.vx = 0; }
    if (this.y < margin) { this.y = margin; this.vy = 0; }
    if (this.y > CANVAS_H - margin) { this.y = CANVAS_H - margin; this.vy = 0; }

    // --- 射击 / 技能 ---
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.slowCooldown = Math.max(0, this.slowCooldown - dt);
    this.tryFire(input);
    this.trySlowField(input);

    // --- 减速力场持续时间 ---
    if (this.slowField.active) {
      this.slowField.duration -= dt;
      if (this.slowField.duration <= 0) this.slowField.active = false;
    }

    // --- 更新子弹 ---
    for (let i = 0; i < this.bulletPoolSize; i++) {
      const b = this.bullets[i];
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > CANVAS_W + 20 || b.y < -20 || b.y > CANVAS_H + 20) {
        b.active = false;
      }
    }

    // --- 引擎粒子 ---
    this.spawnEngineParticle(dt);
    for (let i = 0; i < this.enginePoolSize; i++) {
      const p = this.engineParticles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96; p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }

    // --- 升级特效计时 ---
    if (this.levelUp.active) {
      this.levelUp.flashTimer = Math.max(0, this.levelUp.flashTimer - dt);
      if (this.levelUp.textTimer > 0) {
        this.levelUp.textTimer -= dt;
        // 从下向上移动：textY从 CANVAS_H+40 -> -40
        const prog = 1 - this.levelUp.textTimer / this.levelUp.textMax;
        this.levelUp.textY = CANVAS_H + 40 - prog * (CANVAS_H + 80);
      }
      if (this.levelUp.flashTimer <= 0 && this.levelUp.textTimer <= 0) {
        this.levelUp.active = false;
      }
    }

    // --- 低护盾脉冲 ---
    if (this.shield < 30) {
      this.lowShieldPulse = (this.lowShieldPulse + dt) % 0.5;
    } else {
      this.lowShieldPulse = 0;
    }
  }

  // ===== 对外：获取飞船碰撞半径 =====
  getRadius(): number { return 18; }

  // ===== 导出只读状态给渲染器 =====
  getStats(): PlayerStats {
    return {
      x: this.x, y: this.y,
      angle: this.angle,
      shield: this.shield,
      maxShield: this.maxShield,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      score: this.score,
      weaponLevel: this.weaponLevel,
      bulletSpeed: this.bulletSpeed,
      fireRate: this.fireRate,
      fireCooldown: this.fireCooldown,
      slowCooldown: this.slowCooldown,
      slowCooldownMax: this.slowCooldownMax,
      slowField: { ...this.slowField },
      level: this.level,
      levelUp: { ...this.levelUp },
    };
  }
}
