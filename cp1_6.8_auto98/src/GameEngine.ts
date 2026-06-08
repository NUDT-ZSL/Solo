import { DartController } from './DartController';
import { FloatingLootManager, FloatingItem } from './FloatingLoot';

export type GameState = 'menu' | 'playing' | 'gameover';

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onScoreChange: (score: number) => void;
  onComboChange: (combo: number) => void;
  onDartsChange: (darts: number) => void;
  onTimeChange: (remaining: number, total: number) => void;
  onComboFlash: () => void;
  onScreenShake: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
}

interface Building {
  x: number;
  width: number;
  height: number;
  roofH: number;
  windows: number;
  tiers: number;
  layer: number;
  lanterns: number[];
}

const MAX_PARTICLES = 300;
const GAME_DURATION = 60;
const INITIAL_DARTS = 30;
const MISS_PENALTY = 5;
const COMBO_BREAK_PENALTY = 3;
const HIT_BASE_SCORES: Record<string, number> = { pearl: 50, ingot: 30, jade: 20 };
const OBSTACLE_PENALTY = 15;

class AudioManager {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, volume: number, detune = 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playHit(combo: number) {
    this.playTone(600 + combo * 50, 0.15, 'sine', 0.15);
    this.playTone(900 + combo * 50, 0.1, 'sine', 0.1);
  }

  playCombo() {
    this.playTone(800, 0.08, 'sine', 0.12);
    setTimeout(() => this.playTone(1000, 0.08, 'sine', 0.12), 60);
    setTimeout(() => this.playTone(1200, 0.12, 'sine', 0.15), 120);
  }

  playMiss() {
    this.playTone(150, 0.25, 'triangle', 0.1);
  }

  playComboBreak() {
    this.playTone(400, 0.15, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(250, 0.2, 'sawtooth', 0.06), 100);
  }

  playObstacleHit() {
    this.playTone(100, 0.3, 'square', 0.06);
  }
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameCallbacks;

  private dartCtrl: DartController;
  private lootMgr: FloatingLootManager;
  private audio: AudioManager;
  private particles: Particle[] = [];

  private _state: GameState = 'menu';
  private _score = 0;
  private _combo = 0;
  private _maxCombo = 0;
  private _darts = INITIAL_DARTS;
  private _timeRemaining = GAME_DURATION;
  private _difficulty = 1;

  private lastTime = 0;
  private animFrameId = 0;
  private scrollOffset = 0;

  private screenShake = 0;
  private comboFlash = 0;
  private screenDarken = 0;

  private buildings: Building[] = [];
  private stars: Array<{ x: number; y: number; s: number; p: number }> = [];

  private W = 0;
  private H = 0;

