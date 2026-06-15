import {
  Archer, Enemy, Arrow, Particle, Shockwave, PathParticle, Vec2,
  createArcher, createEnemy, createArrow, bezierPoint, generateBezierFromDrag,
  drawArcher, drawEnemy, drawArrow, drawParticle, drawShockwave,
  drawPathParticle, drawBezierPreview, drawStarfield, generateStars,
  hslToHex,
} from './entities';
import { AudioManager } from './audioManager';

export interface GameState {
  running: boolean;
  paused: boolean;
  gameOver: boolean;
  score: number;
  highScore: number;
  lives: number;
  energy: number;
  wave: number;
  combo: number;
  comboTimer: number;
  comboActive: boolean;
  enemiesKilled: number;
  spawnInterval: number;
  spawnTimer: number;
  speedMultiplier: number;
  healAnimTimer: number;
  screenFlashTimer: number;
  screenShake: { x: number; y: number; intensity: number; duration: number };
  redFlashTimer: number;
  scoreAnim: { from: number; to: number; timer: number; duration: number };
  screenWidth: number;
  screenHeight: number;
  baseWidth: number;
  baseHeight: number;
}

export interface GameEvents {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onEnergyChange: (energy: number) => void;
  onWaveChange: (wave: number) => void;
  onComboChange: (active: boolean) => void;
  onGameOver: (score: number) => void;
  onStateChange: (state: GameState) => void;
}

