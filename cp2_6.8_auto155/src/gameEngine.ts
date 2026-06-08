
import {
  Ship,
  Ore,
  Asteroid,
  Bug,
  Bullet,
  Particle,
  Star,
  Nebula,
  InputState,
  OreColor,
  ORE_COLORS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT
} from './entities';

const MAX_ORES = 30;
const MAX_ASTEROIDS = 20;
const MAX_BUGS = 10;
const MAX_BULLETS = 20;
const MAX_PARTICLES = 500;
const ORE_SPAWN_INTERVAL = 2000;
const ASTEROID_SPAWN_INTERVAL = 4000;
const BUG_SPAWN_INTERVAL = 8000;

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private ship: Ship;
  private ores: Ore[] = [];
  private asteroids: Asteroid[] = [];
  private bugs: Bug[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private nebulae: Nebula[] = [];

  private input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    shoot: false
  };

  private time: number = 0;
  private lastOreSpawn: number = 0;
  private lastAsteroidSpawn: number = 0;
  private lastBugSpawn: number = 0;
  private gameOver: boolean = false;
  private gameOverTime: number = 0;
  private energies: { red: number; blue: number; green: number } = { red: 0, blue: 0, green: 0 };

  private lastFrameTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.ship = new Ship(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    for (let i = 0; i < 80; i++) {
      this.stars.push(new Star());
    }
    for (let i = 0; i < 3; i++) {
      this.nebulae.push(new Nebula());
    }

    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.boost = true;
        break;
      case 'Space':
        this.input.shoot = true;
        e.preventDefault();
        break;
      case 'KeyR':
        if (this.gameOver) {
          this.restart();
        }
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.boost = false;
        break;
      case 'Space':
        this.input.shoot = false;
        break;
    }
  }

  restart(): void {
    this.ship = new Ship(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.ores = [];
    this.asteroids = [];
    this.bugs = [];
    this.bullets = [];
    this.particles = [];
    this.time = 0;
    this.lastOreSpawn = 0;
    this.lastAsteroidSpawn = 0;
    this.lastBugSpawn = 0;
    this.gameOver = false;
    this.gameOverTime = 0;
    this.energies = { red: 0, blue: 0, green: 0 };
    this.input = { up: false, down: false, left: false, right: false, boost: false, shoot: false };
  }

  private spawnOres(): void {
    if (this.ores.filter(o => o.active).length >= MAX_ORES) return;
    const colors: OreColor[] = ['red', 'blue', 'green'];
    for (let i = 0; i < 3; i++) {
      if (this.ores.filter(o => o.active).length >= MAX_ORES) break;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
      const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
      this.ores.push(new Ore(x, y, color));
    }
  }

  private spawnAsteroid(): void {
    if (this.asteroids.filter(a => a.active && !a.breaking).length >= MAX_ASTEROIDS) return;
    const size = 40 + Math.random() * 40;
    const y = size + Math.random() * (CANVAS_HEIGHT - size * 2);
    this.asteroids.push(new Asteroid(CANVAS_WIDTH + size, y, size));
  }

  private spawnBug(): void {
    if (this.bugs.filter(b => b.active).length >= MAX_BUGS) return;
    const side = Math.random() < 0.5 ? 'left' : 'right';
    this.bugs.push(new Bug(side));
  }

  private spawnParticles(x: number, y: number, color: string, count: number, life: number = 0.2): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.filter(p => p.active).length >= MAX_PARTICLES) break;
      this.particles.push(new Particle(x, y, color, life));
    }
  }

  private checkCollision(a: { x: number; y: number; width: number; height: number },
                         b: { x: number; y: number; width: number; height: number }): boolean {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
           Math.abs(a.y - b.y) < (a.height + b.height) / 2;
  }

  private handleCollisions(): void {
    const now = this.time * 1000;

    if (this.input.shoot && this.ship.canShoot(now)) {
      if (this.bullets.filter(b => b.active).length < MAX_BULLETS) {
        this.bullets.push(this.ship.shoot(now));
      }
    }

    for (const ore of this.ores) {
      if (!ore.active) continue;
      if (this.checkCollision(this.ship, ore)) {
        ore.active = false;
        this.energies[ore.color]++;
        this.spawnParticles(ore.x, ore.y, ORE_COLORS[ore.color], 20, 0.2);
      }
    }

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;
      for (const asteroid of this.asteroids) {
        if (!asteroid.active || asteroid.breaking) continue;
        if (this.checkCollision(bullet, asteroid)) {
          bullet.active = false;
          asteroid.break();
          this.spawnParticles(asteroid.x, asteroid.y, '#9CA3AF', 15, 0.15);
          break;
        }
      }
    }

    for (const bug of this.bugs) {
      if (!bug.active) continue;
      if (this.checkCollision(this.ship, bug)) {
        this.triggerGameOver();
        return;
      }
    }
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.gameOverTime = this.time;
    this.spawnParticles(this.ship.x, this.ship.y, '#00D4FF', 40, 0.5);
    this.spawnParticles(this.ship.x, this.ship.y, '#FF4500', 30, 0.5);
  }

  private update(deltaTime: number): void {
    if (this.gameOver) {
      this.particles.forEach(p => p.update(deltaTime));
      this.particles = this.particles.filter(p => p.active);
      return;
    }

    this.time += deltaTime;
    const nowMs = this.time * 1000;

    this.ship.update(deltaTime, this.input);

    if (nowMs - this.lastOreSpawn >= ORE_SPAWN_INTERVAL) {
      this.spawnOres();
      this.lastOreSpawn = nowMs;
    }
    if (nowMs - this.lastAsteroidSpawn >= ASTEROID_SPAWN_INTERVAL) {
      this.spawnAsteroid();
      this.lastAsteroidSpawn = nowMs;
    }
    if (nowMs - this.lastBugSpawn >= BUG_SPAWN_INTERVAL) {
      this.spawnBug();
      this.lastBugSpawn = nowMs;
    }

    this.ores.forEach(o => { if (o.active) o.update(deltaTime, this.time); });
    this.asteroids.forEach(a => { if (a.active) a.update(deltaTime); });
    this.bugs.forEach(b => { if (b.active) b.update(deltaTime, this.ship.x, this.ship.y, this.time); });
    this.bullets.forEach(b => { if (b.active) b.update(deltaTime); });
    this.particles.forEach(p => { if (p.active) p.update(deltaTime); });
    this.stars.forEach(s => s.update());

    this.ores = this.ores.filter(o => o.active);
    this.asteroids = this.asteroids.filter(a => a.active);
    this.bugs = this.bugs.filter(b => b.active);
    this.bullets = this.bullets.filter(b => b.active);
    this.particles = this.particles.filter(p => p.active);

    this.handleCollisions();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0A0F2E');
    gradient.addColorStop(1, '#1A1A3A');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.nebulae.forEach(n => n.draw(this.ctx));
    this.stars.forEach(s => s.draw(this.ctx));
  }

  private drawHUD(): void {
    this.ctx.save();
    this.ctx.font = '14px "Press Start 2P", monospace';
    this.ctx.textAlign = 'left';

    const startX = CANVAS_WIDTH - 180;
    const startY = 30;

    const drawEnergy = (color: string, label: string, value: number, offset: number) => {
      this.ctx.save();
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(startX + 10, startY + offset, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 4;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.strokeText(`${label} ${value}`, startX + 28, startY + offset + 5);
      this.ctx.fillText(`${label} ${value}`, startX + 28, startY + offset + 5);
    };

    drawEnergy('#FF6B6B', 'R', this.energies.red, 0);
    drawEnergy('#4FC3F7', 'B', this.energies.blue, 30);
    drawEnergy('#81C784', 'G', this.energies.green, 60);

    const timeText = `TIME ${Math.floor(this.time)}`;
    this.ctx.textAlign = 'left';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeText(timeText, 20, CANVAS_HEIGHT - 20);
    this.ctx.fillText(timeText, 20, CANVAS_HEIGHT - 20);

    this.ctx.restore();
  }

  private drawGameOver(): void {
    const elapsed = this.time - this.gameOverTime;
    const shockwaveProgress = Math.min(elapsed * 3, 1);
    const scale = 0.5 + shockwaveProgress * 0.5;
    const alpha = Math.min(shockwaveProgress * 2, 1);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(CANVAS_WIDTH / 2, 80);
    this.ctx.scale(scale, scale);

    if (shockwaveProgress < 1) {
      this.ctx.strokeStyle = `rgba(255, 0, 0, ${1 - shockwaveProgress})`;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 100 * shockwaveProgress, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.font = '48px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#FF0000';
    this.ctx.shadowBlur = 30;
    this.ctx.fillStyle = '#FF0000';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 6;
    this.ctx.strokeText('GAME OVER', 0, 15);
    this.ctx.fillText('GAME OVER', 0, 15);

    this.ctx.shadowBlur = 0;
    this.ctx.font = '16px "Press Start 2P", monospace';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;
    this.ctx.strokeText('Press R to Restart', 0, 60);
    this.ctx.fillText('Press R to Restart', 0, 60);

    this.ctx.restore();
  }

  private render(): void {
    this.drawBackground();

    this.ores.forEach(o => { if (o.active) o.draw(this.ctx); });
    this.asteroids.forEach(a => { if (a.active) a.draw(this.ctx); });
    this.bullets.forEach(b => { if (b.active) b.draw(this.ctx); });
    if (!this.gameOver) {
      this.ship.draw(this.ctx);
    }
    this.bugs.forEach(b => { if (b.active) b.draw(this.ctx, this.time); });
    this.particles.forEach(p => { if (p.active) p.draw(this.ctx); });

    this.drawHUD();

    if (this.gameOver) {
      this.drawGameOver();
    }
  }

  private gameLoop = (timestamp: number): void => {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
    }
    const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  start(): void {
    requestAnimationFrame(this.gameLoop);
  }
}
