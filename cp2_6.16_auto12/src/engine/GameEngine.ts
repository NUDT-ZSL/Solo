import { CollisionSystem } from './CollisionSystem';
import type { LevelData, EnemyInstance, BulletPattern, Position, PlayableCallback, PlayableStatus } from '../types';
import { ENEMY_CONFIGS } from '../types';

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  radius: number;
  invincible: boolean;
  invincibleTimer: number;
  blinkPhase: number;
}

interface Enemy {
  id: string;
  type: 'normal' | 'elite' | 'boss';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  spawnTime: number;
  pathTime: number;
  path: { controlPoints: [Position, Position, Position]; duration: number };
  bulletPattern: BulletPattern;
  fireTimer: number;
  spiralAngle: number;
  active: boolean;
  shieldRotation: number;
  pulsePhase: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: 'player' | 'enemy';
  shape: 'circle' | 'diamond' | 'star';
  trail: Position[];
  isHoming: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface VictoryParticle {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
}

let currentLevelData: LevelData | null = null;
let playableCallback: PlayableCallback | null = null;

export function sendLevelData(levelData: LevelData): void {
  currentLevelData = levelData;
}

export function setPlayableCallback(callback: PlayableCallback): void {
  playableCallback = callback;
}

function notifyStatus(status: PlayableStatus): void {
  if (playableCallback) {
    playableCallback(status);
  }
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private collisionSystem: CollisionSystem;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private fixedDt: number = 1 / 60;
  private accumulator: number = 0;

  private player: Player;
  private enemies: Enemy[] = [];
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private particles: Particle[] = [];
  private victoryParticles: VictoryParticle[] = [];

  private keys: Set<string> = new Set();
  private shootTimer: number = 0;
  private gameTime: number = 0;
  private score: number = 0;
  private lives: number = 3;
  private wave: number = 1;

  private status: PlayableStatus = 'ready';
  private isPaused: boolean = false;
  private fadeInAlpha: number = 0;
  private restarting: boolean = false;
  private startTime: number = 0;

  private bulletIdCounter: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.collisionSystem = new CollisionSystem(50);

    this.player = {
      x: 100,
      y: 300,
      vx: 0,
      vy: 0,
      targetVx: 0,
      targetVy: 0,
      radius: 12,
      invincible: false,
      invincibleTimer: 0,
      blinkPhase: 0
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
    if (e.code === 'KeyP' && this.status === 'running') {
      this.togglePause();
    }
    if (e.code === 'KeyR') {
      this.restart();
    }
    if (e.code === 'Escape') {
      this.stop();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  start(): void {
    if (!currentLevelData) {
      console.error('No level data loaded');
      return;
    }

    this.loadLevel(currentLevelData);
    this.status = 'running';
    this.isPaused = false;
    this.startTime = performance.now();
    notifyStatus('running');
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.restarting = true;
    this.fadeInAlpha = 0;
    this.loop();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    notifyStatus('ready');
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.status = this.isPaused ? 'paused' : 'running';
    notifyStatus(this.status);
  }

  private restart(): void {
    if (!currentLevelData) return;
    this.loadLevel(currentLevelData);
    this.status = 'running';
    this.isPaused = false;
    this.restarting = true;
    this.fadeInAlpha = 0;
    this.startTime = performance.now();
    notifyStatus('running');
  }

  private loadLevel(levelData: LevelData): void {
    this.enemies = levelData.enemies.map(e => this.createEnemy(e));
    this.playerBullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.victoryParticles = [];
    this.gameTime = 0;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.shootTimer = 0;
    this.bulletIdCounter = 0;

    this.player.x = 100;
    this.player.y = this.canvas.height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invincible = false;
    this.player.invincibleTimer = 0;
  }

  private createEnemy(instance: EnemyInstance): Enemy {
    const config = ENEMY_CONFIGS[instance.type];
    return {
      id: instance.id,
      type: instance.type,
      x: instance.initialPosition.x,
      y: instance.initialPosition.y,
      health: config.health,
      maxHealth: config.health,
      spawnTime: instance.spawnTime,
      pathTime: 0,
      path: instance.path,
      bulletPattern: instance.bulletPattern,
      fireTimer: 0,
      spiralAngle: 0,
      active: false,
      shieldRotation: 0,
      pulsePhase: 0
    };
  }

  private loop(): void {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.1) dt = 0.1;

    if (!this.isPaused && this.status === 'running') {
      this.accumulator += dt;
      while (this.accumulator >= this.fixedDt) {
        this.update(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }

      if (this.restarting) {
        this.fadeInAlpha += dt;
        if (this.fadeInAlpha >= 1) {
          this.fadeInAlpha = 1;
          this.restarting = false;
        }
      }
    }

    this.render();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.gameTime += dt;

    this.updatePlayer(dt);
    this.updateShooting(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateParticles(dt);
    this.handleCollisions();
    this.checkVictory();

    if (this.status === 'victory') {
      this.updateVictoryParticles(dt);
    }
  }

  private updatePlayer(dt: number): void {
    const speed = 240;
    this.player.targetVx = 0;
    this.player.targetVy = 0;

    if (this.keys.has('KeyW')) this.player.targetVy = -speed;
    if (this.keys.has('KeyS')) this.player.targetVy = speed;
    if (this.keys.has('KeyA')) this.player.targetVx = -speed;
    if (this.keys.has('KeyD')) this.player.targetVx = speed;

    const accel = 2400;
    const dvx = this.player.targetVx - this.player.vx;
    const dvy = this.player.targetVy - this.player.vy;
    const maxDelta = accel * dt;

    if (Math.abs(dvx) <= maxDelta) {
      this.player.vx = this.player.targetVx;
    } else {
      this.player.vx += Math.sign(dvx) * maxDelta;
    }

    if (Math.abs(dvy) <= maxDelta) {
      this.player.vy = this.player.targetVy;
    } else {
      this.player.vy += Math.sign(dvy) * maxDelta;
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const margin = 20;
    this.player.x = Math.max(margin, Math.min(this.canvas.width - margin, this.player.x));
    this.player.y = Math.max(margin, Math.min(this.canvas.height - margin, this.player.y));

    if (this.player.invincible) {
      this.player.invincibleTimer -= dt;
      this.player.blinkPhase += dt * 20;
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
      }
    }
  }

  private updateShooting(dt: number): void {
    this.shootTimer -= dt;
    if (this.keys.has('Space') && this.shootTimer <= 0) {
      this.shootTimer = 0.15;
      this.playerBullets.push({
        id: `pb_${this.bulletIdCounter++}`,
        x: this.player.x + 20,
        y: this.player.y,
        vx: 600,
        vy: 0,
        radius: 3,
        color: '#ffeb3b',
        type: 'player',
        shape: 'circle',
        trail: [],
        isHoming: false
      });
    }
  }

  private updateEnemies(dt: number): void {
    this.enemies.forEach(enemy => {
      if (this.gameTime >= enemy.spawnTime && !enemy.active) {
        enemy.active = true;
      }

      if (!enemy.active) return;

      enemy.pathTime += dt;
      const t = Math.min(1, enemy.pathTime / enemy.path.duration);
      const p = this.evaluateBezier(enemy.path.controlPoints, t);
      enemy.x = p.x;
      enemy.y = p.y;

      if (enemy.type === 'elite') {
        enemy.shieldRotation += dt * 3;
      }
      if (enemy.type === 'boss') {
        enemy.pulsePhase += dt * 4;
      }

      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        enemy.fireTimer = 1 / enemy.bulletPattern.fireRate;
        this.fireEnemyBullet(enemy, dt);
      }
    });
  }

  private evaluateBezier(points: [Position, Position, Position], t: number): Position {
    const mt = 1 - t;
    return {
      x: mt * mt * points[0].x + 2 * mt * t * points[1].x + t * t * points[2].x,
      y: mt * mt * points[0].y + 2 * mt * t * points[1].y + t * t * points[2].y
    };
  }

  private fireEnemyBullet(enemy: Enemy, dt: number): void {
    const pattern = enemy.bulletPattern;
    const speed = pattern.bulletSpeed;

    if (pattern.type === 'aimed') {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      this.enemyBullets.push({
        id: `eb_${this.bulletIdCounter++}`,
        x: enemy.x,
        y: enemy.y,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        radius: pattern.bulletSize / 2,
        color: pattern.bulletColor,
        type: 'enemy',
        shape: 'diamond',
        trail: [],
        isHoming: true
      });
    } else if (pattern.type === 'fan') {
      const count = pattern.count || 6;
      const angleRange = (pattern.angle || 60) * Math.PI / 180;
      const startAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x) - angleRange / 2;
      for (let i = 0; i < count; i++) {
        const angle = startAngle + (angleRange * i) / (count - 1 || 1);
        this.enemyBullets.push({
          id: `eb_${this.bulletIdCounter++}`,
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: pattern.bulletSize / 2,
          color: pattern.bulletColor,
          type: 'enemy',
          shape: 'circle',
          trail: [],
          isHoming: false
        });
      }
    } else if (pattern.type === 'spiral') {
      const count = pattern.count || 8;
      for (let i = 0; i < count; i++) {
        const angle = enemy.spiralAngle + (Math.PI * 2 * i) / count;
        this.enemyBullets.push({
          id: `eb_${this.bulletIdCounter++}`,
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: pattern.bulletSize / 2,
          color: pattern.bulletColor,
          type: 'enemy',
          shape: 'star',
          trail: [],
          isHoming: false
        });
      }
      enemy.spiralAngle += dt * 2;
    }
  }

  private updateBullets(dt: number): void {
    const updateBullet = (bullet: Bullet) => {
      bullet.trail.unshift({ x: bullet.x, y: bullet.y });
      if (bullet.trail.length > 6) bullet.trail.pop();

      if (bullet.isHoming) {
        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
        const currentAngle = Math.atan2(bullet.vy, bullet.vx);
        const targetAngle = Math.atan2(this.player.y - bullet.y, this.player.x - bullet.x);

        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const turnSpeed = 3;
        const maxTurn = turnSpeed * dt;
        const t = Math.max(-1, Math.min(1, angleDiff / maxTurn));
        const newAngle = currentAngle + t * maxTurn;

        bullet.vx = Math.cos(newAngle) * speed;
        bullet.vy = Math.sin(newAngle) * speed;
      }

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    };

    this.playerBullets.forEach(updateBullet);
    this.enemyBullets.forEach(updateBullet);

    this.playerBullets = this.playerBullets.filter(b =>
      b.x > -50 && b.x < this.canvas.width + 50 && b.y > -50 && b.y < this.canvas.height + 50
    );
    this.enemyBullets = this.enemyBullets.filter(b =>
      b.x > -50 && b.x < this.canvas.width + 50 && b.y > -50 && b.y < this.canvas.height + 50
    );
  }

  private updateParticles(dt: number): void {
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateVictoryParticles(dt: number): void {
    if (Math.random() < 0.5) {
      this.victoryParticles.push({
        x: Math.random() * this.canvas.width,
        y: -10,
        vy: 100 + Math.random() * 150,
        size: 3 + Math.random() * 5,
        alpha: 0.7 + Math.random() * 0.3
      });
    }
    this.victoryParticles.forEach(p => {
      p.y += p.vy * dt;
    });
    this.victoryParticles = this.victoryParticles.filter(p => p.y < this.canvas.height + 20);
  }

  private handleCollisions(): void {
    const playerCollidable = {
      id: 'player',
      x: this.player.x,
      y: this.player.y,
      radius: this.player.radius
    };

    const events = this.collisionSystem.checkCollisions(
      this.playerBullets.map(b => ({ id: b.id, x: b.x, y: b.y, radius: b.radius })),
      this.enemies.filter(e => e.active).map(e => ({
        id: e.id,
        x: e.x,
        y: e.y,
        radius: ENEMY_CONFIGS[e.type].width / 2
      })),
      this.enemyBullets.map(b => ({ id: b.id, x: b.x, y: b.y, radius: b.radius })),
      playerCollidable
    );

    const destroyedEnemyIds = new Set<string>();
    const destroyedPlayerBulletIds = new Set<string>();
    const destroyedEnemyBulletIds = new Set<string>();

    events.forEach(event => {
      if (event.aType === 'playerBullet' && event.bType === 'enemy') {
        destroyedPlayerBulletIds.add(event.aId);
        const enemy = this.enemies.find(e => e.id === event.bId);
        if (enemy) {
          enemy.health--;
          if (enemy.health <= 0) {
            destroyedEnemyIds.add(event.bId);
            this.score += enemy.type === 'boss' ? 1000 : enemy.type === 'elite' ? 100 : 10;
            this.spawnExplosion(enemy.x, enemy.y);
          }
        }
      }

      if (event.aType === 'player' && event.bType === 'enemyBullet' && !this.player.invincible) {
        destroyedEnemyBulletIds.add(event.bId);
        this.playerHit();
      }

      if (event.aType === 'player' && event.bType === 'enemy' && !this.player.invincible) {
        this.playerHit();
      }
    });

    this.playerBullets = this.playerBullets.filter(b => !destroyedPlayerBulletIds.has(b.id));
    this.enemyBullets = this.enemyBullets.filter(b => !destroyedEnemyBulletIds.has(b.id));
    this.enemies = this.enemies.filter(e => !destroyedEnemyIds.has(e.id));
  }

  private playerHit(): void {
    this.lives--;
    this.player.invincible = true;
    this.player.invincibleTimer = 0.3;
    this.spawnExplosion(this.player.x, this.player.y);

    if (this.lives <= 0) {
      this.status = 'defeat';
      notifyStatus('defeat');
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 100 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        color: Math.random() > 0.5 ? '#ff9800' : '#ff5722',
        size: 3 + Math.random() * 4
      });
    }
  }

  private checkVictory(): void {
    const activeEnemies = this.enemies.filter(e => e.active);
    const pendingEnemies = this.enemies.filter(e => !e.active);

    if (activeEnemies.length === 0 && pendingEnemies.length === 0 && this.status === 'running') {
      this.status = 'victory';
      notifyStatus('victory');
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a1929';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderParticles();
    this.renderBullets();
    this.renderEnemies();
    this.renderPlayer();
    this.renderHUD();

    if (this.isPaused) {
      this.renderPause();
    }

    if (this.status === 'victory') {
      this.renderVictory();
    }

    if (this.restarting) {
      ctx.fillStyle = `rgba(10, 25, 41, ${1 - this.fadeInAlpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const p = this.player;

    if (p.invincible && Math.floor(p.blinkPhase) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, -15);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderEnemies(): void {
    const ctx = this.ctx;
    this.enemies.filter(e => e.active).forEach(enemy => {
      const config = ENEMY_CONFIGS[enemy.type];
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      if (enemy.type === 'boss') {
        const pulse = 1 + Math.sin(enemy.pulsePhase) * 0.15;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, config.width * pulse);
        gradient.addColorStop(0, 'rgba(123, 31, 162, 0.6)');
        gradient.addColorStop(1, 'rgba(123, 31, 162, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-config.width * pulse, -config.height * pulse, config.width * 2 * pulse, config.height * 2 * pulse);
      }

      if (enemy.type === 'elite') {
        ctx.rotate(enemy.shieldRotation);
        ctx.strokeStyle = '#ffab40';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, config.width * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate(-enemy.shieldRotation);
      }

      ctx.fillStyle = config.color;
      ctx.fillRect(-config.width / 2, -config.height / 2, config.width, config.height);

      if (enemy.maxHealth > 1) {
        const barWidth = config.width;
        const barHeight = 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, -config.height / 2 - 10, barWidth, barHeight);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(-barWidth / 2, -config.height / 2 - 10, barWidth * (enemy.health / enemy.maxHealth), barHeight);
      }

      ctx.restore();
    });
  }

  private renderBullets(): void {
    const ctx = this.ctx;

    const renderBullet = (bullet: Bullet) => {
      bullet.trail.forEach((pos, i) => {
        const alpha = 1 - i / bullet.trail.length;
        ctx.fillStyle = bullet.color + Math.floor(alpha * 80).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, bullet.radius * (1 - i * 0.1), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.fillStyle = bullet.color;

      if (bullet.shape === 'diamond') {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-bullet.radius, -bullet.radius, bullet.radius * 2, bullet.radius * 2);
      } else if (bullet.shape === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const outerX = Math.cos(angle) * bullet.radius * 1.5;
          const outerY = Math.sin(angle) * bullet.radius * 1.5;
          const innerAngle = angle + Math.PI / 5;
          const innerX = Math.cos(innerAngle) * bullet.radius * 0.6;
          const innerY = Math.sin(innerAngle) * bullet.radius * 0.6;
          if (i === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    this.playerBullets.forEach(renderBullet);
    this.enemyBullets.forEach(renderBullet);
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderHUD(): void {
    const ctx = this.ctx;

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(30 + i * 35, 30);
      ctx.fillStyle = i < this.lives ? '#ff1744' : '#333';
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-15, -10, -15, 10, 0, 18);
      ctx.bezierCurveTo(15, 10, 15, -10, 0, 5);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.score}`, this.canvas.width - 20, 40);

    ctx.fillStyle = '#ea80fc';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Wave ${this.wave}`, this.canvas.width / 2, 35);
  }

  private renderPause(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.67)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂停', this.canvas.width / 2, this.canvas.height / 2);
    ctx.font = '18px sans-serif';
    ctx.fillText('按 P 继续，按 R 重新开始', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }

  private renderVictory(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.victoryParticles.forEach(p => {
      ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Victory!', this.canvas.width / 2, this.canvas.height / 2 - 40);

    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(2);
    ctx.font = '24px sans-serif';
    ctx.fillText(`耗时: ${elapsed}s`, this.canvas.width / 2, this.canvas.height / 2 + 30);
    ctx.fillText(`最终分数: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 70);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('按 ESC 返回编辑器', this.canvas.width / 2, this.canvas.height / 2 + 130);
  }
}
