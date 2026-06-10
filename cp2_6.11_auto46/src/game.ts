import { Player } from './player';
import { Enemy } from './enemy';
import { ParticleSystem } from './particle';
import type { Bullet } from './particle';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  enemies: Enemy[] = [];
  particles: ParticleSystem;
  width: number;
  height: number;
  time: number = 0;
  speedMultiplier: number = 1;
  isSilentMode: boolean = false;
  silentModeTimer: number = 0;
  silentModeDuration: number = 1.5;
  stunDuration: number = 1;
  keys: Set<string> = new Set();
  spaceJustPressed: boolean = false;
  spaceJustReleased: boolean = false;
  spaceWasDown: boolean = false;
  spawnTimer: number = 0;
  spawnInterval: number = 1.5;
  lastTime: number = 0;
  fps: number = 60;
  fpsTimer: number = 0;
  frameCount: number = 0;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private stars: { x: number; y: number; size: number; alpha: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    this.bgCtx = this.bgCanvas.getContext('2d')!;
    
    this.initStars();
    this.renderBackgroundToCache();
    
    this.player = new Player(this.width / 2, this.height * 0.75);
    this.particles = new ParticleSystem();

    this.setupEventListeners();
  }

  private initStars(): void {
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: (i * 137.5) % this.width,
        y: (i * 97.3) % this.height,
        size: (i % 3) * 0.5 + 0.5,
        alpha: 0.3 + (i % 5) * 0.1
      });
    }
  }

  private renderBackgroundToCache(): void {
    const gradient = this.bgCtx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.5
    );
    gradient.addColorStop(0, '#0B1026');
    gradient.addColorStop(1, '#1A0E30');
    
    this.bgCtx.fillStyle = gradient;
    this.bgCtx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      this.bgCtx.globalAlpha = star.alpha;
      this.bgCtx.fillStyle = '#FFFFFF';
      this.bgCtx.beginPath();
      this.bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.bgCtx.fill();
    }
    this.bgCtx.globalAlpha = 1;
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ') {
        e.preventDefault();
        if (!this.spaceWasDown) {
          this.spaceJustPressed = true;
        }
        this.spaceWasDown = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (e.key === ' ') {
        e.preventDefault();
        this.spaceJustReleased = true;
        this.spaceWasDown = false;
      }
    });

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.bgCanvas.width = this.width;
      this.bgCanvas.height = this.height;
      this.renderBackgroundToCache();
    });
  }

  init(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.update(dt);
    this.render();

    this.spaceJustPressed = false;
    this.spaceJustReleased = false;

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt: number): void {
    this.time += dt;

    const speedIncreaseInterval = 30;
    const speedIncrease = 0.1;
    this.speedMultiplier = 1 + Math.floor(this.time / speedIncreaseInterval) * speedIncrease;

    if (this.isSilentMode) {
      this.silentModeTimer -= dt;
      if (this.silentModeTimer <= 0) {
        this.isSilentMode = false;
      }
    }

    const bullet = this.player.update(
      dt, 
      this.keys, 
      this.spaceJustPressed, 
      this.spaceJustReleased,
      this.particles
    );
    if (bullet) {
      this.particles.addBullet(bullet as Omit<Bullet, 'trail' | 'isReflected' | 'reflectedAt'>);
    }

    if (this.spaceJustReleased) {
      const released = this.player.handleSpaceRelease();
      if (released) {
        this.startSilentMode();
      }
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && this.enemies.length < this.particles.getMaxEnemies()) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this.speedMultiplier);
    }

    this.particles.update(dt);
    this.particles.checkBulletShockwaveCollisions();

    this.checkCollisions();

    this.enemies = this.enemies.filter(e => e.isAlive && !e.isOffScreen(this.width, this.height));
  }

  spawnEnemy(): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number, vx: number, vy: number;
    const baseSpeed = 80;

    switch (side) {
      case 0:
        x = Math.random() * this.width;
        y = -30;
        vx = (Math.random() - 0.5) * baseSpeed;
        vy = baseSpeed * (0.5 + Math.random() * 0.5);
        break;
      case 1:
        x = this.width + 30;
        y = Math.random() * this.height;
        vx = -baseSpeed * (0.5 + Math.random() * 0.5);
        vy = (Math.random() - 0.5) * baseSpeed;
        break;
      case 2:
        x = Math.random() * this.width;
        y = this.height + 30;
        vx = (Math.random() - 0.5) * baseSpeed;
        vy = -baseSpeed * (0.5 + Math.random() * 0.5);
        break;
      default:
        x = -30;
        y = Math.random() * this.height;
        vx = baseSpeed * (0.5 + Math.random() * 0.5);
        vy = (Math.random() - 0.5) * baseSpeed;
    }

    this.enemies.push(new Enemy(x, y, vx, vy));
  }

  checkCollisions(): void {
    const bullets = this.particles.bullets;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i]!;
      for (const enemy of this.enemies) {
        if (!enemy.isAlive) continue;
        
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= enemy.radius + bullet.radius + 2) {
          const hitCore = enemy.showCore && dist <= 12 + bullet.radius;
          if (enemy.hit(hitCore)) {
            this.particles.addFragments(enemy.getFragments());
            this.particles.addShockwave(enemy.getShockwave());
            bullets.splice(i, 1);
            break;
          }
          if (!bullet.isReflected) {
            bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    const playerBounds = this.player.getBounds();
    for (const enemy of this.enemies) {
      if (!enemy.isAlive || enemy.isStunned) continue;
      
      const closestX = Math.max(playerBounds.x, Math.min(enemy.x, playerBounds.x + playerBounds.width));
      const closestY = Math.max(playerBounds.y, Math.min(enemy.y, playerBounds.y + playerBounds.height));
      const dx = enemy.x - closestX;
      const dy = enemy.y - closestY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= enemy.radius + 2) {
        this.player.takeDamage();
      }
    }
  }

  startSilentMode(): void {
    this.isSilentMode = true;
    this.silentModeTimer = this.silentModeDuration;
    
    for (const enemy of this.enemies) {
      enemy.stun(this.stunDuration);
    }
  }

  render(): void {
    this.renderBackground();

    if (this.isSilentMode) {
      this.ctx.save();
      this.ctx.filter = 'grayscale(100%) brightness(1.2)';
    }

    for (const enemy of this.enemies) {
      enemy.render(this.ctx, this.isSilentMode);
    }

    this.particles.render(this.ctx);
    this.player.render(this.ctx);

    if (this.isSilentMode) {
      this.ctx.restore();
    }

    this.player.renderEnergyBar(this.ctx, this.width, this.height);

    this.renderFPS();
  }

  private renderBackground(): void {
    this.ctx.drawImage(this.bgCanvas, 0, 0);
  }

  private renderFPS(): void {
    this.ctx.fillStyle = '#66D9EF88';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    this.ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 35);
    this.ctx.fillText(`Particles: ${this.particles.getTotalParticles()}`, 10, 50);
  }
}
