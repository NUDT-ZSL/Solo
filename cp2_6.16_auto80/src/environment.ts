// ===== 环境模块：星云背景、陨石、水晶、星暴 =====

export interface Meteor {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;        // 半径15-30
  rotation: number;
  rotSpeed: number;
  hp: number;            // 小陨石1击，大陨石2击
  color: string;         // 战斗红色 #ff4757
  brown: string;         // 漂浮陨石棕色 #8b5e3c
  isCombat: boolean;     // true=红色战斗陨石(扣15护盾,击碎+5分); false=棕色漂浮(撞击不扣血,也无分)
  fragments: MeteorFragment[];
}

export interface MeteorFragment {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
  rot: number;
  rotSpeed: number;
}

export interface Crystal {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  rotation: number;
  rotSpeed: number;
  radius: number;
  hp: number;
}

export interface StarstormParticle {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  size: number;          // 2-4
  life: number;
  maxLife: number;
}

export interface GlowParticle {
  active: boolean;
  x: number; y: number;
  size: number;
  alpha: number;
  drift: number;         // 漂浮周期相位
}

// 预生成的碎块对象池大小
const FRAGMENT_POOL_PER_METEOR = 8;
const METEOR_POOL = 80;
const CRYSTAL_POOL = 60;
const STARSTORM_POOL = 220;   // 控制在 300 总粒子内（引擎120+星暴220 = 超过，所以星暴控制在180）
const STARSTORM_POOL_ADJ = 180;
const GLOW_POOL = 80;

const CANVAS_W = 800;
const CANVAS_H = 600;

export class Environment {
  ctx: CanvasRenderingContext2D;
  width: number = CANVAS_W;
  height: number = CANVAS_H;

  // ==== 计时 ====
  time: number = 0;            // 游戏累计秒
  meteorTimer: number = 0;
  readonly meteorInterval: number = 5;   // 每5秒一波
  crystalTimer: number = 0;
  readonly crystalInterval: number = 3.2;

  // ==== 星暴事件 ====
  starstormTimer: number = 0;
  readonly starstormInterval: number = 15; // 每15秒一次
  starstormActive: boolean = false;
  starstormDuration: number = 0;
  readonly starstormDurationMax: number = 5;
  // 对外输出：星暴期间应给玩家的减速系数（0.7 = 减速30%）
  readonly starstormSlowFactor: number = 0.7;
  readonly normalSlowFactor: number = 1.0;

  // ==== 对象池 ====
  meteors: Meteor[] = [];
  crystals: Crystal[] = [];
  starstormParticles: StarstormParticle[] = [];
  glowParticles: GlowParticle[] = [];
  // 预分配碎块：用一维数组，由每个 meteor 维护 index 范围
  fragments: MeteorFragment[] = [];
  readonly FRAG_POOL_SIZE = METEOR_POOL * FRAGMENT_POOL_PER_METEOR;

