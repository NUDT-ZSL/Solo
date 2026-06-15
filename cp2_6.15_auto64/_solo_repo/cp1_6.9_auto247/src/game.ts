import {
  Ship,
  Bullet,
  EnergyShard,
  Nebula,
  Particle,
  PlayerId,
  SHIP_RADIUS,
  SHIP_SPEED,
  BULLET_SPEED,
  SHARD_SPAWN_INTERVAL,
  EXPLOSION_PARTICLE_COUNT,
  EXPLOSION_RADIUS,
  EXPLOSION_DURATION,
  WIN_DISPLAY_DURATION,
  HUD_FLASH_DURATION,
} from './entities';

export interface InputState {
  p1Up: boolean;
  p1Down: boolean;
  p1Left: boolean;
  p1Right: boolean;
  p1Fire: boolean;
  p2Up: boolean;
  p2Down: boolean;
  p2Left: boolean;
  p2Right: boolean;
  p2Fire: boolean;
  restart: boolean;
}

export interface HudState {
  p1FlashTimer: number;
  p2FlashTimer: number;
  p1ShardCount: number;
  p2ShardCount: number;
}

type GamePhase = 'playing' | 'ended';

const EXPLOSION_COLORS = [
  '#ff3366',
  '#ffaa44',
  '#ffee44',
  '#44ffff',
  '#ff88ff',
  '#88ff88',
];