  private bgCanvas: HTMLCanvasElement | null = null;
  private bgOffset = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.dartCtrl = new DartController();
    this.lootMgr = new FloatingLootManager();
    this.audio = new AudioManager();
  }

  get state() { return this._state; }
  get score() { return this._score; }
  get combo() { return this._combo; }
  get dartsLeft() { return this._darts; }
  get timeRemaining() { return this._timeRemaining; }

  resize(w: number, h: number) {
    this.W = w;
    this.H = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.generateBackground();
  }

  startGame() {
    this.audio.init();
    this._state = 'playing';
    this._score = 0;
    this._combo = 0;
    this._maxCombo = 0;
    this._darts = INITIAL_DARTS;
    this._timeRemaining = GAME_DURATION;
    this._difficulty = 1;
    this.particles = [];
    this.dartCtrl.clear();
    this.lootMgr.clear();
    this.lootMgr.reset();
    this.screenShake = 0;
    this.comboFlash = 0;
    this.screenDarken = 0;

    this.callbacks.onStateChange('playing');
    this.callbacks.onScoreChange(0);
    this.callbacks.onComboChange(0);
    this.callbacks.onDartsChange(INITIAL_DARTS);
    this.callbacks.onTimeChange(GAME_DURATION, GAME_DURATION);
  }

  launchDart(targetX: number, targetY: number) {
    if (this._state !== 'playing') return;
    if (this._darts <= 0) return;

    this._darts--;
    this.callbacks.onDartsChange(this._darts);

    const startX = this.W / 2;
    const startY = this.H - 40;
    this.dartCtrl.launch(startX, startY, targetX, targetY);
  }

  startLoop() {
    this.lastTime = performance.now();
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;

      if (this._state === 'playing') {
        this.update(dt);
      }

      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private update(dt: number) {
    this._timeRemaining -= dt;
    this._difficulty = 1 + (GAME_DURATION - this._timeRemaining) / 20;
    this.callbacks.onTimeChange(Math.max(0, this._timeRemaining), GAME_DURATION);

    if (this._timeRemaining <= 0) {
      this._state = 'gameover';
      this.callbacks.onStateChange('gameover');
      return;
    }

    if (this._darts <= 0 && this.dartCtrl.getActiveDarts().length === 0) {
      this._state = 'gameover';
      this.callbacks.onStateChange('gameover');
      return;
    }

    this.scrollOffset += dt * 30;
    this.bgOffset += dt * 20;

    this.lootMgr.update(dt, this.W, this.H, this._difficulty);
    this.dartCtrl.update(dt, this.W, this.H);
    this.checkCollisions();

    this.updateParticles(dt);
    this.screenShake = Math.max(0, this.screenShake - dt * 8);
    this.comboFlash = Math.max(0, this.comboFlash - dt * 4);
    this.screenDarken = Math.max(0, this.screenDarken - dt * 3);

    const activeDarts = this.dartCtrl.getActiveDarts();
    for (const dart of activeDarts) {
      if (!dart.active && !dart.hitSomething) {
        this.onMiss();
        dart.hitSomething = true;
      }
    }
  }

  private checkCollisions() {
    const darts = this.dartCtrl.getActiveDarts();
    const items = this.lootMgr.getActiveItems();
    const dartR = this.dartCtrl.getDartRadius();

    for (const dart of darts) {
      if (!dart.active) continue;
      for (const item of items) {
        if (!item.active) continue;

        const dx = dart.x - item.x;
        const dy = dart.y - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitDist = dartR + item.size;

        if (dist < hitDist) {
          this.onHit(dart, item, dist, hitDist);
          break;
        }
      }
    }
  }

  private onHit(dart: { id: number }, item: FloatingItem, dist: number, hitDist: number) {
    this.dartCtrl.deactivateDart(dart.id);
    this.lootMgr.removeItem(item.id);

    if (item.isObstacle) {
      this._combo = 0;
      this._score = Math.max(0, this._score - OBSTACLE_PENALTY);
      this.callbacks.onComboChange(0);
      this.callbacks.onScoreChange(this._score);
      this.screenShake = 1;
      this.screenDarken = 1;
      this.audio.playObstacleHit();
      this.audio.playComboBreak();
      this.callbacks.onScreenShake();
      this.spawnParticles(item.x, item.y, 15, 180, 80, 80);
    } else {
      const accuracy = 1 - (dist / hitDist);
      const multiplier = 1 + accuracy * 2;
      this._combo++;
      if (this._combo > this._maxCombo) this._maxCombo = this._combo;

      const comboBonus = 1 + (this._combo - 1) * 0.1;
      const baseScore = HIT_BASE_SCORES[item.kind] || 20;
      const finalScore = Math.round(baseScore * multiplier * comboBonus);
      this._score += finalScore;

      this.callbacks.onScoreChange(this._score);
      this.callbacks.onComboChange(this._combo);
      this.audio.playHit(this._combo);

      if (this._combo >= 3 && this._combo % 3 === 0) {
        this.comboFlash = 1;
        this.audio.playCombo();
        this.callbacks.onComboFlash();
      }

      const cfg = item.kind === 'pearl'
        ? { r: 160, g: 210, b: 255 }
        : item.kind === 'ingot'
          ? { r: 255, g: 215, b: 0 }
          : { r: 80, g: 255, b: 140 };

      this.spawnParticles(item.x, item.y, 25, cfg.r, cfg.g, cfg.b);
      this.spawnParticles(item.x, item.y, 10, 255, 230, 150);
    }
  }

  private onMiss() {
    this._combo = 0;
    this._score = Math.max(0, this._score - MISS_PENALTY);
    this.callbacks.onComboChange(0);
    this.callbacks.onScoreChange(this._score);
    this.screenDarken = 0.5;
    this.audio.playMiss();
  }

  private spawnParticles(x: number, y: number, count: number, r: number, g: number, b: number) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        r, g, b,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
      p.size *= 0.995;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private generateBackground() {
    this.buildings = [];
    this.stars = [];

    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.W * 2,
        y: Math.random() * this.H * 0.4,
        s: 0.5 + Math.random() * 1.5,
        p: Math.random() * Math.PI * 2,
      });
    }

    let bx = 0;
    while (bx < this.W * 2 + 200) {
      const w = 60 + Math.random() * 100;
      const h = 80 + Math.random() * 160;
      const roofH = 20 + Math.random() * 30;
      const windows = Math.floor(w / 25);
      const tiers = Math.random() < 0.3 ? 2 : 1;
      const lanterns: number[] = [];
      const lCount = Math.floor(Math.random() * 3);
      for (let li = 0; li < lCount; li++) {
        lanterns.push(0.2 + Math.random() * 0.6);
      }
      this.buildings.push({ x: bx, width: w, height: h, roofH, windows, tiers, layer: 1, lanterns });
      bx += w + 10 + Math.random() * 30;
    }

    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.W * 2;
    this.bgCanvas.height = this.H;
    this.renderBackgroundStatic();
  }

  private renderBackgroundStatic() {
    if (!this.bgCanvas) return;
    const bg = this.bgCanvas.getContext('2d')!;
    const W = this.bgCanvas.width;
    const H = this.bgCanvas.height;

    const skyGrad = bg.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#080818');
    skyGrad.addColorStop(0.35, '#1a1030');
    skyGrad.addColorStop(0.65, '#4a2020');
    skyGrad.addColorStop(0.85, '#8a4020');
    skyGrad.addColorStop(1, '#c06020');
    bg.fillStyle = skyGrad;
    bg.fillRect(0, 0, W, H);

    bg.fillStyle = '#ffe8a0';
    bg.beginPath();
    bg.arc(W * 0.8, H * 0.12, 30, 0, Math.PI * 2);
    bg.fill();

    const moonGlow = bg.createRadialGradient(W * 0.8, H * 0.12, 10, W * 0.8, H * 0.12, 100);
    moonGlow.addColorStop(0, 'rgba(255,232,160,0.15)');
    moonGlow.addColorStop(1, 'rgba(255,232,160,0)');
    bg.fillStyle = moonGlow;
    bg.beginPath();
    bg.arc(W * 0.8, H * 0.12, 100, 0, Math.PI * 2);
    bg.fill();

    const groundY = H * 0.82;

    for (const b of this.buildings) {
      const by = groundY - b.height;
      const bGrad = bg.createLinearGradient(b.x, by, b.x, groundY);
      bGrad.addColorStop(0, '#3d1a0e');
      bGrad.addColorStop(1, '#2a1008');
      bg.fillStyle = bGrad;
      bg.fillRect(b.x, by, b.width, b.height);

      bg.fillStyle = '#2a0c06';
      bg.fillRect(b.x, by, b.width, 4);

      this.drawRoof(bg, b.x, by, b.width, b.roofH);

      const winW = 10;
      const winH = 14;
      const winSpacing = b.width / (b.windows + 1);
      for (let wi = 1; wi <= b.windows; wi++) {
        const wx = b.x + wi * winSpacing - winW / 2;
        const wy = by + b.height * 0.3;
        const lit = Math.random() < 0.7;
        bg.fillStyle = lit ? '#ffa040' : '#1a0805';
        bg.fillRect(wx, wy, winW, winH);
        if (lit) {
          const wGlow = bg.createRadialGradient(wx + winW / 2, wy + winH / 2, 2, wx + winW / 2, wy + winH / 2, 15);
          wGlow.addColorStop(0, 'rgba(255,160,64,0.2)');
          wGlow.addColorStop(1, 'rgba(255,160,64,0)');
          bg.fillStyle = wGlow;
          bg.fillRect(wx - 10, wy - 8, winW + 20, winH + 16);
        }
      }

      for (const lp of b.lanterns) {
        const lx = b.x + b.width * lp;
        const ly = by - 5;
        bg.strokeStyle = '#555';
        bg.lineWidth = 1;
        bg.beginPath();
        bg.moveTo(lx, ly);
        bg.lineTo(lx, ly + 8);
        bg.stroke();

        bg.fillStyle = '#dd2020';
        bg.beginPath();
        bg.ellipse(lx, ly + 14, 5, 8, 0, 0, Math.PI * 2);
        bg.fill();

        const lanternGlow = bg.createRadialGradient(lx, ly + 14, 3, lx, ly + 14, 30);
        lanternGlow.addColorStop(0, 'rgba(255,80,20,0.25)');
        lanternGlow.addColorStop(1, 'rgba(255,80,20,0)');
        bg.fillStyle = lanternGlow;
        bg.beginPath();
        bg.arc(lx, ly + 14, 30, 0, Math.PI * 2);
        bg.fill();
      }
    }

    const gGrad = bg.createLinearGradient(0, groundY, 0, H);
    gGrad.addColorStop(0, '#2a1008');
    gGrad.addColorStop(0.3, '#1a0805');
    gGrad.addColorStop(1, '#0a0402');
    bg.fillStyle = gGrad;
    bg.fillRect(0, groundY, W, H - groundY);

    bg.strokeStyle = 'rgba(255,160,64,0.1)';
    bg.lineWidth = 1;
    bg.beginPath();
    bg.moveTo(0, groundY);
    bg.lineTo(W, groundY);
    bg.stroke();

    for (let sx = 0; sx < W; sx += 80 + Math.random() * 60) {
      const sw = 20 + Math.random() * 30;
      const sy = groundY + 5 + Math.random() * 10;
      const stallGrad = bg.createLinearGradient(sx, sy, sx, sy + 30);
      stallGrad.addColorStop(0, '#5a2a10');
      stallGrad.addColorStop(1, '#3a1a08');
      bg.fillStyle = stallGrad;
      bg.fillRect(sx, sy, sw, 25);

      bg.fillStyle = '#8a4020';
      bg.fillRect(sx - 5, sy - 3, sw + 10, 3);

      const stallGlow = bg.createRadialGradient(sx + sw / 2, sy, 5, sx + sw / 2, sy, 40);
      stallGlow.addColorStop(0, 'rgba(255,180,80,0.15)');
      stallGlow.addColorStop(1, 'rgba(255,180,80,0)');
      bg.fillStyle = stallGlow;
      bg.beginPath();
      bg.arc(sx + sw / 2, sy, 40, 0, Math.PI * 2);
      bg.fill();
    }
  }

  private drawRoof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rh: number) {
    ctx.fillStyle = '#1a0805';
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 2);
    ctx.quadraticCurveTo(x + w * 0.15, y - rh * 0.8, x + w * 0.5, y - rh);
    ctx.quadraticCurveTo(x + w * 0.85, y - rh * 0.8, x + w + 12, y + 2);
    ctx.lineTo(x + w + 8, y + 6);
    ctx.quadraticCurveTo(x + w * 0.85, y - rh * 0.6, x + w * 0.5, y - rh * 0.8);
    ctx.quadraticCurveTo(x + w * 0.15, y - rh * 0.6, x - 8, y + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a1008';
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 6);
    ctx.quadraticCurveTo(x + w * 0.15, y - rh * 0.6, x + w * 0.5, y - rh * 0.8);
    ctx.quadraticCurveTo(x + w * 0.85, y - rh * 0.6, x + w + 8, y + 6);
    ctx.lineTo(x + w + 12, y + 2);
    ctx.lineTo(x + w + 16, y + 2);
    ctx.lineTo(x + w + 12, y + 8);
    ctx.quadraticCurveTo(x + w * 0.85, y - rh * 0.5, x + w * 0.5, y - rh * 0.7);
    ctx.quadraticCurveTo(x + w * 0.15, y - rh * 0.5, x - 12, y + 8);
    ctx.lineTo(x - 16, y + 2);
    ctx.lineTo(x - 12, y + 2);
    ctx.closePath();
    ctx.fill();
  }

  private render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 8;
      const sy = (Math.random() - 0.5) * this.screenShake * 8;
      ctx.translate(sx, sy);
    }

    if (this.bgCanvas) {
      const offset = (this.bgOffset % this.bgCanvas.width);
      ctx.drawImage(this.bgCanvas, -offset, 0);
      ctx.drawImage(this.bgCanvas, this.bgCanvas.width - offset, 0);
    } else {
      ctx.fillStyle = '#080818';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    this.renderStars(ctx);

    if (this._state === 'playing' || this._state === 'gameover') {
      this.lootMgr.render(ctx);
      this.dartCtrl.render(ctx);
      this.renderParticles(ctx);
    }

    if (this.comboFlash > 0) {
      ctx.fillStyle = `rgba(255,220,150,${this.comboFlash * 0.15})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    if (this.screenDarken > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.screenDarken * 0.3})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    if (this._state === 'playing') {
      const launchX = this.W / 2;
      const launchY = this.H - 40;

      const lGrad = ctx.createRadialGradient(launchX, launchY, 0, launchX, launchY, 25);
      lGrad.addColorStop(0, 'rgba(255,160,40,0.4)');
      lGrad.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.arc(launchX, launchY, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffa830';
      ctx.beginPath();
      ctx.arc(launchX, launchY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this._state === 'menu') {
      this.renderMenu(ctx);
    }

    if (this._state === 'gameover') {
      this.renderGameOver(ctx);
    }

    ctx.restore();
  }

  private renderStars(ctx: CanvasRenderingContext2D) {
    const t = performance.now() / 1000;
    for (const star of this.stars) {
      const sx = (star.x + this.bgOffset * 0.1) % (this.W * 2);
      const alpha = 0.3 + Math.sin(t * 2 + star.p) * 0.3;
      ctx.fillStyle = `rgba(255,240,200,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx > this.W ? sx - this.W * 2 : sx, star.y, star.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const alpha = (p.life / p.maxLife) * 0.9;
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderMenu(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.textAlign = 'center';

    const titleGrad = ctx.createLinearGradient(this.W / 2 - 150, this.H * 0.3, this.W / 2 + 150, this.H * 0.3);
    titleGrad.addColorStop(0, '#ffd700');
    titleGrad.addColorStop(0.5, '#ffec80');
    titleGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = titleGrad;
    ctx.font = `bold ${Math.min(60, this.W * 0.08)}px serif`;
    ctx.fillText('流光镖局', this.W / 2, this.H * 0.3);

    ctx.fillStyle = 'rgba(255,200,120,0.7)';
    ctx.font = `${Math.min(18, this.W * 0.025)}px sans-serif`;
    ctx.fillText('唐代长安夜市 · 飞镖夺宝', this.W / 2, this.H * 0.37);

    const btnW = 180;
    const btnH = 50;
    const btnX = this.W / 2 - btnW / 2;
    const btnY = this.H * 0.5;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, '#c04020');
    btnGrad.addColorStop(1, '#8a2010');
    ctx.fillStyle = btnGrad;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(24, this.W * 0.03)}px sans-serif`;
    ctx.fillText('开始游戏', this.W / 2, btnY + btnH / 2 + 8);

    ctx.fillStyle = 'rgba(255,220,150,0.6)';
    ctx.font = `${Math.min(14, this.W * 0.02)}px sans-serif`;
    ctx.fillText('点击屏幕发射飞镖，击落宝物得分', this.W / 2, this.H * 0.68);
    ctx.fillText('小心风筝和麻雀，击空或误击会扣分', this.W / 2, this.H * 0.72);

    this._menuBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private _menuBtn: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
  private _restartBtn: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };

  handleMenuClick(mx: number, my: number): boolean {
    const btn = this._state === 'menu' ? this._menuBtn : this._restartBtn;
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      this.startGame();
      return true;
    }
    return false;
  }

  private renderGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ff6040';
    ctx.font = `bold ${Math.min(48, this.W * 0.06)}px serif`;
    ctx.fillText('时辰已到', this.W / 2, this.H * 0.28);

    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(36, this.W * 0.05)}px sans-serif`;
    ctx.fillText(`得分: ${this._score}`, this.W / 2, this.H * 0.38);

    ctx.fillStyle = '#ffa040';
    ctx.font = `${Math.min(20, this.W * 0.028)}px sans-serif`;
    ctx.fillText(`最高连击: ${this._maxCombo}`, this.W / 2, this.H * 0.45);

    const btnW = 180;
    const btnH = 50;
    const btnX = this.W / 2 - btnW / 2;
    const btnY = this.H * 0.54;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, '#c04020');
    btnGrad.addColorStop(1, '#8a2010');
    ctx.fillStyle = btnGrad;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(24, this.W * 0.03)}px sans-serif`;
    ctx.fillText('再来一局', this.W / 2, btnY + btnH / 2 + 8);

    this._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
