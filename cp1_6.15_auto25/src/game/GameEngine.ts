export interface Vec2 {
  x: number;
  y: number;
}

export interface Ship {
  x: number;
  y: number;
  size: number;
  speed: number;
  exploding: boolean;
  explodeTimer: number;
  alpha: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  diameter: number;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export interface GameState {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  explosionParticles: ExplosionParticle[];
  score: number;
  kills: number;
  gameOver: boolean;
  gameTime: number;
  stars: StarParticle[];
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const SHIP_SIZE = 16;
const SHIP_SPEED = 280;
const BULLET_SPEED = 500;
const BULLET_RADIUS = 3;
const MAX_BULLETS = 5;
const BULLET_COOLDOWN = 0.3;
const MIN_ASTEROID_DIAMETER = 20;
const EXPLODE_DURATION = 0.5;
const EXPLODE_PARTICLE_LIFE = 0.6;
const EXPLODE_PARTICLE_COUNT = 8;
const WAVE_INTERVAL = 15;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function circleRectCollide(
  cx: number, cy: number, cr: number,
  rectLeft: number, rectTop: number, rectWidth: number, rectHeight: number
): boolean {
  const closestX = clamp(cx, rectLeft, rectLeft + rectWidth);
  const closestY = clamp(cy, rectTop, rectTop + rectHeight);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function createStarParticles(count: number): StarParticle[] {
  const stars: StarParticle[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand(0, CANVAS_W),
      y: rand(0, CANVAS_H),
      size: rand(1, 3),
      twinkleSpeed: rand(0.5, 2),
      twinkleOffset: rand(0, Math.PI * 2),
    });
  }
  return stars;
}

function spawnAsteroidFromEdge(): Asteroid {
  const diameter = rand(40, 80);
  const side = Math.floor(rand(0, 4));
  let x: number, y: number;
  switch (side) {
    case 0: x = rand(0, CANVAS_W); y = -diameter / 2; break;
    case 1: x = CANVAS_W + diameter / 2; y = rand(0, CANVAS_H); break;
    case 2: x = rand(0, CANVAS_W); y = CANVAS_H + diameter / 2; break;
    default: x = -diameter / 2; y = rand(0, CANVAS_H); break;
  }
  const angle = rand(0, Math.PI * 2);
  const speed = diameter >= 50 ? rand(40, 80) : rand(80, 140);
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    diameter,
  };
}

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private keys: Set<string> = new Set();
  private bulletCooldown = 0;
  private waveTimer = 0;
  private elapsed = 0;
  private lastTimestamp = 0;
  private animFrameId = 0;
  private onGameOver: ((score: number, kills: number, duration: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d')!;

    this.state = {
      ship: { x: CANVAS_W / 2, y: CANVAS_H / 2, size: SHIP_SIZE, speed: SHIP_SPEED, exploding: false, explodeTimer: 0, alpha: 1 },
      bullets: [],
      asteroids: [],
      explosionParticles: [],
      score: 0,
      kills: 0,
      gameOver: false,
      gameTime: 0,
      stars: createStarParticles(80),
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  start(onGameOver: (score: number, kills: number, duration: number) => void): void {
    this.onGameOver = onGameOver;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    cancelAnimationFrame(this.animFrameId);
  }

  getState(): GameState {
    return this.state;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = timestamp;

    if (!this.state.gameOver) {
      this.update(dt);
    } else {
      this.updateExplosionParticles(dt);
    }
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.elapsed += dt;
    this.state.gameTime += dt;

    if (this.state.ship.exploding) {
      this.state.ship.explodeTimer += dt;
      this.state.ship.alpha = Math.max(0, 1 - this.state.ship.explodeTimer / EXPLODE_DURATION);
      this.state.ship.size = SHIP_SIZE * this.state.ship.alpha;
      if (this.state.ship.explodeTimer >= EXPLODE_DURATION) {
        this.state.gameOver = true;
        if (this.onGameOver) {
          this.onGameOver(this.state.score, this.state.kills, Math.floor(this.state.gameTime));
        }
      }
      this.updateExplosionParticles(dt);
      return;
    }

    this.updateShipMovement(dt);
    this.updateBullets(dt);
    this.updateAsteroids(dt);
    this.handleShooting(dt);
    this.handleWaveSpawning(dt);
    this.checkBulletAsteroidCollisions();
    this.checkShipAsteroidCollisions();
    this.updateExplosionParticles(dt);
  }

  private updateShipMovement(dt: number): void {
    const ship = this.state.ship;
    let dx = 0, dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }
    ship.x += dx * ship.speed * dt;
    ship.y += dy * ship.speed * dt;
    ship.x = Math.max(ship.size, Math.min(CANVAS_W - ship.size, ship.x));
    ship.y = Math.max(ship.size, Math.min(CANVAS_H - ship.size, ship.y));
  }

  private handleShooting(dt: number): void {
    this.bulletCooldown -= dt;
    if ((this.keys.has(' ') ) && this.bulletCooldown <= 0 && this.state.bullets.length < MAX_BULLETS) {
      this.state.bullets.push({
        x: this.state.ship.x,
        y: this.state.ship.y - SHIP_SIZE,
        vx: 0,
        vy: -BULLET_SPEED,
        radius: BULLET_RADIUS,
      });
      this.bulletCooldown = BULLET_COOLDOWN;
    }
  }

  private updateBullets(dt: number): void {
    this.state.bullets = this.state.bullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      return b.y > -10 && b.y < CANVAS_H + 10 && b.x > -10 && b.x < CANVAS_W + 10;
    });
  }

  private updateAsteroids(dt: number): void {
    for (const a of this.state.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
    }
    this.state.asteroids = this.state.asteroids.filter((a) => {
      const margin = a.diameter;
      return a.x > -margin && a.x < CANVAS_W + margin && a.y > -margin && a.y < CANVAS_H + margin;
    });
  }

  private handleWaveSpawning(dt: number): void {
    this.waveTimer += dt;
    if (this.waveTimer >= WAVE_INTERVAL) {
      this.waveTimer -= WAVE_INTERVAL;
      const minutes = this.elapsed / 60;
      let count: number;
      if (minutes < 1) count = 1;
      else if (minutes < 2) count = 2;
      else count = 3;
      for (let i = 0; i < count; i++) {
        this.state.asteroids.push(spawnAsteroidFromEdge());
      }
    }
  }

  private checkBulletAsteroidCollisions(): void {
    const bulletsToRemove = new Set<number>();
    const asteroidsToRemove = new Set<number>();
    const newAsteroids: Asteroid[] = [];

    for (let bi = 0; bi < this.state.bullets.length; bi++) {
      if (bulletsToRemove.has(bi)) continue;
      const b = this.state.bullets[bi];
      for (let ai = 0; ai < this.state.asteroids.length; ai++) {
        if (asteroidsToRemove.has(ai)) continue;
        const a = this.state.asteroids[ai];
        const d = dist(b.x, b.y, a.x, a.y);
        if (d < b.radius + a.diameter / 2) {
          bulletsToRemove.add(bi);
          asteroidsToRemove.add(ai);
          const newDiameter = a.diameter / 2;
          if (newDiameter >= MIN_ASTEROID_DIAMETER) {
            const angle1 = rand(0, Math.PI * 2);
            const angle2 = angle1 + Math.PI / 2 + rand(-0.3, 0.3);
            const speed1 = newDiameter >= 50 ? rand(40, 80) : rand(80, 140);
            const speed2 = newDiameter >= 50 ? rand(40, 80) : rand(80, 140);
            const hitX = a.x;
            const hitY = a.y;
            newAsteroids.push(
              { x: hitX, y: hitY, vx: Math.cos(angle1) * speed1, vy: Math.sin(angle1) * speed1, diameter: newDiameter },
              { x: hitX, y: hitY, vx: Math.cos(angle2) * speed2, vy: Math.sin(angle2) * speed2, diameter: newDiameter },
            );
          }
          this.state.score += a.diameter >= 50 ? 10 : 20;
          this.state.kills += 1;
          break;
        }
      }
    }

    this.state.bullets = this.state.bullets.filter((_, i) => !bulletsToRemove.has(i));
    this.state.asteroids = this.state.asteroids.filter((_, i) => !asteroidsToRemove.has(i));
    this.state.asteroids.push(...newAsteroids);
  }

  private checkShipAsteroidCollisions(): void {
    const ship = this.state.ship;
    const shipWidth = ship.size * 1.4;
    const shipHeight = ship.size * 1.6;
    const shipLeft = ship.x - shipWidth / 2;
    const shipTop = ship.y - shipHeight / 2;
    for (const a of this.state.asteroids) {
      const asteroidRadius = a.diameter / 2;
      if (circleRectCollide(a.x, a.y, asteroidRadius, shipLeft, shipTop, shipWidth, shipHeight)) {
        ship.exploding = true;
        ship.explodeTimer = 0;
        const explodeX = ship.x;
        const explodeY = ship.y;
        for (let i = 0; i < EXPLODE_PARTICLE_COUNT; i++) {
          const angle = rand(0, Math.PI * 2);
          const speed = rand(50, 100);
          this.state.explosionParticles.push({
            x: explodeX,
            y: explodeY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            life: EXPLODE_PARTICLE_LIFE,
          });
        }
        break;
      }
    }
  }

  private updateExplosionParticles(dt: number): void {
    this.state.explosionParticles = this.state.explosionParticles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / EXPLODE_DURATION);
      return p.life > 0;
    });
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f0c29';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.renderStars(ctx);

    for (const a of this.state.asteroids) {
      this.renderAsteroid(ctx, a);
    }

    for (const b of this.state.bullets) {
      this.renderBullet(ctx, b);
    }

    if (!this.state.gameOver) {
      this.renderShip(ctx);
    }

    for (const p of this.state.explosionParticles) {
      this.renderExplosionParticle(ctx, p);
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    const time = this.elapsed;
    for (const s of this.state.stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * (Math.PI * 2 / s.twinkleSpeed) + s.twinkleOffset));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderShip(ctx: CanvasRenderingContext2D): void {
    const ship = this.state.ship;
    ctx.save();
    ctx.globalAlpha = ship.alpha;
    ctx.translate(ship.x, ship.y);

    if (ship.exploding) {
      ctx.fillStyle = `rgba(255, 0, 0, ${ship.alpha})`;
    } else {
      ctx.fillStyle = '#4fc3f7';
    }

    ctx.beginPath();
    ctx.moveTo(0, -ship.size);
    ctx.lineTo(-ship.size * 0.7, ship.size * 0.6);
    ctx.lineTo(0, ship.size * 0.3);
    ctx.lineTo(ship.size * 0.7, ship.size * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private renderBullet(ctx: CanvasRenderingContext2D, b: Bullet): void {
    ctx.fillStyle = '#f9ca24';
    ctx.shadowColor = '#f9ca24';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private renderAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid): void {
    const r = a.diameter / 2;
    ctx.fillStyle = '#8d8d8d';
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(100,100,100,0.6)';
    ctx.beginPath();
    ctx.arc(a.x - r * 0.25, a.y - r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(a.x + r * 0.3, a.y + r * 0.15, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderExplosionParticle(ctx: CanvasRenderingContext2D, p: ExplosionParticle): void {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#ff9800';
    ctx.shadowColor = '#ff5722';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
