export const TILE_SIZE = 16;
export const WORLD_CHUNK_SIZE = 16;

export type TileType = 'grass' | 'rock' | 'crystal' | 'empty';

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  generated: boolean;
  generateProgress: number;
  noiseSeed: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export type AnimationState = 'idle' | 'walk_down' | 'walk_up' | 'walk_left' | 'walk_right';

export class Player {
  x: number;
  y: number;
  width: number = 12;
  height: number = 14;
  hp: number = 5;
  maxHp: number = 5;
  speed: number = 1.5;
  animationFrame: number = 0;
  animationTimer: number = 0;
  animationState: AnimationState = 'idle';
  facing: 'left' | 'right' | 'up' | 'down' = 'down';
  glowIntensity: number = 1;
  invincibleTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, moveX: number, moveY: number): void {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    if (moveX !== 0 || moveY !== 0) {
      this.animationTimer += dt;
      if (this.animationTimer > 0.15) {
        this.animationTimer = 0;
        this.animationFrame = (this.animationFrame + 1) % 4;
      }

      if (Math.abs(moveX) > Math.abs(moveY)) {
        this.animationState = moveX > 0 ? 'walk_right' : 'walk_left';
        this.facing = moveX > 0 ? 'right' : 'left';
      } else {
        this.animationState = moveY > 0 ? 'walk_down' : 'walk_up';
        this.facing = moveY > 0 ? 'down' : 'up';
      }
    } else {
      this.animationState = 'idle';
      this.animationFrame = 0;
    }

    this.glowIntensity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
  }

  takeDamage(damage: number): void {
    if (this.invincibleTimer > 0) return;
    this.hp = Math.max(0, this.hp - damage);
    this.invincibleTimer = 1;
  }

  isDead(): boolean {
    return this.hp <= 0;
  }
}

export class CrystalOre {
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  hp: number = 1;
  crystalValue: number;
  harvestAnimation: number = 0;
  isHarvesting: boolean = false;
  pulsePhase: number;
  collected: boolean = false;

  constructor(tileX: number, tileY: number) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
    this.crystalValue = 1 + Math.floor(Math.random() * 3);
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  startHarvest(): void {
    this.isHarvesting = true;
    this.harvestAnimation = 0;
  }

  update(dt: number): boolean {
    this.pulsePhase += dt * 3;
    if (this.isHarvesting) {
      this.harvestAnimation += dt / 0.2;
      if (this.harvestAnimation >= 1) {
        this.collected = true;
        return true;
      }
    }
    return false;
  }
}

export class Tower {
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  hp: number = 3;
  maxHp: number = 3;
  attackRange: number = 80;
  attackSpeed: number = 1;
  attackTimer: number = 0;
  buildProgress: number = 0;
  isBuilding: boolean = true;
  rotation: number = 0;

  constructor(tileX: number, tileY: number) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
  }

  update(dt: number): void {
    if (this.isBuilding) {
      this.buildProgress = Math.min(1, this.buildProgress + dt / 0.3);
      if (this.buildProgress >= 1) {
        this.isBuilding = false;
      }
      return;
    }
    this.attackTimer += dt;
    this.rotation += dt * 0.5;
  }

  canAttack(): boolean {
    return !this.isBuilding && this.attackTimer >= this.attackSpeed;
  }

  resetAttackTimer(): void {
    this.attackTimer = 0;
  }

  takeDamage(damage: number): boolean {
    this.hp -= damage;
    return this.hp <= 0;
  }
}

export class Enemy {
  x: number;
  y: number;
  width: number = 10;
  height: number = 10;
  speed: number = 0.6;
  hp: number = 2;
  maxHp: number = 2;
  damage: number = 1;
  eyePulse: number = 0;
  wobblePhase: number;
  lodLevel: number = 0;

  constructor(x: number, y: number, wave: number) {
    this.x = x;
    this.y = y;
    this.wobblePhase = Math.random() * Math.PI * 2;
    const hpBonus = Math.floor(wave / 3);
    this.hp += hpBonus;
    this.maxHp += hpBonus;
    this.speed += wave * 0.02;
  }

  update(dt: number, playerX: number, playerY: number, towers: Tower[]): void {
    this.eyePulse += dt * 4;
    this.wobblePhase += dt * 6;

    let targetX = playerX;
    let targetY = playerY;
    let minDist = Math.hypot(playerX - this.x, playerY - this.y);

    for (const tower of towers) {
      if (tower.isBuilding) continue;
      const dist = Math.hypot(tower.x - this.x, tower.y - this.y);
      if (dist < minDist * 0.8) {
        minDist = dist;
        targetX = tower.x;
        targetY = tower.y;
      }
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      let moveX = (dx / dist) * this.speed;
      let moveY = (dy / dist) * this.speed;

      for (const tower of towers) {
        if (tower.isBuilding) continue;
        const tdx = this.x - tower.x;
        const tdy = this.y - tower.y;
        const tdist = Math.hypot(tdx, tdy);
        const avoidRadius = 30;
        if (tdist < avoidRadius && tdist > 0) {
          moveX += (tdx / tdist) * 0.3;
          moveY += (tdy / tdist) * 0.3;
        }
      }

      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > 0) {
        this.x += (moveX / moveLen) * this.speed;
        this.y += (moveY / moveLen) * this.speed;
      }
    }
  }

  takeDamage(damage: number): boolean {
    this.hp -= damage;
    return this.hp <= 0;
  }
}

export class Bullet {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number = 4;
  damage: number = 1;
  trail: Vector2[] = [];
  alive: boolean = true;

  constructor(x: number, y: number, targetX: number, targetY: number) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
  }

  update(dt: number): void {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) {
      this.trail.shift();
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.speed) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.alive = false;
      return;
    }

    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;
  }
}

export type ParticleType = 'heart_break' | 'crystal_collect' | 'tower_build' | 'enemy_death' | 'tower_destroy' | 'text_shatter';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  rotation: number = 0;
  rotationSpeed: number = 0;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
    type: ParticleType
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.type = type;
    this.rotationSpeed = (Math.random() - 0.5) * 4;
  }

  update(dt: number): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05;
    this.rotation += this.rotationSpeed;
    this.life -= dt;
    return this.life <= 0;
  }

  getAlpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }
}

export function createParticleBurst(
  x: number,
  y: number,
  count: number,
  color: string,
  type: ParticleType,
  speed: number = 2,
  life: number = 0.5
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const s = speed * (0.5 + Math.random() * 0.5);
    particles.push(new Particle(
      x, y,
      Math.cos(angle) * s,
      Math.sin(angle) * s,
      life * (0.7 + Math.random() * 0.6),
      1 + Math.random() * 2,
      color,
      type
    ));
  }
  return particles;
}
