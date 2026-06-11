import { Turret, Enemy, EnemyType, Bullet, PlanetCore, checkCollision } from './gameObjects';
import { ParticleSystem, StarField } from './particleSystem';
import { UIManager } from './uiManager';

enum GameState {
  START = 'start',
  PLAYING = 'playing',
  GAME_OVER = 'game_over'
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private gameState: GameState;
  private score: number;
  private wave: number;
  private waveEnemiesTotal: number;
  private waveEnemiesSpawned: number;
  private waveSpawnTimer: number;
  private waveAnnouncementAlpha: number;
  private isBossWave: boolean;
  private bossSpawned: boolean;

  private turret: Turret;
  private planet: PlanetCore;
  private enemies: Enemy[];
  private bullets: Bullet[];
  private enemyBullets: Bullet[];

  private particleSystem: ParticleSystem;
  private starField: StarField;
  private uiManager: UIManager;

  private mouseX: number;
  private mouseY: number;
  private isMouseDown: boolean;

  private lastTime: number;
  private animationId: number | null;
  private fps: number;
  private fpsCounter: number;
  private fpsTimer: number;
  private isPaused: boolean;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.gameState = GameState.START;
    this.score = 0;
    this.wave = 0;
    this.waveEnemiesTotal = 0;
    this.waveEnemiesSpawned = 0;
    this.waveSpawnTimer = 0;
    this.waveAnnouncementAlpha = 0;
    this.isBossWave = false;
    this.bossSpawned = false;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    this.planet = new PlanetCore(centerX, centerY);
    this.turret = new Turret(centerX, centerY);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];

    this.particleSystem = new ParticleSystem(300);
    this.starField = new StarField(this.width, this.height, 120);
    this.uiManager = new UIManager(this.width, this.height);

    this.mouseX = centerX;
    this.mouseY = centerY - 100;
    this.isMouseDown = false;

    this.lastTime = 0;
    this.animationId = null;
    this.fps = 60;
    this.fpsCounter = 0;
    this.fpsTimer = 0;
    this.isPaused = false;

    this.setupCanvas();
    this.bindEvents();
    this.hideLoading();
  }

  private setupCanvas(): void {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('blur', () => { this.isPaused = true; });
    window.addEventListener('focus', () => { this.isPaused = false; });
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    if (this.gameState === GameState.START) {
      this.startGame();
      return;
    }
    if (this.gameState === GameState.GAME_OVER) {
      this.restartGame();
      return;
    }
    this.isMouseDown = true;
  }

  private handleMouseUp(): void {
    this.isMouseDown = false;
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.touches[0].clientX - rect.left;
      this.mouseY = e.touches[0].clientY - rect.top;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.gameState === GameState.START) {
      this.startGame();
      return;
    }
    if (this.gameState === GameState.GAME_OVER) {
      this.restartGame();
      return;
    }
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.touches[0].clientX - rect.left;
      this.mouseY = e.touches[0].clientY - rect.top;
    }
    this.isMouseDown = true;
  }

  private handleTouchEnd(): void {
    this.isMouseDown = false;
  }

  private handleResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.setupCanvas();

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    this.planet.x = centerX;
    this.planet.y = centerY;

    this.starField.resize(this.width, this.height);
    this.uiManager.resize(this.width, this.height);
  }

  private startGame(): void {
    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.wave = 0;
    this.planet.currentHp = this.planet.maxHp;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.particleSystem.clear();
    this.startNextWave();
  }

  private restartGame(): void {
    this.startGame();
  }

  private startNextWave(): void {
    this.wave++;
    this.isBossWave = this.wave % 3 === 0;
    this.bossSpawned = false;
    this.waveEnemiesSpawned = 0;
    this.waveSpawnTimer = 0;
    this.waveAnnouncementAlpha = 1;

    if (this.isBossWave) {
      this.waveEnemiesTotal = 1;
    } else {
      this.waveEnemiesTotal = 5 + this.wave * 2;
    }
  }

  private spawnEnemy(): void {
    if (this.waveEnemiesSpawned >= this.waveEnemiesTotal) return;

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const angle = Math.random() * Math.PI * 2;
    const spawnDistance = Math.max(this.width, this.height) * 0.6;
    const x = centerX + Math.cos(angle) * spawnDistance;
    const y = centerY + Math.sin(angle) * spawnDistance;

    let enemy: Enemy;

    if (this.isBossWave && !this.bossSpawned) {
      enemy = new Enemy(EnemyType.BOSS, x, y, centerX, centerY);
      this.bossSpawned = true;
    } else {
      const rand = Math.random();
      const difficultyFactor = Math.min(1, this.wave / 10);

      if (rand < 0.3 + difficultyFactor * 0.2) {
        const sizeRand = Math.random();
        if (sizeRand < 0.3) {
          enemy = new Enemy(EnemyType.ASTEROID_LARGE, x, y, centerX, centerY);
        } else if (sizeRand < 0.6) {
          enemy = new Enemy(EnemyType.ASTEROID_MEDIUM, x, y, centerX, centerY);
        } else {
          enemy = new Enemy(EnemyType.ASTEROID_SMALL, x, y, centerX, centerY);
        }
      } else {
        enemy = new Enemy(EnemyType.FIGHTER, x, y, centerX, centerY);
      }
    }

    this.enemies.push(enemy);
    this.waveEnemiesSpawned++;
  }

  private gameLoop = (timestamp: number): void => {
    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.updateFPS(deltaTime);

    if (!this.isPaused) {
      this.update(deltaTime, timestamp);
    }
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private updateFPS(deltaTime: number): void {
    this.fpsCounter++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }
  }

  private update(deltaTime: number, currentTime: number): void {
    this.uiManager.update(deltaTime);
    this.starField.update(deltaTime);
    this.particleSystem.update(deltaTime);

    if (this.gameState !== GameState.PLAYING) return;

    if (this.waveAnnouncementAlpha > 0) {
      this.waveAnnouncementAlpha -= deltaTime * 0.5;
      if (this.waveAnnouncementAlpha < 0) this.waveAnnouncementAlpha = 0;
    }

    this.planet.update(deltaTime);
    this.turret.update(deltaTime);
    this.turret.updateOrbit(this.planet.x, this.planet.y);
    this.turret.aimAt(this.mouseX, this.mouseY);

    if (this.isMouseDown && this.turret.canFire(currentTime)) {
      const bullet = this.turret.fire(currentTime);
      this.bullets.push(bullet);
    }

    this.waveSpawnTimer += deltaTime;
    const spawnInterval = this.isBossWave ? 0.5 : Math.max(0.5, 2 - this.wave * 0.1);
    if (this.waveSpawnTimer >= spawnInterval && this.waveEnemiesSpawned < this.waveEnemiesTotal) {
      this.spawnEnemy();
      this.waveSpawnTimer = 0;
    }

    const quality = this.particleSystem.getQuality();
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(deltaTime);
      this.particleSystem.emitTrail(bullet.x, bullet.y, '#39ff14', quality);

      if (bullet.isExpired() || this.isOutOfBounds(bullet.x, bullet.y)) {
        this.bullets.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (checkCollision(bullet.getBounds(), enemy.getBounds())) {
          enemy.takeDamage(bullet.damage);
          this.particleSystem.emitHit(bullet.x, bullet.y, quality);
          this.bullets.splice(i, 1);

          if (enemy.isDestroyed()) {
            this.score += enemy.score;
            const colors = enemy.type === EnemyType.BOSS
              ? ['#ff4500', '#ff6600', '#ff8800', '#ffaa00', '#ffff00']
              : ['#ff6600', '#ff8800', '#ffaa00', '#888888', '#aaaaaa'];
            const count = enemy.type === EnemyType.BOSS ? 50 : (enemy.type === EnemyType.ASTEROID_LARGE ? 25 : 15);
            this.particleSystem.emitExplosion(enemy.x, enemy.y, count, colors, quality);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const enemyBullet = enemy.update(deltaTime, currentTime, this.planet.x, this.planet.y);
      if (enemyBullet) {
        this.enemyBullets.push(enemyBullet);
      }

      if (checkCollision(enemy.getBounds(), this.planet.getBounds())) {
        this.planet.takeDamage(enemy.damage);
        this.uiManager.triggerShake(enemy.type === EnemyType.BOSS ? 15 : 8);
        this.uiManager.triggerRedFlash(enemy.type === EnemyType.BOSS ? 0.5 : 0.3);
        const colors = ['#ff4500', '#ff6600', '#888888'];
        this.particleSystem.emitExplosion(enemy.x, enemy.y, 20, colors, quality);
        this.enemies.splice(i, 1);

        if (this.planet.isDestroyed()) {
          this.gameOver();
          return;
        }
        continue;
      }

      if (this.isFarOutOfBounds(enemy.x, enemy.y)) {
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      bullet.update(deltaTime);
      this.particleSystem.emitTrail(bullet.x, bullet.y, '#ff4500', quality);

      if (bullet.isExpired() || this.isOutOfBounds(bullet.x, bullet.y)) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      if (checkCollision(bullet.getBounds(), this.planet.getBounds())) {
        this.planet.takeDamage(bullet.damage);
        this.uiManager.triggerShake(5);
        this.uiManager.triggerRedFlash(0.2);
        this.particleSystem.emitHit(bullet.x, bullet.y, quality);
        this.enemyBullets.splice(i, 1);

        if (this.planet.isDestroyed()) {
          this.gameOver();
          return;
        }
      }
    }

    if (this.enemies.length === 0 && this.waveEnemiesSpawned >= this.waveEnemiesTotal) {
      this.startNextWave();
    }
  }

  private isOutOfBounds(x: number, y: number): boolean {
    const margin = 100;
    return x < -margin || x > this.width + margin || y < -margin || y > this.height + margin;
  }

  private isFarOutOfBounds(x: number, y: number): boolean {
    const margin = 500;
    return x < -margin || x > this.width + margin || y < -margin || y > this.height + margin;
  }

  private gameOver(): void {
    this.gameState = GameState.GAME_OVER;
    this.uiManager.triggerShake(20);
    this.uiManager.triggerRedFlash(0.6);
    const colors = ['#ff4500', '#ff6600', '#ff8800', '#ffff00', '#ffffff'];
    this.particleSystem.emitExplosion(this.planet.x, this.planet.y, 80, colors, 1);
  }

  private render(): void {
    this.ctx.save();
    this.uiManager.applyScreenShake(this.ctx);

    this.starField.render(this.ctx);
    this.planet.render(this.ctx);

    for (const enemy of this.enemies) {
      enemy.render(this.ctx);
    }

    this.turret.render(this.ctx);

    for (const bullet of this.bullets) {
      bullet.render(this.ctx);
    }
    for (const bullet of this.enemyBullets) {
      bullet.render(this.ctx);
    }

    this.particleSystem.render(this.ctx);

    this.ctx.restore();

    this.uiManager.applyRedFlash(this.ctx);

    if (this.gameState === GameState.PLAYING) {
      this.uiManager.drawHealthBar(this.ctx, this.planet.currentHp, this.planet.maxHp);

      const boss = this.enemies.find(e => e.type === EnemyType.BOSS);
      if (boss) {
        this.uiManager.drawBossHealthBar(this.ctx, boss.hp, boss.maxHp, boss.shield, boss.maxShield);
      }

      this.uiManager.drawScore(this.ctx, this.score);
      this.uiManager.drawWave(this.ctx, this.wave, this.waveEnemiesTotal - this.waveEnemiesSpawned + this.enemies.length, this.isBossWave);
      this.uiManager.drawWaveAnnouncement(this.ctx, this.wave, this.isBossWave, this.waveAnnouncementAlpha);
      this.uiManager.drawFPS(this.ctx, this.fps, this.particleSystem.getParticleCount());
    } else if (this.gameState === GameState.START) {
      this.uiManager.drawStartScreen(this.ctx);
    } else if (this.gameState === GameState.GAME_OVER) {
      this.uiManager.drawHealthBar(this.ctx, 0, this.planet.maxHp);
      this.uiManager.drawScore(this.ctx, this.score);
      this.uiManager.drawWave(this.ctx, this.wave, 0, false);
      this.uiManager.drawGameOver(this.ctx, this.score, this.wave);
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

const game = new Game();
game.start();
