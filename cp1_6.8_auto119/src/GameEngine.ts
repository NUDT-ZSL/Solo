import { EchoPulse } from './EchoPulse';
import { ShadowGuard } from './ShadowGuard';
import { Wall, Mechanism, LevelData, GameState, Vec2, WORLD_W, WORLD_H } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface PillarEffect {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

const LEVELS: LevelData[] = [
  {
    walls: [
      { x: 0, y: 0, w: WORLD_W, h: 20 },
      { x: 0, y: WORLD_H - 20, w: WORLD_W, h: 20 },
      { x: 0, y: 0, w: 20, h: WORLD_H },
      { x: WORLD_W - 20, y: 0, w: 20, h: WORLD_H },
      { x: 350, y: 200, w: 20, h: 250 },
      { x: 600, y: 350, w: 250, h: 20 },
      { x: 800, y: 100, w: 20, h: 250 },
    ],
    mechanisms: [
      { id: 0, x: 250, y: 350, radius: 22, type: 'lightGate', activated: false, activationAnim: 0 },
      { id: 1, x: 900, y: 500, radius: 22, type: 'elevator', activated: false, activationAnim: 0 },
    ],
    guards: [],
    playerStart: { x: 100, y: 100 },
    exitPos: { x: 1080, y: 680 },
    exitRadius: 28,
  },
  {
    walls: [
      { x: 0, y: 0, w: WORLD_W, h: 20 },
      { x: 0, y: WORLD_H - 20, w: WORLD_W, h: 20 },
      { x: 0, y: 0, w: 20, h: WORLD_H },
      { x: WORLD_W - 20, y: 0, w: 20, h: WORLD_H },
      { x: 500, y: 20, w: 20, h: 420 },
      { x: 500, y: 440, w: 350, h: 20 },
      { x: 200, y: 550, w: 20, h: 230 },
      { x: 800, y: 600, w: 20, h: 180 },
    ],
    mechanisms: [
      { id: 0, x: 300, y: 300, radius: 22, type: 'lightGate', activated: false, activationAnim: 0 },
      { id: 1, x: 700, y: 250, radius: 22, type: 'teleporter', activated: false, activationAnim: 0 },
      { id: 2, x: 400, y: 680, radius: 22, type: 'elevator', activated: false, activationAnim: 0 },
    ],
    guards: [
      { x: 700, y: 600, patrol: [{ x: 700, y: 500 }, { x: 700, y: 700 }, { x: 900, y: 700 }, { x: 900, y: 500 }] },
    ],
    playerStart: { x: 100, y: 100 },
    exitPos: { x: 1080, y: 680 },
    exitRadius: 28,
  },
  {
    walls: [
      { x: 0, y: 0, w: WORLD_W, h: 20 },
      { x: 0, y: WORLD_H - 20, w: WORLD_W, h: 20 },
      { x: 0, y: 0, w: 20, h: WORLD_H },
      { x: WORLD_W - 20, y: 0, w: 20, h: WORLD_H },
      { x: 300, y: 20, w: 20, h: 280 },
      { x: 300, y: 300, w: 200, h: 20 },
      { x: 500, y: 300, w: 20, h: 200 },
      { x: 300, y: 500, w: 220, h: 20 },
      { x: 700, y: 20, w: 20, h: 280 },
      { x: 700, y: 300, w: 200, h: 20 },
      { x: 900, y: 300, w: 20, h: 250 },
      { x: 700, y: 530, w: 220, h: 20 },
      { x: 400, y: 650, w: 300, h: 20 },
    ],
    mechanisms: [
      { id: 0, x: 180, y: 200, radius: 22, type: 'lightGate', activated: false, activationAnim: 0 },
      { id: 1, x: 600, y: 400, radius: 22, type: 'elevator', activated: false, activationAnim: 0 },
      { id: 2, x: 400, y: 720, radius: 22, type: 'teleporter', activated: false, activationAnim: 0 },
      { id: 3, x: 1000, y: 600, radius: 22, type: 'lightGate', activated: false, activationAnim: 0 },
    ],
    guards: [
      { x: 800, y: 150, patrol: [{ x: 750, y: 100 }, { x: 1100, y: 100 }, { x: 1100, y: 250 }, { x: 750, y: 250 }] },
      { x: 800, y: 650, patrol: [{ x: 750, y: 600 }, { x: 1100, y: 600 }, { x: 1100, y: 740 }, { x: 750, y: 740 }] },
    ],
    playerStart: { x: 100, y: 100 },
    exitPos: { x: 1080, y: 680 },
    exitRadius: 28,
  },
];

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  private player = { x: 100, y: 100, radius: 14, speed: 200 };
  private playerTrail: { x: number; y: number; alpha: number }[] = [];
  private pulses: EchoPulse[] = [];
  private guards: ShadowGuard[] = [];
  private mechanisms: Mechanism[] = [];
  private walls: Wall[] = [];
  private particles: Particle[] = [];
  private pillars: PillarEffect[] = [];

  private level = 0;
  private energy = 5;
  private maxEnergy = 5;
  private energyRegenTimer = 0;
  private energyRegenTarget = 0;
  private detected = false;
  private gameStatus: 'playing' | 'won' | 'lost' | 'levelComplete' = 'playing';

  private shakeIntensity = 0;
  private shakeX = 0;
  private shakeY = 0;

  private keys = new Set<string>();
  private mousePos: Vec2 = { x: 0, y: 0 };
  private mouseDown = false;
  private fireCooldown = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  private exitPos: Vec2 = { x: 1080, y: 680 };
  private exitRadius = 28;
  private exitPulse = 0;

  private onStateChange: ((state: GameState) => void) | null = null;
  private mossPoints: { x: number; y: number; side: string }[] = [];

  init(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;
    this.resize();
    this.bindInput();
    this.loadLevel(0);
  }

  private resize(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement!;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    this.canvas.width = pw * devicePixelRatio;
    this.canvas.height = ph * devicePixelRatio;
    this.canvas.style.width = pw + 'px';
    this.canvas.style.height = ph + 'px';
    this.scale = Math.min(this.canvas.width / WORLD_W, this.canvas.height / WORLD_H);
    this.offsetX = (this.canvas.width - WORLD_W * this.scale) / 2;
    this.offsetY = (this.canvas.height - WORLD_H * this.scale) / 2;
  }

  private bindInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('resize', () => this.resize());

    const canvas = this.canvas!;
    const toWorld = (cx: number, cy: number): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      const px = (cx - rect.left) * devicePixelRatio;
      const py = (cy - rect.top) * devicePixelRatio;
      return {
        x: (px - this.offsetX) / this.scale,
        y: (py - this.offsetY) / this.scale,
      };
    };

    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.mousePos = toWorld(e.clientX, e.clientY);
      this.tryFirePulse();
    });
    canvas.addEventListener('mousemove', (e) => {
      this.mousePos = toWorld(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseup', () => { this.mouseDown = false; });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.mouseDown = true;
      this.mousePos = toWorld(t.clientX, t.clientY);
      this.tryFirePulse();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.mousePos = toWorld(t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener('touchend', () => { this.mouseDown = false; });
  }

  private tryFirePulse(): void {
    if (this.gameStatus !== 'playing') return;
    if (this.energy <= 0 || this.fireCooldown > 0) return;
    const angle = Math.atan2(this.mousePos.y - this.player.y, this.mousePos.x - this.player.x);
    this.pulses.push(new EchoPulse(this.player.x, this.player.y, angle));
    this.energy--;
    this.fireCooldown = 0.2;
    this.shakeIntensity = 4;
    this.spawnFireParticles();
    this.emitState();
  }

  private spawnFireParticles(): void {
    const angle = Math.atan2(this.mousePos.y - this.player.y, this.mousePos.x - this.player.x);
    for (let i = 0; i < 8; i++) {
      const a = angle + (Math.random() - 0.5) * 0.8;
      const spd = 60 + Math.random() * 100;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 2 + Math.random() * 2,
        color: '100,180,255',
      });
    }
  }

  private loadLevel(n: number): void {
    if (n >= LEVELS.length) {
      this.gameStatus = 'won';
      this.emitState();
      return;
    }
    this.level = n;
    const data = LEVELS[n];
    this.walls = data.walls.map(w => ({ ...w }));
    this.mechanisms = data.mechanisms.map(m => ({ ...m, activationAnim: 0 }));
    this.guards = data.guards.map(g => new ShadowGuard(g.x, g.y, g.patrol));
    this.player.x = data.playerStart.x;
    this.player.y = data.playerStart.y;
    this.exitPos = data.exitPos;
    this.exitRadius = data.exitRadius;
    this.pulses = [];
    this.particles = [];
    this.pillars = [];
    this.playerTrail = [];
    this.energy = this.maxEnergy;
    this.energyRegenTimer = 0;
    this.energyRegenTarget = 0;
    this.detected = false;
    this.gameStatus = 'playing';
    this.exitPulse = 0;
    this.generateMoss();
    this.emitState();
  }

  private generateMoss(): void {
    this.mossPoints = [];
    for (const w of this.walls) {
      const count = Math.floor((w.w + w.h) / 20);
      for (let i = 0; i < count; i++) {
        const side = Math.random();
        let mx: number, my: number;
        if (side < 0.25) {
          mx = w.x + Math.random() * w.w;
          my = w.y;
        } else if (side < 0.5) {
          mx = w.x + Math.random() * w.w;
          my = w.y + w.h;
        } else if (side < 0.75) {
          mx = w.x;
          my = w.y + Math.random() * w.h;
        } else {
          mx = w.x + w.w;
          my = w.y + Math.random() * w.h;
        }
        this.mossPoints.push({ x: mx, y: my, side: side < 0.5 ? 'h' : 'v' });
      }
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  restartLevel(): void {
    this.loadLevel(this.level);
  }

  nextLevel(): void {
    this.loadLevel(this.level + 1);
  }

  restartGame(): void {
    this.loadLevel(0);
  }

  getState(): GameState {
    return {
      level: this.level,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      detected: this.detected,
      mechanismsTotal: this.mechanisms.length,
      mechanismsActivated: this.mechanisms.filter(m => m.activated).length,
      guards: this.guards.map(g => ({ x: g.x, y: g.y, angle: g.facing, state: g.state })),
      playerPos: { x: this.player.x, y: this.player.y },
      levelWalls: this.walls,
      exitPos: this.exitPos,
      exitRadius: this.exitRadius,
      gameStatus: this.gameStatus,
    };
  }

  private emitState(): void {
    if (this.onStateChange) this.onStateChange(this.getState());
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.05);
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.gameStatus !== 'playing') return;

    this.updatePlayer(dt);
    this.updatePulses(dt);
    this.updateGuards(dt);
    this.updateParticles(dt);
    this.updatePillars(dt);
    this.updateScreenShake(dt);
    this.updateEnergyRegen(dt);
    this.checkExit();

    if (this.mouseDown) {
      this.fireCooldown -= dt;
      if (this.fireCooldown <= 0) {
        this.tryFirePulse();
      }
    } else {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    }

    this.exitPulse += dt;
    this.detected = this.guards.some(g => g.isDetectingPlayer());
    this.emitState();
  }

  private updatePlayer(dt: number): void {
    let dx = 0, dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (dx === 0 && dy === 0) return;
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;

    const nx = this.player.x + dx * this.player.speed * dt;
    const ny = this.player.y + dy * this.player.speed * dt;

    this.player.x = nx;
    if (this.collidesWithWalls(this.player.x, this.player.y, this.player.radius)) {
      this.player.x = nx - dx * this.player.speed * dt;
    }
    this.player.y = ny;
    if (this.collidesWithWalls(this.player.x, this.player.y, this.player.radius)) {
      this.player.y = ny - dy * this.player.speed * dt;
    }

    this.player.x = Math.max(this.player.radius + 20, Math.min(WORLD_W - this.player.radius - 20, this.player.x));
    this.player.y = Math.max(this.player.radius + 20, Math.min(WORLD_H - this.player.radius - 20, this.player.y));

    this.playerTrail.push({ x: this.player.x, y: this.player.y, alpha: 1 });
    if (this.playerTrail.length > 20) this.playerTrail.shift();
    for (const t of this.playerTrail) {
      t.alpha -= dt * 3;
    }
    this.playerTrail = this.playerTrail.filter(t => t.alpha > 0);

    if (Math.random() < dt * 15) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 8,
        y: this.player.y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 1.5 + Math.random() * 1.5,
        color: '220,230,255',
      });
    }
  }

  private collidesWithWalls(cx: number, cy: number, r: number): boolean {
    for (const w of this.walls) {
      const closestX = Math.max(w.x, Math.min(cx, w.x + w.w));
      const closestY = Math.max(w.y, Math.min(cy, w.y + w.h));
      const ddx = cx - closestX;
      const ddy = cy - closestY;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
    return false;
  }

  private updatePulses(dt: number): void {
    for (const p of this.pulses) {
      p.update(dt, this.walls);

      for (const m of this.mechanisms) {
        if (m.activated) continue;
        const ddx = p.x - m.x;
        const ddy = p.y - m.y;
        if (ddx * ddx + ddy * ddy < (m.radius + p.headRadius) * (m.radius + p.headRadius)) {
          m.activated = true;
          m.activationAnim = 0;
          p.hasHitMechanism = true;
          this.energyRegenTarget = Math.min(this.maxEnergy, this.energyRegenTarget + 1);
          this.pillars.push({ x: m.x, y: m.y, age: 0, maxAge: 1.5 });
          for (let i = 0; i < 12; i++) {
            const a = (Math.PI * 2 * i) / 12;
            this.particles.push({
              x: m.x, y: m.y,
              vx: Math.cos(a) * 80, vy: Math.sin(a) * 80,
              life: 0.6, maxLife: 0.6,
              size: 3, color: '255,215,0',
            });
          }
        }
      }

      for (const g of this.guards) {
        if (g.state === 'stunned') continue;
        const ddx = p.x - g.x;
        const ddy = p.y - g.y;
        if (ddx * ddx + ddy * ddy < (g.radius + p.headRadius) * (g.radius + p.headRadius)) {
          g.stun();
          p.hasHitGuard = true;
          this.energyRegenTarget = Math.min(this.maxEnergy, this.energyRegenTarget + 1);
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;
            this.particles.push({
              x: g.x, y: g.y,
              vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
              life: 0.5, maxLife: 0.5,
              size: 2.5, color: '160,80,200',
            });
          }
        }
      }
    }
    this.pulses = this.pulses.filter(p => p.alive || p.rings.length > 0);
  }

  private updateGuards(dt: number): void {
    for (const g of this.guards) {
      g.update(dt, this.player.x, this.player.y, this.walls);
      const ddx = g.x - this.player.x;
      const ddy = g.y - this.player.y;
      if (ddx * ddx + ddy * ddy < (g.radius + this.player.radius) * (g.radius + this.player.radius)) {
        if (g.state !== 'stunned') {
          this.gameStatus = 'lost';
          this.emitState();
        }
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updatePillars(dt: number): void {
    for (const pl of this.pillars) {
      pl.age += dt;
    }
    this.pillars = this.pillars.filter(pl => pl.age < pl.maxAge);
    for (const m of this.mechanisms) {
      if (m.activated && m.activationAnim < 1) {
        m.activationAnim = Math.min(1, m.activationAnim + dt * 2);
      }
    }
  }

  private updateScreenShake(dt: number): void {
    if (this.shakeIntensity > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= Math.pow(0.05, dt);
      if (this.shakeIntensity < 0.3) {
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      }
    }
  }

  private updateEnergyRegen(dt: number): void {
    if (this.energyRegenTarget > this.energy) {
      this.energyRegenTimer += dt;
      if (this.energyRegenTimer >= 1.5) {
        this.energyRegenTimer = 0;
        this.energy = Math.min(this.maxEnergy, this.energy + 1);
        if (this.energy >= this.energyRegenTarget) {
          this.energyRegenTarget = this.energy;
        }
      }
    }
  }

  private checkExit(): void {
    const allActivated = this.mechanisms.every(m => m.activated);
    if (!allActivated) return;
    const ddx = this.player.x - this.exitPos.x;
    const ddy = this.player.y - this.exitPos.y;
    if (ddx * ddx + ddy * ddy < (this.exitRadius + this.player.radius) * (this.exitRadius + this.player.radius)) {
      this.gameStatus = 'levelComplete';
      this.emitState();
    }
  }

  private render(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    ctx.fillStyle = '#060410';
    ctx.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

    ctx.save();
    ctx.translate(this.offsetX + this.shakeX * this.scale, this.offsetY + this.shakeY * this.scale);
    ctx.scale(this.scale, this.scale);

    this.renderBackground(ctx);
    this.renderMoss(ctx);
    this.renderWalls(ctx);
    this.renderExit(ctx);
    this.renderMechanisms(ctx);
    this.renderPillars(ctx);
    for (const p of this.pulses) p.render(ctx);
    for (const g of this.guards) g.render(ctx);
    this.renderPlayer(ctx);
    this.renderParticles(ctx);
    this.renderOverlay(ctx);

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, WORLD_W, WORLD_H);
    grad.addColorStop(0, '#1a100e');
    grad.addColorStop(0.5, '#0e0818');
    grad.addColorStop(1, '#0a0515');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  private renderMoss(ctx: CanvasRenderingContext2D): void {
    for (const m of this.mossPoints) {
      ctx.beginPath();
      const sz = 2 + Math.random() * 2;
      ctx.arc(m.x, m.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40,${120 + Math.floor(Math.random() * 40)},60,0.3)`;
      ctx.fill();
    }
  }

  private renderWalls(ctx: CanvasRenderingContext2D): void {
    for (const w of this.walls) {
      const grad = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
      grad.addColorStop(0, '#2a1f1a');
      grad.addColorStop(1, '#1a1220');
      ctx.fillStyle = grad;
      ctx.fillRect(w.x, w.y, w.w, w.h);

      ctx.strokeStyle = 'rgba(60,180,80,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
  }

  private renderExit(ctx: CanvasRenderingContext2D): void {
    const allActivated = this.mechanisms.every(m => m.activated);
    const alpha = allActivated ? 0.5 + Math.sin(this.exitPulse * 3) * 0.2 : 0.15;
    const color = allActivated ? '80,255,120' : '100,100,100';

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.exitPos.x, this.exitPos.y, this.exitRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color},${alpha * 0.3})`;
    if (allActivated) {
      ctx.shadowColor = 'rgba(80,255,120,0.6)';
      ctx.shadowBlur = 25;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.exitPos.x, this.exitPos.y, this.exitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${color},${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (allActivated) {
      ctx.fillStyle = `rgba(80,255,120,${alpha * 0.8})`;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', this.exitPos.x, this.exitPos.y + 5);
    }
    ctx.restore();
  }

  private renderMechanisms(ctx: CanvasRenderingContext2D): void {
    for (const m of this.mechanisms) {
      ctx.save();
      const anim = m.activationAnim;
      const baseColor = m.activated ? `rgba(255,215,0,${0.4 + anim * 0.4})` : 'rgba(80,80,100,0.4)';
      const glowColor = m.activated ? 'rgba(255,215,0,0.5)' : 'rgba(60,60,80,0.2)';

      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      if (m.activated) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15 + anim * 10;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.strokeStyle = m.activated ? `rgba(255,215,0,${0.6 + anim * 0.3})` : 'rgba(80,80,100,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = m.activated ? 'rgba(255,240,150,0.9)' : 'rgba(120,120,140,0.6)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = m.type === 'lightGate' ? '◈' : m.type === 'elevator' ? '⬡' : '✦';
      ctx.fillText(label, m.x, m.y);

      ctx.restore();
    }
  }

  private renderPillars(ctx: CanvasRenderingContext2D): void {
    for (const pl of this.pillars) {
      const progress = pl.age / pl.maxAge;
      const alpha = Math.max(0, 1 - progress);
      const height = 80 * Math.min(1, pl.age * 4);

      ctx.save();
      const grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y - height);
      grad.addColorStop(0, `rgba(255,215,0,${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(255,215,0,0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(pl.x - 12, pl.y - height, 24, height);
      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.playerTrail.length; i++) {
      const t = this.playerTrail[i];
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.player.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${t.alpha * 0.15})`;
      ctx.fill();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,235,255,0.8)';
    ctx.shadowColor = 'rgba(200,220,255,0.9)';
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    const aimAngle = Math.atan2(this.mousePos.y - this.player.y, this.mousePos.x - this.player.x);
    const indicatorDist = this.player.radius + 8;
    ctx.beginPath();
    ctx.arc(
      this.player.x + Math.cos(aimAngle) * indicatorDist,
      this.player.y + Math.sin(aimAngle) * indicatorDist,
      3, 0, Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(100,180,255,0.7)';
    ctx.fill();
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${alpha * 0.8})`;
      ctx.fill();
    }
  }

  private renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.gameStatus === 'lost') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.fillStyle = 'rgba(255,60,60,0.9)';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('暗影吞噬', WORLD_W / 2, WORLD_H / 2 - 20);
      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '20px monospace';
      ctx.fillText('按 R 重试', WORLD_W / 2, WORLD_H / 2 + 30);
    }
    if (this.gameStatus === 'levelComplete') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.fillStyle = 'rgba(255,215,0,0.9)';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('机关已通', WORLD_W / 2, WORLD_H / 2 - 20);
      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '20px monospace';
      ctx.fillText('按 N 下一关', WORLD_W / 2, WORLD_H / 2 + 30);
    }
    if (this.gameStatus === 'won') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.fillStyle = 'rgba(255,215,0,0.95)';
      ctx.font = 'bold 52px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('暗蚀已散', WORLD_W / 2, WORLD_H / 2 - 20);
      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '20px monospace';
      ctx.fillText('按 R 重新开始', WORLD_W / 2, WORLD_H / 2 + 30);
    }
  }
}