const MAX_PARTICLES = 500;
const BASE_SPAWN_INTERVAL = 2;
const MIN_SPAWN_INTERVAL = 1;
const ENERGY_COST = 0.1;
const ENERGY_REGEN = 0.05;
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioManager: AudioManager;
  private events: GameEvents;

  public state: GameState;
  public archer: Archer;
  public enemies: Enemy[] = [];
  public arrows: Arrow[] = [];
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];
  public pathParticles: PathParticle[] = [];
  public stars: { x: number; y: number; size: number; twinkle: number }[];

  private isDragging = false;
  private dragStart: Vec2 | null = null;
  private dragCurrent: Vec2 | null = null;

  private animationId: number | null = null;
  private lastTime = 0;
  private time = 0;
  private nextEnemyId = 1;
  private nextArrowId = 1;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement, audioManager: AudioManager, events: GameEvents) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audioManager = audioManager;
    this.events = events;

    this.stars = generateStars(150);
    this.state = this.createInitialState();
    this.archer = createArcher(BASE_WIDTH / 2, BASE_HEIGHT * 0.8);
    this.state.screenWidth = window.innerWidth;
    this.state.screenHeight = window.innerHeight;
    this.resize();
  }

  private createInitialState(): GameState {
    return {
      running: false,
      paused: false,
      gameOver: false,
      score: 0,
      highScore: parseInt(localStorage.getItem('starlightArcherHighScore') || '0', 10),
      lives: 5,
      energy: 1,
      wave: 1,
      combo: 0,
      comboTimer: 0,
      comboActive: false,
      enemiesKilled: 0,
      spawnInterval: BASE_SPAWN_INTERVAL,
      spawnTimer: 0,
      speedMultiplier: 1,
      healAnimTimer: 0,
      screenFlashTimer: 0,
      screenShake: { x: 0, y: 0, intensity: 0, duration: 0 },
      redFlashTimer: 0,
      scoreAnim: { from: 0, to: 0, timer: 0, duration: 0 },
      screenWidth: BASE_WIDTH,
      screenHeight: BASE_HEIGHT,
      baseWidth: BASE_WIDTH,
      baseHeight: BASE_HEIGHT,
    };
  }

  start() {
    this.state.running = true;
    this.state.gameOver = false;
    this.lastTime = performance.now();
    this.events.onStateChange(this.state);
    this.loop(this.lastTime);
  }

  stop() {
    this.state.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset() {
    this.stop();
    this.enemies = [];
    this.arrows = [];
    this.particles = [];
    this.shockwaves = [];
    this.pathParticles = [];
    this.state = this.createInitialState();
    this.archer = createArcher(BASE_WIDTH / 2, BASE_HEIGHT * 0.8);
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.events.onScoreChange(0);
    this.events.onLivesChange(5);
    this.events.onEnergyChange(1);
    this.events.onWaveChange(1);
    this.events.onComboChange(false);
    this.events.onStateChange(this.state);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.state.screenWidth = w;
    this.state.screenHeight = h;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gameW = w;
    const gameH = h;
    const targetRatio = BASE_WIDTH / BASE_HEIGHT;
    const actualRatio = gameW / gameH;

    if (actualRatio > targetRatio) {
      this.scale = gameH / BASE_HEIGHT;
      this.offsetX = (gameW - BASE_WIDTH * this.scale) / 2;
      this.offsetY = 0;
    } else {
      this.scale = gameW / BASE_WIDTH;
      this.offsetX = 0;
      this.offsetY = (gameH - BASE_HEIGHT * this.scale) / 2;
    }
  }

  private screenToGame(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  handleMouseDown(x: number, y: number) {
    if (this.state.gameOver || this.state.paused) return;
    if (this.state.energy < ENERGY_COST) return;
    this.isDragging = true;
    this.dragStart = this.screenToGame(x, y);
    this.dragCurrent = { ...this.dragStart };
  }

  handleMouseMove(x: number, y: number) {
    if (!this.isDragging) return;
    this.dragCurrent = this.screenToGame(x, y);
  }

  handleMouseUp() {
    if (!this.isDragging || !this.dragStart || !this.dragCurrent) {
      this.isDragging = false;
      return;
    }
    const dx = this.dragCurrent.x - this.dragStart.x;
    const dy = this.dragCurrent.y - this.dragStart.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30) {
      this.isDragging = false;
      return;
    }
    if (this.state.energy < ENERGY_COST) {
      this.isDragging = false;
      return;
    }

    const bezier = generateBezierFromDrag(this.dragStart, this.dragCurrent);
    const arrow = createArrow(this.nextArrowId++, bezier);
    this.arrows.push(arrow);
    this.state.energy = Math.max(0, this.state.energy - ENERGY_COST);
    this.events.onEnergyChange(this.state.energy);
    this.audioManager.playShoot();

    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
  }

  private spawnEnemy() {
    const side = Math.floor(Math.random() * 3);
    let x: number, y: number;
    if (side === 0) {
      x = 100 + Math.random() * (BASE_WIDTH - 200);
      y = -40;
    } else if (side === 1) {
      x = -40;
      y = 100 + Math.random() * (BASE_HEIGHT * 0.5);
    } else {
      x = BASE_WIDTH + 40;
      y = 100 + Math.random() * (BASE_HEIGHT * 0.5);
    }
    const enemy = createEnemy(this.nextEnemyId++, x, y, this.state.speedMultiplier);
    this.enemies.push(enemy);
  }

  private addExplosion(x: number, y: number, count: number = 15) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      const hue = Math.random() * 360;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        radius: 3 + Math.random() * 3,
        color: hslToHex(hue, 100, 60),
        hsl: { h: hue, s: 100, l: 60 },
      });
    }
    this.shockwaves.push({
      x, y,
      radius: 5,
      maxRadius: 60,
      alpha: 0.8,
      life: 0.4,
    });
    this.trimParticles();
  }

  private addPathParticle(x: number, y: number) {
    this.pathParticles.push({
      x, y,
      life: 3,
      maxLife: 3,
      hue: 180 + Math.random() * 120,
    });
    if (this.pathParticles.length > MAX_PARTICLES) {
      this.pathParticles.splice(0, this.pathParticles.length - MAX_PARTICLES);
    }
  }

  private addArrowTrail(arrow: Arrow) {
    const progress = arrow.progress;
    const color = 1 - progress;
    const hue = 50 + progress * 30;
    this.particles.push({
      x: arrow.x,
      y: arrow.y,
      vx: -Math.cos(arrow.angle) * 40 + (Math.random() - 0.5) * 20,
      vy: -Math.sin(arrow.angle) * 40 + (Math.random() - 0.5) * 20,
      life: 0.4,
      maxLife: 0.4,
      radius: 2 + Math.random() * 2,
      color: hslToHex(hue, 100, color * 60 + 30),
    });
    this.trimParticles();
  }

  private addArcherTrail() {
    this.particles.push({
      x: this.archer.x + (Math.random() - 0.5) * 10,
      y: this.archer.y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.3,
      maxLife: 0.3,
      radius: 1.5 + Math.random(),
      color: '#88ccff',
    });
    this.trimParticles();
  }

  private trimParticles() {
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  private addScore(amount: number) {
    const actualAmount = this.state.comboActive ? amount * 2 : amount;
    this.state.scoreAnim = {
      from: this.state.score,
      to: this.state.score + actualAmount,
      timer: 0,
      duration: 0.3,
    };
    this.state.score += actualAmount;
    this.events.onScoreChange(this.state.score);

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem('starlightArcherHighScore', String(this.state.highScore));
    }

    const thresholds = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    let newWave = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (this.state.score >= thresholds[i]) {
        newWave = i + 2;
        break;
      }
    }
    if (newWave !== this.state.wave) {
      this.state.wave = newWave;
      this.events.onWaveChange(this.state.wave);
      const reduction = Math.min(0.05 * (newWave - 1), 0.5);
      this.state.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL * (1 - reduction));
      this.state.speedMultiplier = 1 + 0.1 * (newWave - 1);
    }
  }

  private triggerCombo() {
    this.state.comboActive = true;
    this.state.comboTimer = 2;
    this.events.onComboChange(true);
    this.audioManager.playCombo();
  }

  private triggerDeathEffects() {
    this.state.screenShake = { x: 0, y: 0, intensity: 30, duration: 0.8 };
    this.state.redFlashTimer = 0.8;
    this.audioManager.playGameOver();
  }

  private update(dt: number) {
    if (this.state.gameOver || this.state.paused) return;
    this.time += dt * 1000;

    this.state.energy = Math.min(1, this.state.energy + ENERGY_REGEN * dt);
    this.events.onEnergyChange(this.state.energy);

    this.state.spawnTimer += dt;
    if (this.state.spawnTimer >= this.state.spawnInterval) {
      this.state.spawnTimer = 0;
      this.spawnEnemy();
    }

    this.archer.trailTimer += dt;
    if (this.archer.trailTimer > 0.05) {
      this.archer.trailTimer = 0;
      this.addArcherTrail();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = this.archer.x - e.x;
      const dy = this.archer.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }
      if (e.hitFlash > 0) e.hitFlash -= dt;

      for (let j = 0; j < this.enemies.length; j++) {
        if (i === j) continue;
        const other = this.enemies[j];
        const ox = e.x - other.x;
        const oy = e.y - other.y;
        const od = Math.hypot(ox, oy);
        if (od < 30 && od > 0) {
          const push = (30 - od) / 2;
          e.x += (ox / od) * push;
          e.y += (oy / od) * push;
          other.x -= (ox / od) * push;
          other.y -= (oy / od) * push;
        }
      }

      const hitDist = Math.hypot(this.archer.x - e.x, this.archer.y - e.y);
      if (hitDist < e.radius + 15) {
        this.addExplosion(e.x, e.y);
        this.enemies.splice(i, 1);
        this.state.lives--;
        this.state.combo = 0;
        if (this.state.comboActive) {
          this.state.comboActive = false;
          this.events.onComboChange(false);
        }
        this.events.onLivesChange(this.state.lives);
        this.triggerDeathEffects();
        if (this.state.lives <= 0) {
          this.state.gameOver = true;
          this.events.onGameOver(this.state.score);
          this.events.onStateChange(this.state);
        }
      }
    }

    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.traveled += arrow.speed * dt;
      arrow.progress = Math.min(1, arrow.traveled / arrow.totalLength);
      const t = arrow.progress;
      const p = bezierPoint(arrow.bezierPoints, t);
      const prevP = bezierPoint(arrow.bezierPoints, Math.max(0, t - 0.01));
      arrow.angle = Math.atan2(p.y - prevP.y, p.x - prevP.x);
      arrow.x = p.x;
      arrow.y = p.y;

      this.addPathParticle(arrow.x, arrow.y);
      arrow.trailTimer += dt;
      if (arrow.trailTimer > 0.02) {
        arrow.trailTimer = 0;
        this.addArrowTrail(arrow);
      }

      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const d = Math.hypot(arrow.x - enemy.x, arrow.y - enemy.y);
        if (d < enemy.radius + 8) {
          this.addExplosion(enemy.x, enemy.y);
          this.audioManager.playEnemyExplosion();
          this.enemies.splice(j, 1);
          this.arrows.splice(i, 1);
          hit = true;
          this.state.screenFlashTimer = 0.1;
          this.addScore(10);
          this.state.enemiesKilled++;
          this.state.combo++;
          if (this.state.combo >= 10 && !this.state.comboActive) {
            this.triggerCombo();
          }
          if (this.state.enemiesKilled % 30 === 0 && this.state.lives < 5) {
            this.state.lives++;
            this.state.healAnimTimer = 0.5;
            this.events.onLivesChange(this.state.lives);
            this.audioManager.playHeal();
          }
          break;
        }
      }
      if (hit) continue;

      if (arrow.progress >= 1) {
        this.arrows.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      const t = 1 - s.life / 0.4;
      s.radius = 5 + (s.maxRadius - 5) * t;
      s.alpha = 0.8 * (1 - t);
      s.life -= dt;
      if (s.life <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.pathParticles.length - 1; i >= 0; i--) {
      const p = this.pathParticles[i];
      p.life -= dt;
      if (p.life <= 0) this.pathParticles.splice(i, 1);
    }

    if (this.state.comboActive) {
      this.state.comboTimer -= dt;
      if (this.state.comboTimer <= 0) {
        this.state.comboActive = false;
        this.events.onComboChange(false);
      }
    }

    if (this.state.screenFlashTimer > 0) this.state.screenFlashTimer -= dt;
    if (this.state.healAnimTimer > 0) this.state.healAnimTimer -= dt;
    if (this.state.redFlashTimer > 0) this.state.redFlashTimer -= dt;
    if (this.state.scoreAnim.duration > 0) {
      this.state.scoreAnim.timer += dt;
    }

    if (this.state.screenShake.duration > 0) {
      this.state.screenShake.duration -= dt;
      const intensity = this.state.screenShake.intensity * (this.state.screenShake.duration / 0.8);
      this.state.screenShake.x = (Math.random() - 0.5) * intensity;
      this.state.screenShake.y = (Math.random() - 0.5) * intensity;
    } else {
      this.state.screenShake.x = 0;
      this.state.screenShake.y = 0;
    }

    this.events.onStateChange({ ...this.state });
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
    bg.addColorStop(0, '#1a0a2e');
    bg.addColorStop(0.5, '#0d0015');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    drawStarfield(ctx, BASE_WIDTH, BASE_HEIGHT, this.stars, this.time);

    for (const p of this.pathParticles) {
      drawPathParticle(ctx, p, this.state.screenShake);
    }

    if (this.isDragging && this.dragStart && this.dragCurrent) {
      const bezier = generateBezierFromDrag(this.dragStart, this.dragCurrent);
      drawBezierPreview(ctx, bezier, this.state.screenShake);
    }

    for (const s of this.shockwaves) {
      drawShockwave(ctx, s, this.state.screenShake);
    }

    for (const e of this.enemies) {
      drawEnemy(ctx, e, this.state.screenShake);
    }

    drawArcher(ctx, this.archer, this.time, this.state.screenShake);

    if (this.state.comboActive) {
      const ringProgress = 1 - (this.state.comboTimer / 2);
      ctx.save();
      ctx.translate(this.archer.x + this.state.screenShake.x, this.archer.y + this.state.screenShake.y);
      ctx.rotate(ringProgress * Math.PI * 4);
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + 0.4 * Math.sin(this.time * 0.01)})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffd700';
      ctx.beginPath();
      const ringR = 35 + Math.sin(this.time * 0.008) * 3;
      ctx.arc(0, 0, ringR, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }

    if (this.state.healAnimTimer > 0) {
      const t = this.state.healAnimTimer / 0.5;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.fillStyle = '#44ff44';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#44ff44';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+1 ♥', this.archer.x + this.state.screenShake.x, this.archer.y - 40 - (1 - t) * 30 + this.state.screenShake.y);
      ctx.restore();
    }

    for (const a of this.arrows) {
      drawArrow(ctx, a, this.state.screenShake);
    }

    for (const p of this.particles) {
      drawParticle(ctx, p, this.state.screenShake);
    }

    ctx.restore();

    if (this.state.screenFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = (this.state.screenFlashTimer / 0.1) * 0.4;
      const flash = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
      flash.addColorStop(0, 'rgba(255,200,100,0)');
      flash.addColorStop(0.8, 'rgba(255,150,200,0.5)');
      flash.addColorStop(1, 'rgba(100,200,255,0.8)');
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (this.state.redFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = (this.state.redFlashTimer / 0.8) * 0.5;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    ctx.restore();
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
    if (this.state.running) {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  public getAnimatedScore(): number {
    const anim = this.state.scoreAnim;
    if (anim.duration <= 0) return this.state.score;
    const t = Math.min(1, anim.timer / anim.duration);
    return Math.round(anim.from + (anim.to - anim.from) * t);
  }

  public getScale(): number {
    return this.scale;
  }
}