  // ==== 星云噪声缓存 ====
  // 用简单的多层正弦模拟 Perlin 流动（纯Canvas2D实现，无需库）
  nebulaTime: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initPools();
  }

  private initPools(): void {
    // 陨石
    for (let i = 0; i < METEOR_POOL; i++) {
      const frags: MeteorFragment[] = [];
      this.meteors.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        radius: 20, rotation: 0, rotSpeed: 0, hp: 1,
        color: '#ff4757', brown: '#8b5e3c', isCombat: false,
        fragments: frags,
      });
    }
    // 水晶
    for (let i = 0; i < CRYSTAL_POOL; i++) {
      this.crystals.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        rotation: 0, rotSpeed: 0, radius: 14, hp: 1,
      });
    }
    // 碎块
    for (let i = 0; i < this.FRAG_POOL_SIZE; i++) {
      this.fragments.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, size: 0, rot: 0, rotSpeed: 0,
      });
    }
    // 星暴粒子
    for (let i = 0; i < STARSTORM_POOL_ADJ; i++) {
      this.starstormParticles.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        size: 0, life: 0, maxLife: 0,
      });
    }
    // 微光粒子
    for (let i = 0; i < GLOW_POOL; i++) {
      this.glowParticles.push({
        active: true,
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        size: 0.6 + Math.random() * 1.8,
        alpha: 0.15 + Math.random() * 0.45,
        drift: Math.random() * Math.PI * 2,
      });
    }
  }

  reset(): void {
    this.time = 0;
    this.meteorTimer = 2; // 开局2秒后第一波
    this.crystalTimer = 1.5;
    this.stormStartDelay();
    for (const m of this.meteors) m.active = false;
    for (const c of this.crystals) c.active = false;
    for (const f of this.fragments) f.active = false;
    for (const s of this.starstormParticles) s.active = false;
  }

  private stormStartDelay(): void {
    this.starstormTimer = 8;   // 开局8秒后第一次星暴
    this.starstormActive = false;
    this.starstormDuration = 0;
  }

  // ===== 获取一个空闲陨石 =====
  private acquireMeteor(): Meteor | null {
    for (let i = 0; i < METEOR_POOL; i++) {
      if (!this.meteors[i].active) return this.meteors[i];
    }
    return null;
  }
  private acquireCrystal(): Crystal | null {
    for (let i = 0; i < CRYSTAL_POOL; i++) {
      if (!this.crystals[i].active) return this.crystals[i];
    }
    return null;
  }
  private acquireFragment(): MeteorFragment | null {
    for (let i = 0; i < this.FRAG_POOL_SIZE; i++) {
      if (!this.fragments[i].active) return this.fragments[i];
    }
    return null;
  }
  private acquireStormParticle(): StarstormParticle | null {
    for (let i = 0; i < STARSTORM_POOL_ADJ; i++) {
      if (!this.starstormParticles[i].active) return this.starstormParticles[i];
    }
    return null;
  }

  // ===== 在画布边缘随机生成位置 + 朝内方向 =====
  private edgeSpawn(): { x: number; y: number; vx: number; vy: number } {
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const speed = 30 + Math.random() * 70;
    if (edge === 0) { // 上
      x = Math.random() * CANVAS_W; y = -40;
    } else if (edge === 1) { // 右
      x = CANVAS_W + 40; y = Math.random() * CANVAS_H;
    } else if (edge === 2) { // 下
      x = Math.random() * CANVAS_W; y = CANVAS_H + 40;
    } else { // 左
      x = -40; y = Math.random() * CANVAS_H;
    }
    // 朝屏幕中心附近的一个随机点
    const tx = CANVAS_W * 0.2 + Math.random() * CANVAS_W * 0.6;
    const ty = CANVAS_H * 0.2 + Math.random() * CANVAS_H * 0.6;
    const dx = tx - x, dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    return { x, y, vx: (dx / len) * speed, vy: (dy / len) * speed };
  }

  // ===== 生成一波漂浮陨石 =====
  private spawnMeteorWave(): void {
    const count = 4 + Math.floor(Math.random() * 3); // 4-6
    for (let i = 0; i < count; i++) {
      const m = this.acquireMeteor();
      if (!m) break;
      const sp = this.edgeSpawn();
      const isCombat = Math.random() < 0.6; // 60%战斗红色陨石, 40%棕色漂浮
      const radius = 15 + Math.random() * 15; // 15-30
      m.active = true;
      m.x = sp.x; m.y = sp.y;
      // 漂浮陨石慢一些，战斗陨石稍快
      const speedMul = isCombat ? 1.15 : 0.9;
      m.vx = sp.vx * speedMul; m.vy = sp.vy * speedMul;
      m.radius = radius;
      m.rotation = Math.random() * Math.PI * 2;
      m.rotSpeed = (Math.random() - 0.5) * 1.6;
      m.isCombat = isCombat;
      // 大陨石 2 HP
      m.hp = radius > 23 ? 2 : 1;
    }
  }

  // ===== 生成一个水晶 =====
  private spawnCrystal(): void {
    const c = this.acquireCrystal();
    if (!c) return;
    const sp = this.edgeSpawn();
    c.active = true;
    c.x = sp.x; c.y = sp.y;
    c.vx = sp.vx * 0.7; c.vy = sp.vy * 0.7;
    c.rotation = 0;
    c.rotSpeed = (Math.random() - 0.5) * 2.0;
    c.radius = 14;
    c.hp = 1;
  }

  // ===== 触发星暴 =====
  private triggerStarstorm(): void {
    this.starstormActive = true;
    this.starstormDuration = this.starstormDurationMax;
    // 立刻预生成一批从四周涌入的粒子
    for (let i = 0; i < 60; i++) this.emitStormParticle();
  }

  private emitStormParticle(): void {
    const p = this.acquireStormParticle();
    if (!p) return;
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    let tx = 0, ty = 0;
    if (edge === 0) { x = Math.random() * CANVAS_W; y = -10; tx = Math.random() * CANVAS_W; ty = CANVAS_H + 20; }
    else if (edge === 1) { x = CANVAS_W + 10; y = Math.random() * CANVAS_H; tx = -20; ty = Math.random() * CANVAS_H; }
    else if (edge === 2) { x = Math.random() * CANVAS_W; y = CANVAS_H + 10; tx = Math.random() * CANVAS_W; ty = -20; }
    else { x = -10; y = Math.random() * CANVAS_H; tx = CANVAS_W + 20; ty = Math.random() * CANVAS_H; }
    const dx = tx - x, dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 80 + Math.random() * 120;
    p.active = true;
    p.x = x; p.y = y;
    p.vx = (dx / len) * speed;
    p.vy = (dy / len) * speed;
    p.size = 2 + Math.random() * 2;
    p.maxLife = 2 + Math.random() * 3;
    p.life = p.maxLife;
  }

  // ===== 产生陨石碎块特效 =====
  spawnMeteorFragments(m: Meteor): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const f = this.acquireFragment();
      if (!f) break;
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      f.active = true;
      f.x = m.x; f.y = m.y;
      f.vx = Math.cos(a) * s;
      f.vy = Math.sin(a) * s;
      f.maxLife = 0.4 + Math.random() * 0.6;
      f.life = f.maxLife;
      f.size = 2 + Math.random() * (m.radius * 0.25);
      f.rot = Math.random() * Math.PI * 2;
      f.rotSpeed = (Math.random() - 0.5) * 6;
    }
  }

  // ===== 对外：获取玩家减速系数（1.0=正常 0.7=星暴减速30%） =====
  getPlayerSlowFactor(): number {
    return this.starstormActive ? this.starstormSlowFactor : this.normalSlowFactor;
  }

  // ===== 对外：是否星暴中（用于渲染层的视觉判断，可省略） =====
  isStarstormActive(): boolean { return this.starstormActive; }

  // ===== 主更新 =====
  update(dt: number): void {
    this.time += dt;
    this.nebulaTime += dt;

    // --- 陨石生成 ---
    this.meteorTimer -= dt;
    if (this.meteorTimer <= 0) {
      this.meteorTimer += this.meteorInterval;
      this.spawnMeteorWave();
    }

    // --- 水晶生成 ---
    this.crystalTimer -= dt;
    if (this.crystalTimer <= 0) {
      this.crystalTimer += this.crystalInterval;
      this.spawnCrystal();
    }

    // --- 星暴定时 ---
    if (!this.starstormActive) {
      this.starstormTimer -= dt;
      if (this.starstormTimer <= 0) {
        this.triggerStarstorm();
      }
    } else {
      this.starstormDuration -= dt;
      // 持续补充粒子
      const emitCount = 3;
      for (let i = 0; i < emitCount; i++) this.emitStormParticle();
      if (this.starstormDuration <= 0) {
        this.starstormActive = false;
        this.starstormTimer = this.starstormInterval;
      }
    }

    // --- 更新陨石 ---
    for (let i = 0; i < METEOR_POOL; i++) {
      const m = this.meteors[i];
      if (!m.active) continue;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rotation += m.rotSpeed * dt;
      // 离开对面边缘太远则回收
      if (m.x < -100 || m.x > CANVAS_W + 100 || m.y < -100 || m.y > CANVAS_H + 100) {
        m.active = false;
      }
    }

    // --- 更新水晶 ---
    for (let i = 0; i < CRYSTAL_POOL; i++) {
      const c = this.crystals[i];
      if (!c.active) continue;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.rotSpeed * dt;
      if (c.x < -80 || c.x > CANVAS_W + 80 || c.y < -80 || c.y > CANVAS_H + 80) {
        c.active = false;
      }
    }

    // --- 更新碎块 ---
    for (let i = 0; i < this.FRAG_POOL_SIZE; i++) {
      const f = this.fragments[i];
      if (!f.active) continue;
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vx *= 0.96; f.vy *= 0.96;
      f.rot += f.rotSpeed * dt;
      f.life -= dt;
      if (f.life <= 0) f.active = false;
    }

    // --- 更新星暴粒子 ---
    for (let i = 0; i < STARSTORM_POOL_ADJ; i++) {
      const p = this.starstormParticles[i];
      if (!p.active) continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      // 超出范围或死亡
      if (p.life <= 0 || p.x < -40 || p.x > CANVAS_W + 40 || p.y < -40 || p.y > CANVAS_H + 40) {
        p.active = false;
      }
    }

    // --- 微光粒子 ---
    for (const g of this.glowParticles) {
      g.drift += dt * (0.4 + g.size * 0.15);
      g.x += Math.sin(g.drift * 0.9) * dt * 4;
      g.y += Math.cos(g.drift * 0.7) * dt * 3;
      if (g.x < 0) g.x += CANVAS_W;
      if (g.x > CANVAS_W) g.x -= CANVAS_W;
      if (g.y < 0) g.y += CANVAS_H;
      if (g.y > CANVAS_H) g.y -= CANVAS_H;
    }
  }

  // ===== 背景星云绘制（不依赖其他模块，直接调用ctx） =====
  drawNebulaBackground(): void {
    const ctx = this.ctx;
    // 主背景垂直渐变：#0f0c29 -> #302b63 -> #24243e
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(0.55, '#302b63');
    grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 多层流动噪声圆（模拟Perlin）
    const t = this.nebulaTime;
    const layers: { cx: number; cy: number; r: number; color: string; alpha: number; speedX: number; speedY: number }[] = [
      { cx: 200, cy: 180, r: 260, color: '90, 60, 180', alpha: 0.22, speedX: 0.25, speedY: 0.18 },
      { cx: 620, cy: 420, r: 300, color: '60, 120, 200', alpha: 0.18, speedX: -0.20, speedY: 0.22 },
      { cx: 400, cy: 300, r: 220, color: '140, 70, 180', alpha: 0.15, speedX: 0.15, speedY: -0.20 },
      { cx: 120, cy: 500, r: 200, color: '70, 90, 200', alpha: 0.16, speedX: 0.30, speedY: -0.12 },
    ];
    for (const L of layers) {
      const offX = Math.sin(t * L.speedX) * 30;
      const offY = Math.cos(t * L.speedY) * 28;
      const x = L.cx + offX, y = L.cy + offY;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, L.r);
      rg.addColorStop(0, `rgba(${L.color}, ${L.alpha})`);
      rg.addColorStop(1, `rgba(${L.color}, 0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // 微光粒子层
    for (const g of this.glowParticles) {
      const a = g.alpha * (0.7 + Math.sin(g.drift * 1.3) * 0.3);
      ctx.fillStyle = `rgba(200, 220, 255, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ===== 陨石绘制 =====
  drawMeteors(): void {
    const ctx = this.ctx;
    for (let i = 0; i < METEOR_POOL; i++) {
      const m = this.meteors[i];
      if (!m.active) continue;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rotation);
      // 主体
      const col = m.isCombat ? '#ff4757' : '#8b5e3c';
      const colDark = m.isCombat ? '#a8282d' : '#5a3e28';
      ctx.fillStyle = col;
      ctx.beginPath();
      const sides = 9;
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        // 不规则半径（依赖 meteor index 的伪随机）
        const seed = (i * 97 + s * 131) % 100;
        const rr = m.radius * (0.78 + (seed / 100) * 0.4);
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // 暗部（高光反向：下半部阴影）
      ctx.fillStyle = colDark;
      ctx.beginPath();
      ctx.arc(m.radius * 0.25, m.radius * 0.3, m.radius * 0.78, 0, Math.PI * 2);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 边缘发光
      ctx.strokeStyle = m.isCombat ? 'rgba(255,71,87,0.7)' : 'rgba(139,94,60,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    // 碎块
    for (let i = 0; i < this.FRAG_POOL_SIZE; i++) {
      const f = this.fragments[i];
      if (!f.active) continue;
      const a = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = `rgba(180, 120, 80, ${a * 0.9})`;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
      ctx.restore();
    }
  }

  // ===== 水晶绘制（六边形） =====
  drawCrystals(): void {
    const ctx = this.ctx;
    for (let i = 0; i < CRYSTAL_POOL; i++) {
      const c = this.crystals[i];
      if (!c.active) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      // 外发光
      const r = c.radius;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
      glow.addColorStop(0, 'rgba(112, 161, 255, 0.55)');
      glow.addColorStop(1, 'rgba(112, 161, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-r * 2.2, -r * 2.2, r * 4.4, r * 4.4);
      // 六边形本体 #70a1ff
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#70a1ff';
      ctx.fill();
      ctx.strokeStyle = '#c8daff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 内部高光
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(r * 0.45, 0);
      ctx.lineTo(0, r * 0.55);
      ctx.lineTo(-r * 0.45, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ctx.restore();
    }
  }

  // ===== 星暴视觉层 =====
  drawStarstormOverlay(): void {
    const ctx = this.ctx;
    // 整体橙雾叠加
    if (this.starstormActive) {
      const t = this.starstormDuration / this.starstormDurationMax;
      // 开始/结束渐入渐出
      let edgeAlpha = 0.22;
      if (t > 0.8) edgeAlpha *= (1.0 - (t - 0.8) / 0.2);
      else if (t < 0.2) edgeAlpha *= (t / 0.2);
      const vg = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 80, CANVAS_W / 2, CANVAS_H / 2, 520);
      vg.addColorStop(0, `rgba(255, 159, 67, 0)`);
      vg.addColorStop(1, `rgba(255, 159, 67, ${edgeAlpha.toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    // 粒子
    for (let i = 0; i < STARSTORM_POOL_ADJ; i++) {
      const p = this.starstormParticles[i];
      if (!p.active) continue;
      const a = Math.min(1, p.life / 0.8);
      ctx.fillStyle = `rgba(255, 159, 67, ${(0.55 + 0.45 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
