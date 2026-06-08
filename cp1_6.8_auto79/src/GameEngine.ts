import { KiteController, InputState } from './KiteController';
import { ObstacleSpawner } from './ObstacleSpawner';
import { CollectibleManager } from './CollectibleManager';

export type GameState = 'menu' | 'playing' | 'gameover';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

export interface GameSnapshot {
  state: GameState;
  score: number;
  highScore: number;
  energy: number;
  maxEnergy: number;
}

interface ParallaxLayer {
  offset: number;
  speed: number;
  draw: (ctx: CanvasRenderingContext2D, offset: number, w: number, h: number) => void;
}

const SCORE_PER_SECOND = 10;
const PARTICLE_COUNT = 30;
const PARTICLE_LIFE = 1.2;

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private kite: KiteController;
  private spawner: ObstacleSpawner;
  private collectibles: CollectibleManager;
  private input: InputState;
  private gameState: GameState = 'menu';
  private score: number = 0;
  private highScore: number = 0;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private particles: Particle[] = [];
  private layers: ParallaxLayer[] = [];
  private onStateChange: ((snapshot: GameSnapshot) => void) | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: () => void;

  constructor() {
    this.kite = new KiteController(800, 600);
    this.spawner = new ObstacleSpawner(800, 600);
    this.collectibles = new CollectibleManager(800, 600);
    this.input = {
      up: false, down: false, left: false, right: false,
      dash: false, mouseX: 0, mouseY: 0, mouseDown: false,
    };

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
  }

  init(canvas: HTMLCanvasElement, onStateChange: (snapshot: GameSnapshot) => void): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;
    this.resize();
    this.setupLayers();
    this.setupInput();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.boundMouseMove);
      this.canvas.removeEventListener('mousedown', this.boundMouseDown);
      this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    }
  }

  resize(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.kite.resize(w, h);
    this.spawner.resize(w, h);
    this.collectibles.resize(w, h);
  }

  startGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.particles = [];
    this.kite.reset();
    this.spawner.reset();
    this.collectibles.reset();
    this.emitState();
  }

  private setupLayers(): void {
    this.layers = [
      {
        offset: 0, speed: 30,
        draw: (ctx, offset, w, h) => {
          ctx.save();
          ctx.globalAlpha = 0.25;
          const step = 300;
          for (let i = -1; i < w / step + 2; i++) {
            const bx = i * step - (offset % step);
            const bh = 120 + Math.sin(i * 1.7) * 40;
            ctx.beginPath();
            ctx.moveTo(bx, h);
            ctx.bezierCurveTo(bx + step * 0.3, h - bh * 0.8, bx + step * 0.7, h - bh * 0.6, bx + step, h);
            ctx.fillStyle = '#6b7b6e';
            ctx.fill();
          }
          ctx.restore();
        },
      },
      {
        offset: 0, speed: 60,
        draw: (ctx, offset, w, h) => {
          ctx.save();
          ctx.globalAlpha = 0.4;
          const step = 200;
          for (let i = -1; i < w / step + 2; i++) {
            const bx = i * step - (offset % step);
            const bh = 80 + Math.sin(i * 2.3 + 1) * 30;
            ctx.beginPath();
            ctx.moveTo(bx, h);
            ctx.bezierCurveTo(bx + step * 0.25, h - bh, bx + step * 0.75, h - bh * 0.5, bx + step, h);
            ctx.fillStyle = '#4a5d4a';
            ctx.fill();
          }
          ctx.restore();
        },
      },
      {
        offset: 0, speed: 100,
        draw: (ctx, offset, w, h) => {
          ctx.save();
          ctx.globalAlpha = 0.6;
          const treeStep = 120;
          for (let i = -1; i < w / treeStep + 2; i++) {
            const tx = i * treeStep - (offset % treeStep);
            const th = 60 + Math.sin(i * 1.5 + 2) * 20;
            ctx.beginPath();
            ctx.moveTo(tx + 15, h);
            ctx.lineTo(tx + 15, h - th * 0.4);
            ctx.strokeStyle = '#3d2b1f';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(tx + 15, h - th * 0.4 - 12, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#2d5a2d';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(tx + 10, h - th * 0.4 - 6, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#3a6b3a';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(tx + 20, h - th * 0.4 - 8, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#3a6b3a';
            ctx.fill();
          }
          ctx.restore();
        },
      },
      {
        offset: 0, speed: 20,
        draw: (ctx, offset, w, h) => {
          ctx.save();
          ctx.globalAlpha = 0.15;
          const cloudStep = 400;
          for (let i = -1; i < w / cloudStep + 2; i++) {
            const cx = i * cloudStep - (offset % cloudStep);
            const cy = 40 + Math.sin(i * 0.8) * 30;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 80, 25, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#e8e0d0';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx - 30, cy - 8, 40, 18, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#ece5d5';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 25, cy - 5, 35, 15, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        },
      },
    ];
  }

  private setupInput(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    if (this.canvas) {
      this.canvas.addEventListener('mousemove', this.boundMouseMove);
      this.canvas.addEventListener('mousedown', this.boundMouseDown);
      this.canvas.addEventListener('mouseup', this.boundMouseUp);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.input.up = true; break;
      case 'KeyS': case 'ArrowDown': this.input.down = true; break;
      case 'KeyA': case 'ArrowLeft': this.input.left = true; break;
      case 'KeyD': case 'ArrowRight': this.input.right = true; break;
      case 'Space':
        e.preventDefault();
        this.input.dash = true;
        if (this.gameState === 'menu') this.startGame();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.input.up = false; break;
      case 'KeyS': case 'ArrowDown': this.input.down = false; break;
      case 'KeyA': case 'ArrowLeft': this.input.left = false; break;
      case 'KeyD': case 'ArrowRight': this.input.right = false; break;
      case 'Space': this.input.dash = false; break;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.input.mouseX = e.clientX - rect.left;
    this.input.mouseY = e.clientY - rect.top;
  }

  private handleMouseDown(e: MouseEvent): void {
    this.input.mouseDown = true;
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.input.mouseX = e.clientX - rect.left;
    this.input.mouseY = e.clientY - rect.top;
    if (this.gameState === 'menu') this.startGame();
  }

  private handleMouseUp(): void {
    this.input.mouseDown = false;
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.gameState === 'playing') {
      this.update(dt);
    }

    this.render();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.score += SCORE_PER_SECOND * dt;

    this.kite.update(dt, this.input);
    this.spawner.update(dt, this.score);
    this.collectibles.update(dt);

    const energy = this.collectibles.checkCollection(this.kite.getHitbox());
    if (energy > 0) {
      this.kite.addEnergy(energy);
    }

    if (!this.kite.state.isDashing && !this.kite.state.invincible) {
      if (this.checkCollision()) {
        this.onHit();
      }
    }

    for (const layer of this.layers) {
      layer.offset += layer.speed * dt;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
      p.rotation += p.rotSpeed * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.emitState();
  }

  private checkCollision(): boolean {
    const hitbox = this.kite.getHitbox();
    const obstacles = this.spawner.getHitboxes();

    for (const o of obstacles) {
      if (
        hitbox.x < o.x + o.w &&
        hitbox.x + hitbox.w > o.x &&
        hitbox.y < o.y + o.h &&
        hitbox.y + hitbox.h > o.y
      ) {
        return true;
      }
    }
    return false;
  }

  private onHit(): void {
    const s = this.kite.state;
    this.spawnCrashParticles(s.x, s.y);

    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
    }

    this.gameState = 'gameover';
    this.emitState();
  }

  private spawnCrashParticles(x: number, y: number): void {
    const colors = ['#c0392b', '#e74c3c', '#f39c12', '#d4a843', '#f5f0e1'];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: PARTICLE_LIFE * (0.5 + Math.random() * 0.5),
        maxLife: PARTICLE_LIFE,
        size: 3 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#f5f0e1';
    ctx.fillRect(0, 0, w, h);

    for (const layer of this.layers) {
      layer.draw(ctx, layer.offset, w, h);
    }

    if (this.gameState === 'playing' || this.gameState === 'gameover') {
      this.spawner.draw(ctx);
      this.collectibles.draw(ctx);
      this.kite.draw(ctx);
      this.drawParticles(ctx);
    }

    if (this.gameState === 'menu') {
      this.drawMenuOverlay(ctx, w, h);
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.moveTo(0, -p.size / 2);
      ctx.lineTo(p.size / 2, 0);
      ctx.lineTo(0, p.size / 2);
      ctx.lineTo(-p.size / 2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private drawMenuOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(245, 240, 225, 0.5)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '72px "Ma Shan Zheng", serif';
    ctx.fillStyle = '#2c1810';
    ctx.fillText('纸鸢乘风', w / 2, h * 0.35);

    ctx.font = '24px "Ma Shan Zheng", serif';
    ctx.fillStyle = '#5a3e2b';
    ctx.fillText('WASD 或鼠标拖拽控制纸鸢', w / 2, h * 0.5);
    ctx.fillText('空格键释放冲刺', w / 2, h * 0.56);

    const pulse = 0.6 + Math.sin(performance.now() / 500) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.font = '28px "Ma Shan Zheng", serif';
    ctx.fillStyle = '#c0392b';
    ctx.fillText('点击或按空格开始', w / 2, h * 0.7);
    ctx.globalAlpha = 1;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange({
        state: this.gameState,
        score: Math.floor(this.score),
        highScore: this.highScore,
        energy: this.kite.state.energy,
        maxEnergy: this.kite.state.maxEnergy,
      });
    }
  }

  getSnapshot(): GameSnapshot {
    return {
      state: this.gameState,
      score: Math.floor(this.score),
      highScore: this.highScore,
      energy: this.kite.state.energy,
      maxEnergy: this.kite.state.maxEnergy,
    };
  }
}