export class Game {
  ships: Ship[] = [];
  bullets: Bullet[] = [];
  shards: EnergyShard[] = [];
  nebulas: Nebula[] = [];
  particles: Particle[] = [];
  canvasWidth: number;
  canvasHeight: number;
  shardSpawnTimer: number = 0;
  phase: GamePhase = 'playing';
  winner: PlayerId | null = null;
  winDisplayTimer: number = 0;
  hud: HudState = {
    p1FlashTimer: 0,
    p2FlashTimer: 0,
    p1ShardCount: 0,
    p2ShardCount: 0,
  };

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.reset();
  }

  reset() {
    this.ships = [
      new Ship(1, this.canvasWidth * 0.25, this.canvasHeight * 0.5),
      new Ship(2, this.canvasWidth * 0.75, this.canvasHeight * 0.5),
    ];
    this.bullets = [];
    this.shards = [];
    this.particles = [];
    this.shardSpawnTimer = 0;
    this.phase = 'playing';
    this.winner = null;
    this.winDisplayTimer = 0;
    this.hud = {
      p1FlashTimer: 0,
      p2FlashTimer: 0,
      p1ShardCount: 0,
      p2ShardCount: 0,
    };
    this.nebulas = [];
    for (let i = 0; i < 30; i++) {
      const margin = 150;
      const x = margin + Math.random() * (this.canvasWidth - margin * 2);
      const y = margin + Math.random() * (this.canvasHeight - margin * 2);
      this.nebulas.push(new Nebula(x, y));
    }
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  update(dt: number, input: InputState) {
    if (this.phase === 'ended') {
      this.winDisplayTimer -= dt;
      if (input.restart || this.winDisplayTimer <= 0) {
        this.reset();
      }
      this.updateParticles(dt);
      return;
    }

    if (input.restart && false);

    this.updateShips(dt, input);
    this.updateBullets(dt);
    this.updateShards(dt);
    this.updateNebulas(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.spawnShards(dt);

    this.hud.p1FlashTimer = Math.max(0, this.hud.p1FlashTimer - dt);
    this.hud.p2FlashTimer = Math.max(0, this.hud.p2FlashTimer - dt);

    if (!this.ships[0].alive && !this.ships[1].alive) {
      this.endGame(null);
    } else if (!this.ships[0].alive) {
      this.endGame(2);
    } else if (!this.ships[1].alive) {
      this.endGame(1);
    }
  }

  private updateShips(dt: number, input: InputState) {
    const [p1, p2] = this.ships;

    if (p1.alive) {
      let dx = 0, dy = 0;
      if (input.p1Up) dy -= 1;
      if (input.p1Down) dy += 1;
      if (input.p1Left) dx -= 1;
      if (input.p1Right) dx += 1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      p1.vel.x = dx * SHIP_SPEED;
      p1.vel.y = dy * SHIP_SPEED;
      p1.update(dt, this.canvasWidth, this.canvasHeight);

      if (input.p1Fire && p1.canFire()) {
        this.fireBullets(p1);
        p1.fire();
      }
    }

    if (p2.alive) {
      let dx = 0, dy = 0;
      if (input.p2Up) dy -= 1;
      if (input.p2Down) dy += 1;
      if (input.p2Left) dx -= 1;
      if (input.p2Right) dx += 1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      p2.vel.x = dx * SHIP_SPEED;
      p2.vel.y = dy * SHIP_SPEED;
      p2.update(dt, this.canvasWidth, this.canvasHeight);

      if (input.p2Fire && p2.canFire()) {
        this.fireBullets(p2);
        p2.fire();
      }
    }

    this.resolveShipCollision(p1, p2);
  }

  private resolveShipCollision(a: Ship, b: Ship) {
    if (!a.alive || !b.alive) return;
    const dx = b.pos.x - a.pos.x;
    const dy = b.pos.y - a.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = SHIP_RADIUS * 2;
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) / 2;
      a.pos.x -= nx * overlap;
      a.pos.y -= ny * overlap;
      b.pos.x += nx * overlap;
      b.pos.y += ny * overlap;

      const elasticity = 0.8;
      const rvx = b.vel.x - a.vel.x;
      const rvy = b.vel.y - a.vel.y;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal > 0) return;
      const impulse = -(1 + elasticity) * velAlongNormal / 2;
      const ix = impulse * nx;
      const iy = impulse * ny;
      a.vel.x -= ix;
      a.vel.y -= iy;
      b.vel.x += ix;
      b.vel.y += iy;

      const speedA = Math.sqrt(a.vel.x * a.vel.x + a.vel.y * a.vel.y);
      if (speedA > SHIP_SPEED) {
        a.vel.x = (a.vel.x / speedA) * SHIP_SPEED;
        a.vel.y = (a.vel.y / speedA) * SHIP_SPEED;
      }
      const speedB = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
      if (speedB > SHIP_SPEED) {
        b.vel.x = (b.vel.x / speedB) * SHIP_SPEED;
        b.vel.y = (b.vel.y / speedB) * SHIP_SPEED;
      }
    }
  }

  private fireBullets(ship: Ship) {
    const bulletCount = ship.shieldLayers > 0 ? 2 : 1;
    const baseAngle = ship.vel.x === 0 && ship.vel.y === 0
      ? (ship.id === 1 ? 0 : Math.PI)
      : Math.atan2(ship.vel.y, ship.vel.x);
    const spreadAngle = (15 * Math.PI) / 180;

    for (let i = 0; i < bulletCount; i++) {
      let angle = baseAngle;
      if (bulletCount === 2) {
        angle = i === 0 ? baseAngle - spreadAngle / 2 : baseAngle + spreadAngle / 2;
      }
      const vx = Math.cos(angle) * BULLET_SPEED;
      const vy = Math.sin(angle) * BULLET_SPEED;
      const startX = ship.pos.x + Math.cos(angle) * (SHIP_RADIUS + 6);
      const startY = ship.pos.y + Math.sin(angle) * (SHIP_RADIUS + 6);
      this.bullets.push(new Bullet(ship.id, startX, startY, vx, vy));
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.update(dt, this.canvasWidth, this.canvasHeight);
    }
    this.bullets = this.bullets.filter((b) => b.alive);
  }

  private updateShards(dt: number) {
    for (const s of this.shards) {
      s.update(dt);
    }
    this.shards = this.shards.filter((s) => s.alive);
  }

  private updateNebulas(dt: number) {
    for (const n of this.nebulas) {
      n.update(dt, this.canvasWidth, this.canvasHeight);
    }
    for (let i = 0; i < this.nebulas.length; i++) {
      for (let j = i + 1; j < this.nebulas.length; j++) {
        this.nebulas[i].resolveCollision(this.nebulas[j]);
      }
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.update(dt);
    }
    this.particles = this.particles.filter((p) => p.alive);
    if (this.particles.length > 300) {
      this.particles.splice(0, this.particles.length - 300);
    }
  }

  private spawnShards(dt: number) {
    this.shardSpawnTimer += dt;
    if (this.shardSpawnTimer >= SHARD_SPAWN_INTERVAL) {
      this.shardSpawnTimer = 0;
      const margin = 100;
      const x = margin + Math.random() * (this.canvasWidth - margin * 2);
      const y = margin + Math.random() * (this.canvasHeight - margin * 2);
      this.shards.push(new EnergyShard(x, y));
    }
  }

  private checkCollisions() {
    for (const ship of this.ships) {
      if (!ship.alive) continue;
      for (const bullet of this.bullets) {
        if (!bullet.alive) continue;
        if (bullet.owner === ship.id) continue;
        const dx = ship.pos.x - bullet.pos.x;
        const dy = ship.pos.y - bullet.pos.y;
        const distSq = dx * dx + dy * dy;
        const r = SHIP_RADIUS + bullet.radius;
        if (distSq < r * r) {
          bullet.alive = false;
          const died = ship.hit();
          if (ship.id === 1) {
            this.hud.p1FlashTimer = HUD_FLASH_DURATION;
          } else {
            this.hud.p2FlashTimer = HUD_FLASH_DURATION;
          }
          if (died) {
            this.createExplosion(ship.pos.x, ship.pos.y);
          }
        }
      }
    }

    for (const ship of this.ships) {
      if (!ship.alive) continue;
      for (const shard of this.shards) {
        if (!shard.alive) continue;
        const dx = ship.pos.x - shard.pos.x;
        const dy = ship.pos.y - shard.pos.y;
        const distSq = dx * dx + dy * dy;
        const r = SHIP_RADIUS + shard.radius;
        if (distSq < r * r) {
          shard.alive = false;
          ship.addShield();
          if (ship.id === 1) {
            this.hud.p1ShardCount++;
          } else {
            this.hud.p2ShardCount++;
          }
        }
      }
    }
  }

  private createExplosion(x: number, y: number) {
    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
      const angle = (i / EXPLOSION_PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
      const speed = (EXPLOSION_RADIUS / EXPLOSION_DURATION) * (0.5 + Math.random() * 0.8);
      const color = EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)];
      this.particles.push(new Particle(x, y, angle, speed, color, EXPLOSION_DURATION));
    }
  }

  private endGame(winner: PlayerId | null) {
    this.phase = 'ended';
    this.winner = winner;
    this.winDisplayTimer = WIN_DISPLAY_DURATION;
  }

  render(ctx: CanvasRenderingContext2D) {
    this.renderBackground(ctx);

    for (const n of this.nebulas) {
      n.render(ctx);
    }
    for (const s of this.shards) {
      s.render(ctx);
    }
    for (const b of this.bullets) {
      b.render(ctx);
    }
    for (const ship of this.ships) {
      ship.render(ctx);
    }
    for (const p of this.particles) {
      p.render(ctx);
    }

    if (this.phase === 'ended') {
      this.renderWinner(ctx);
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private renderWinner(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const text = this.winner === null
      ? '平局！'
      : this.winner === 1
      ? '玩家1 胜利！'
      : '玩家2 胜利！';
    const color = this.winner === 1 ? '#ff3366' : this.winner === 2 ? '#3399ff' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = color;
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(text, this.canvasWidth / 2, this.canvasHeight / 2 - 20);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 10;
    const remaining = Math.ceil(Math.max(0, this.winDisplayTimer));
    ctx.fillText(
      `${remaining} 秒后自动重开... (或按 R 键立即重开)`,
      this.canvasWidth / 2,
      this.canvasHeight / 2 + 50
    );
    ctx.restore();
  }
}
