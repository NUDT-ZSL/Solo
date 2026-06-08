import { Terrain, TerrainManager } from './terrain';

export interface Character {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angularVelocity: number;
  angle: number;
  launched: boolean;
  startX: number;
  startY: number;
}

export interface CollisionResult {
  collided: boolean;
  terrain?: Terrain;
}

const GRAVITY = 0.4;
const FRICTION = 0.995;
const BOUNCE_MULTIPLIER = 1.5;
const BOUNCER_HEIGHT = 100;

export class PhysicsEngine {
  character: Character;
  terrainManager: TerrainManager;
  canvasWidth: number;
  canvasHeight: number;
  elapsedTime: number = 0;
  lastPortalId: number | null = null;
  portalCooldown: number = 0;

  constructor(terrainManager: TerrainManager, canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.terrainManager = terrainManager;
    this.character = this.createDefaultCharacter();
  }

  createDefaultCharacter(): Character {
    return {
      x: 60,
      y: this.canvasHeight - 60,
      startX: 60,
      startY: this.canvasHeight - 60,
      vx: 0,
      vy: 0,
      radius: 12,
      angularVelocity: 0,
      angle: 0,
      launched: false
    };
  }

  setCanvasSize(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
    if (!this.character.launched) {
      this.character.x = 60;
      this.character.y = h - 60;
      this.character.startX = 60;
      this.character.startY = h - 60;
    }
  }

  launch(directionX: number, directionY: number, power: number) {
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    if (length === 0) return;
    const nx = directionX / length;
    const ny = directionY / length;
    this.character.vx = nx * power * 0.1;
    this.character.vy = ny * power * 0.1;
    this.character.launched = true;
    this.elapsedTime = 0;
    this.lastPortalId = null;
    this.portalCooldown = 0;
  }

  reset() {
    this.character = this.createDefaultCharacter();
    this.elapsedTime = 0;
    this.lastPortalId = null;
    this.portalCooldown = 0;
  }

  getSpeed(): number {
    return Math.sqrt(this.character.vx * this.character.vx + this.character.vy * this.character.vy);
  }

  update(dt: number) {
    if (!this.character.launched) return;

    this.elapsedTime += dt * 1000;

    if (this.portalCooldown > 0) {
      this.portalCooldown -= dt;
    }

    this.character.vy += GRAVITY;
    this.character.vx *= FRICTION;
    this.character.vy *= FRICTION;

    this.character.x += this.character.vx;
    this.character.y += this.character.vy;

    this.character.angularVelocity = this.character.vx * 0.05;
    this.character.angle += this.character.angularVelocity;

    this.handleBoundaryCollision();
    this.handleTerrainCollisions();
    this.terrainManager.updateParticles(dt);
  }

  handleBoundaryCollision() {
    const c = this.character;

    if (c.x - c.radius < 0) {
      c.x = c.radius;
      c.vx = -c.vx * 0.8;
    }
    if (c.x + c.radius > this.canvasWidth) {
      c.x = this.canvasWidth - c.radius;
      c.vx = -c.vx * 0.8;
    }
    if (c.y - c.radius < 0) {
      c.y = c.radius;
      c.vy = -c.vy * 0.8;
    }
    if (c.y + c.radius > this.canvasHeight) {
      c.y = this.canvasHeight - c.radius;
      c.vy = -c.vy * 0.6;
      c.vx *= 0.9;
    }
  }

  handleTerrainCollisions() {
    for (const terrain of this.terrainManager.terrains) {
      const result = this.checkCollision(terrain);
      if (result.collided && result.terrain) {
        this.applyTerrainEffect(result.terrain);
      }
    }
  }

  checkCollision(terrain: Terrain): CollisionResult {
    const c = this.character;
    const closestX = Math.max(terrain.x, Math.min(c.x, terrain.x + terrain.width));
    const closestY = Math.max(terrain.y, Math.min(c.y, terrain.y + terrain.height));
    const dx = c.x - closestX;
    const dy = c.y - closestY;
    return {
      collided: (dx * dx + dy * dy) < (c.radius * c.radius),
      terrain
    };
  }

  applyTerrainEffect(terrain: Terrain) {
    const c = this.character;

    if (terrain.type === 'spring') {
      this.resolveCircleRectCollision(terrain);
      const cx = terrain.x + terrain.width / 2;
      const cy = terrain.y + terrain.height / 2;
      let nx = c.x - cx;
      let ny = c.y - cy;
      const len = Math.sqrt(nx * nx + ny * ny);
      if (len > 0) {
        nx /= len;
        ny /= len;
      } else {
        nx = 0;
        ny = -1;
      }
      const dot = c.vx * nx + c.vy * ny;
      const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      c.vx = (c.vx - 2 * dot * nx) * BOUNCE_MULTIPLIER;
      c.vy = (c.vy - 2 * dot * ny) * BOUNCE_MULTIPLIER;
      const newSpeed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      if (newSpeed < speed * 1.2) {
        c.vx *= 1.3;
        c.vy *= 1.3;
      }
      this.terrainManager.triggerSpringFlash(terrain);
    } else if (terrain.type === 'bouncer') {
      c.y = terrain.y - c.radius;
      const bounceVy = -Math.sqrt(2 * GRAVITY * BOUNCER_HEIGHT);
      c.vy = bounceVy;
      this.terrainManager.spawnBouncerParticles(terrain);
    } else if (terrain.type === 'portal') {
      if (this.portalCooldown > 0) return;
      if (!terrain.portalPairId) return;
      if (this.lastPortalId === terrain.id) return;
      const pair = this.terrainManager.terrains.find(
        t => t.type === 'portal' && t.portalPairId === terrain.portalPairId && t.id !== terrain.id
      );
      if (pair) {
        c.x = pair.x + pair.width / 2;
        c.y = pair.y + pair.height / 2;
        this.lastPortalId = pair.id;
        this.portalCooldown = 0.3;
      }
    }
  }

  resolveCircleRectCollision(terrain: Terrain) {
    const c = this.character;
    const closestX = Math.max(terrain.x, Math.min(c.x, terrain.x + terrain.width));
    const closestY = Math.max(terrain.y, Math.min(c.y, terrain.y + terrain.height));
    let dx = c.x - closestX;
    let dy = c.y - closestY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      dist = 1;
      dx = 0;
      dy = -1;
    }
    const overlap = c.radius - dist;
    if (overlap > 0) {
      c.x += (dx / dist) * overlap;
      c.y += (dy / dist) * overlap;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const c = this.character;
    ctx.save();
    ctx.shadowColor = '#CBD5E0';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#A0AEC0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-c.radius * 0.6, 0);
    ctx.lineTo(c.radius * 0.6, 0);
    ctx.stroke();
    ctx.restore();
  }
}
