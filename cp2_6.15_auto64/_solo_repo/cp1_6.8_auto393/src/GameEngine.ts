import { Player } from './entities/Player';
import { Enemy } from './entities/Enemy';
import { ParticleSystem } from './effects/ParticleSystem';

export interface GameCallbacks {
  onComboChange: (combo: number) => void;
  onPlayerHurt: (health: number) => void;
  onSwordEnergyChange: (energy: number) => void;
  onScreenShake: (intensity: number) => void;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  enemies: Enemy[] = [];
  particles: ParticleSystem;
  keys: Set<string> = new Set();

  private animFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private groundY: number = 0;
  private callbacks: GameCallbacks | null = null;

  private shakeX: number = 0;
  private shakeY: number = 0;
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;

  private bgInkTextures: { x: number; y: number; size: number; alpha: number; angle: number }[] = [];
  private wave: number = 0;

  private spawnTimer: number = 0;
  private spawnInterval: number = 4;
  private maxEnemies: number = 5;

  private gameOver: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = new Player();
    this.particles = new ParticleSystem();
    this.groundY = canvas.height - 80;

    this.generateBgTextures();
    this.setupInput();
  }

  setCallbacks(cb: GameCallbacks): void {
    this.callbacks = cb;
  }

  private generateBgTextures(): void {
    this.bgInkTextures = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = 0; i < 30; i++) {
      this.bgInkTextures.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 30 + Math.random() * 80,
        alpha: 0.03 + Math.random() * 0.06,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  private setupInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'r' && this.gameOver) {
        this.resetGame();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.spawnInitialEnemies();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.groundY = height - 80;
    this.generateBgTextures();
  }

  private spawnInitialEnemies(): void {
    this.enemies = [];
    const w = this.canvas.width;
    for (let i = 0; i < 3; i++) {
      this.enemies.push(new Enemy(w * 0.4 + i * 150 + Math.random() * 60));
    }
  }

  private resetGame(): void {
    this.player = new Player();
    this.particles.clear();
    this.enemies = [];
    this.gameOver = false;
    this.spawnTimer = 0;
    this.shakeIntensity = 0;
    this.spawnInitialEnemies();
  }

  private loop = (now: number): void => {
    if (!this.running) return;

    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;
    this.wave += dt;

    if (!this.gameOver) {
      this.update(dt);
    }
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.player.update(dt, this.keys, this.particles, this.canvas.width, this.groundY);

    if (this.player.health <= 0) {
      this.gameOver = true;
      return;
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && this.enemies.filter(e => e.alive).length < this.maxEnemies) {
      this.spawnTimer = 0;
      const side = Math.random() < 0.5 ? 0.85 : 0.1;
      this.enemies.push(new Enemy(this.canvas.width * side + Math.random() * 60));
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.update(dt, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, this.particles, this.canvas.width, this.groundY);

      const atkBox = enemy.getAttackHitbox();
      if (atkBox && this.rectsOverlap(
        atkBox.x, atkBox.y, atkBox.w, atkBox.h,
        this.player.x, this.player.y, this.player.width, this.player.height,
      )) {
        const hit = this.player.takeDamage(this.particles);
        if (hit) {
          this.shake(4);
          this.callbacks?.onPlayerHurt(this.player.health);
        }
      }
    }

    const playerAtk = this.player.attackHitbox;
    if (playerAtk) {
      for (const enemy of this.enemies) {
        if (!enemy.alive || this.player.hasHitThisAttack) continue;
        if (this.rectsOverlap(
          playerAtk.x, playerAtk.y, playerAtk.w, playerAtk.h,
          enemy.x, enemy.y, enemy.width, enemy.height,
        )) {
          const dmg = this.player.state === 'ultimate' ? 3 : this.player.state === 'heavy' ? 2 : 1;
          const kbDir = this.player.facing;
          enemy.takeDamage(dmg, kbDir, this.particles);
          this.player.onHitEnemy(
            this.player.state === 'ultimate' ? 'ultimate' : this.player.state === 'heavy' ? 'heavy' : 'light',
            this.particles,
          );
          this.shake(this.player.state === 'ultimate' ? 8 : this.player.state === 'heavy' ? 5 : 3);
          this.callbacks?.onComboChange(this.player.combo);
          this.callbacks?.onSwordEnergyChange(this.player.swordEnergy);
        }
      }
    }

    if (this.player.combo >= 5) {
      this.particles.emitGoldHalo(0, 0, this.canvas.width, this.canvas.height);
    }

    this.particles.update(dt);

    if (this.shakeIntensity > 0.5) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeIntensity = 0;
    }

    this.enemies = this.enemies.filter(e => e.alive || e.state !== 'dead');
  }

  private shake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private rectsOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(0.5, '#0d0d0d');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(-10, -10, w + 20, h + 20);

    for (const t of this.bgInkTextures) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle + Math.sin(this.wave * 0.3 + t.x * 0.01) * 0.05);
      ctx.globalAlpha = t.alpha + Math.sin(this.wave + t.y * 0.02) * 0.01;
      ctx.fillStyle = 'rgba(100,120,140,1)';
      ctx.beginPath();
      ctx.ellipse(0, 0, t.size, t.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, h);
    groundGrad.addColorStop(0, 'rgba(40,35,30,0.8)');
    groundGrad.addColorStop(1, 'rgba(20,18,15,0.9)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    ctx.strokeStyle = 'rgba(100,90,70,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    for (let i = 0; i <= w; i += 4) {
      ctx.lineTo(i, this.groundY + Math.sin(i * 0.02 + this.wave) * 2);
    }
    ctx.stroke();

    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }

    this.player.render(ctx);

    this.particles.render(ctx);

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c83030';
      ctx.font = 'bold 48px serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255,50,50,0.5)';
      ctx.shadowBlur = 20;
      ctx.fillText('剑断境灭', w / 2, h / 2 - 30);
      ctx.font = '20px serif';
      ctx.fillStyle = 'rgba(200,200,200,0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText('按 R 重新开始', w / 2, h / 2 + 20);
    }

    ctx.restore();
  }
}
