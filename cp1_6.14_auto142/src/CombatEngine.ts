import { TileType, DungeonMap } from './MapGenerator';

export type EventBusListener = (data: GameSnapshot) => void;

export interface Position {
  x: number;
  y: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
}

export enum StatusEffectType {
  Burn = 'burn',
  Freeze = 'freeze',
}

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  tickTimer: number;
  damagePerTick: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  statusEffects: StatusEffect[];
  moveTimer: number;
  moveInterval: number;
  damageMultiplier: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface GameSnapshot {
  playerPos: Position;
  playerHp: number;
  playerMaxHp: number;
  playerStatusEffects: StatusEffect[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  currentFloor: number;
  playerDamageFlash: number;
  playerFreezeFlash: number;
  portalPos: Position;
  grid: TileType[][];
  gameover: boolean;
  hitEnemyId: number | null;
}

type EventMap = {
  [key: string]: EventBusListener[];
};

export class EventBus {
  private listeners: EventMap = {};

  on(event: string, callback: EventBusListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: EventBusListener): void {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event: string, data: GameSnapshot): void {
    if (!this.listeners[event]) return;
    for (const cb of this.listeners[event]) {
      cb(data);
    }
  }
}

const PLAYER_MOVE_COOLDOWN = 0.15;
const PROJECTILE_SPEED = 240;
const PROJECTILE_RADIUS = 3;
const PROJECTILE_LIFETIME = 2.0;
const BURN_CHANCE = 0.3;
const BURN_DURATION = 3.0;
const BURN_DAMAGE_PER_TICK = 0.05;
const BURN_TICK_INTERVAL = 1.0;
const FREEZE_SLOW_FACTOR = 0.5;
const ENEMY_BASE_MOVE_INTERVAL = 1.5;
const ENEMY_DAMAGE = 0.1;
const PLAYER_MAX_HP = 100;
const TRAP_DAMAGE = 10;
const PROJECTILE_DAMAGE = 0.15;
const TILE_SIZE = 30;

export class CombatEngine {
  private eventBus: EventBus;
  private dungeon: DungeonMap | null = null;
  private playerPos: Position = { x: 0, y: 0 };
  private playerHp: number = PLAYER_MAX_HP;
  private playerMaxHp: number = PLAYER_MAX_HP;
  private playerStatusEffects: StatusEffect[] = [];
  private playerMoveCooldown: number = 0;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private currentFloor: number = 1;
  private playerDamageFlash: number = 0;
  private playerFreezeFlash: number = 0;
  private hitEnemyId: number | null = null;
  private projectileIdCounter: number = 0;
  private enemyIdCounter: number = 0;
  private gameover: boolean = false;
  private difficultyMultiplier: number = 1.0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  loadDungeon(dungeon: DungeonMap): void {
    this.dungeon = dungeon;
    this.playerPos = { ...dungeon.playerSpawn };
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.hitEnemyId = null;
    this.spawnEnemies();
  }

  private spawnEnemies(): void {
    if (!this.dungeon) return;

    const rooms = this.dungeon.rooms;
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const enemyCount = Math.max(1, Math.floor(room.width * room.height / 12));
      for (let j = 0; j < enemyCount; j++) {
        const ex = randInt(room.x + 1, room.x + room.width - 2);
        const ey = randInt(room.y + 1, room.y + room.height - 2);

        if (this.dungeon.grid[ey][ex] === TileType.Portal) continue;

        const hp = 100 * this.difficultyMultiplier;
        this.enemies.push({
          id: this.enemyIdCounter++,
          x: ex,
          y: ey,
          hp,
          maxHp: hp,
          statusEffects: [],
          moveTimer: ENEMY_BASE_MOVE_INTERVAL * Math.random(),
          moveInterval: ENEMY_BASE_MOVE_INTERVAL,
          damageMultiplier: this.difficultyMultiplier,
        });
      }
    }
  }

  handleMove(dx: number, dy: number): void {
    if (this.gameover || this.playerMoveCooldown > 0) return;
    if (!this.dungeon) return;

    const nx = this.playerPos.x + dx;
    const ny = this.playerPos.y + dy;

    if (nx < 0 || nx >= this.dungeon.width || ny < 0 || ny >= this.dungeon.height) return;

    const tile = this.dungeon.grid[ny][nx];
    if (tile === TileType.Wall) return;

    const enemyAtTarget = this.enemies.find((e) => e.x === nx && e.y === ny);
    if (enemyAtTarget) return;

    this.playerPos.x = nx;
    this.playerPos.y = ny;
    this.playerMoveCooldown = PLAYER_MOVE_COOLDOWN;

    if (tile === TileType.Trap) {
      this.playerTakeDamage(TRAP_DAMAGE);
    }

    if (tile === TileType.Portal) {
      this.descendFloor();
      return;
    }

    this.checkAdjacentEnemies();
  }

  private checkAdjacentEnemies(): void {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    for (const d of dirs) {
      const ax = this.playerPos.x + d.dx;
      const ay = this.playerPos.y + d.dy;
      const enemy = this.enemies.find((e) => e.x === ax && e.y === ay);
      if (enemy) {
        this.damagePlayerByEnemy(enemy);
      }
    }
  }

  private damagePlayerByEnemy(enemy: Enemy): void {
    this.playerTakeDamage(PLAYER_MAX_HP * ENEMY_DAMAGE * enemy.damageMultiplier);

    const dx = this.playerPos.x - enemy.x;
    const dy = this.playerPos.y - enemy.y;
    if (dx !== 0 || dy !== 0) {
      const pushX = this.playerPos.x + (dx !== 0 ? Math.sign(dx) : 0);
      const pushY = this.playerPos.y + (dy !== 0 ? Math.sign(dy) : 0);

      if (
        this.dungeon &&
        pushX >= 0 && pushX < this.dungeon.width &&
        pushY >= 0 && pushY < this.dungeon.height &&
        this.dungeon.grid[pushY][pushX] !== TileType.Wall &&
        !this.enemies.some((e) => e.x === pushX && e.y === pushY)
      ) {
        this.playerPos.x = pushX;
        this.playerPos.y = pushY;
      }
    }
  }

  private playerTakeDamage(amount: number): void {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.playerDamageFlash = 0.3;
    if (this.playerHp <= 0) {
      this.gameover = true;
    }
  }

  private descendFloor(): void {
    this.currentFloor++;
    this.difficultyMultiplier = 1 + (this.currentFloor - 1) * 0.2;
    this.playerHp = this.playerMaxHp;
    this.playerStatusEffects = [];
    this.playerDamageFlash = 0;
    this.playerFreezeFlash = 0;

    this.eventBus.emit('generateNewFloor', this.getSnapshot());
  }

  fireProjectile(mouseCanvasX: number, mouseCanvasY: number, canvasOffsetX: number, canvasOffsetY: number): void {
    if (this.gameover || !this.dungeon) return;

    const playerPixelX = this.playerPos.x * TILE_SIZE + TILE_SIZE / 2 + canvasOffsetX;
    const playerPixelY = this.playerPos.y * TILE_SIZE + TILE_SIZE / 2 + canvasOffsetY;

    const dx = mouseCanvasX - playerPixelX;
    const dy = mouseCanvasY - playerPixelY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    const vx = (dx / dist) * PROJECTILE_SPEED;
    const vy = (dy / dist) * PROJECTILE_SPEED;

    const startX = this.playerPos.x * TILE_SIZE + TILE_SIZE / 2;
    const startY = this.playerPos.y * TILE_SIZE + TILE_SIZE / 2;

    this.projectiles.push({
      id: this.projectileIdCounter++,
      x: startX,
      y: startY,
      vx,
      vy,
      radius: PROJECTILE_RADIUS,
      life: PROJECTILE_LIFETIME,
      maxLife: PROJECTILE_LIFETIME,
    });
  }

  update(dt: number): void {
    if (this.gameover || !this.dungeon) return;

    if (this.playerMoveCooldown > 0) {
      this.playerMoveCooldown = Math.max(0, this.playerMoveCooldown - dt);
    }

    if (this.playerDamageFlash > 0) {
      this.playerDamageFlash = Math.max(0, this.playerDamageFlash - dt);
    }
    if (this.playerFreezeFlash > 0) {
      this.playerFreezeFlash = Math.max(0, this.playerFreezeFlash - dt);
    }

    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updatePlayerStatusEffects(dt);

    this.emitSnapshot();
  }

  private updateProjectiles(dt: number): void {
    if (!this.dungeon) return;

    const toRemove: number[] = [];

    for (const proj of this.projectiles) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      if (proj.life <= 0) {
        toRemove.push(proj.id);
        continue;
      }

      const gridX = Math.floor(proj.x / TILE_SIZE);
      const gridY = Math.floor(proj.y / TILE_SIZE);

      if (
        gridX < 0 || gridX >= this.dungeon.width ||
        gridY < 0 || gridY >= this.dungeon.height ||
        this.dungeon.grid[gridY][gridX] === TileType.Wall
      ) {
        toRemove.push(proj.id);
        this.spawnImpactParticles(proj.x, proj.y, '#ffffff', 4);
        continue;
      }

      let hitEnemy: Enemy | null = null;
      for (const enemy of this.enemies) {
        const enemyCenterX = enemy.x * TILE_SIZE + TILE_SIZE / 2;
        const enemyCenterY = enemy.y * TILE_SIZE + TILE_SIZE / 2;
        const dx = proj.x - enemyCenterX;
        const dy = proj.y - enemyCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < TILE_SIZE / 2 + proj.radius) {
          hitEnemy = enemy;
          break;
        }
      }

      if (hitEnemy) {
        let damage = hitEnemy.maxHp * PROJECTILE_DAMAGE;

        const isFrozen = hitEnemy.statusEffects.some((e) => e.type === StatusEffectType.Freeze);
        if (isFrozen) {
          damage *= 2;
        }

        hitEnemy.hp -= damage;
        this.hitEnemyId = hitEnemy.id;
        setTimeout(() => {
          if (this.hitEnemyId === hitEnemy.id) {
            this.hitEnemyId = null;
          }
        }, 100);

        if (Math.random() < BURN_CHANCE && !hitEnemy.statusEffects.some((e) => e.type === StatusEffectType.Burn)) {
          hitEnemy.statusEffects.push({
            type: StatusEffectType.Burn,
            duration: BURN_DURATION,
            tickTimer: BURN_TICK_INTERVAL,
            damagePerTick: BURN_DAMAGE_PER_TICK,
          });
        }

        this.spawnImpactParticles(proj.x, proj.y, '#ff6b35', 6);
        toRemove.push(proj.id);
      }
    }

    this.projectiles = this.projectiles.filter((p) => !toRemove.includes(p.id));

    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) {
        this.spawnImpactParticles(
          e.x * TILE_SIZE + TILE_SIZE / 2,
          e.y * TILE_SIZE + TILE_SIZE / 2,
          '#dc2626',
          12,
        );
        return false;
      }
      return true;
    });
  }

  private updateEnemies(dt: number): void {
    if (!this.dungeon) return;

    for (const enemy of this.enemies) {
      const isFrozen = enemy.statusEffects.some((e) => e.type === StatusEffectType.Freeze);
      const effectiveInterval = isFrozen
        ? enemy.moveInterval / FREEZE_SLOW_FACTOR
        : enemy.moveInterval;

      enemy.moveTimer -= dt;

      this.updateEnemyStatusEffects(enemy, dt);

      if (enemy.moveTimer <= 0) {
        enemy.moveTimer = effectiveInterval;
        this.moveEnemy(enemy);
      }
    }
  }

  private moveEnemy(enemy: Enemy): void {
    if (!this.dungeon) return;

    const dx = this.playerPos.x - enemy.x;
    const dy = this.playerPos.y - enemy.y;

    let moveX = 0;
    let moveY = 0;

    if (Math.abs(dx) > Math.abs(dy)) {
      moveX = Math.sign(dx);
    } else if (Math.abs(dy) > Math.abs(dx)) {
      moveY = Math.sign(dy);
    } else {
      if (Math.random() < 0.5) {
        moveX = Math.sign(dx);
      } else {
        moveY = Math.sign(dy);
      }
    }

    if (moveX === 0 && moveY === 0) return;

    if (Math.random() < 0.3) {
      if (Math.random() < 0.5) {
        moveX = [-1, 0, 1][randInt(0, 2)];
        moveY = 0;
      } else {
        moveX = 0;
        moveY = [-1, 0, 1][randInt(0, 2)];
      }
    }

    const nx = enemy.x + moveX;
    const ny = enemy.y + moveY;

    if (nx < 0 || nx >= this.dungeon.width || ny < 0 || ny >= this.dungeon.height) return;
    if (this.dungeon.grid[ny][nx] === TileType.Wall) return;

    if (nx === this.playerPos.x && ny === this.playerPos.y) {
      this.damagePlayerByEnemy(enemy);
      return;
    }

    const otherEnemy = this.enemies.find((e) => e.id !== enemy.id && e.x === nx && e.y === ny);
    if (otherEnemy) return;

    enemy.x = nx;
    enemy.y = ny;
  }

  private updateEnemyStatusEffects(enemy: Enemy, dt: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < enemy.statusEffects.length; i++) {
      const effect = enemy.statusEffects[i];
      effect.duration -= dt;

      if (effect.duration <= 0) {
        toRemove.push(i);
        continue;
      }

      if (effect.type === StatusEffectType.Burn) {
        effect.tickTimer -= dt;
        if (effect.tickTimer <= 0) {
          effect.tickTimer = BURN_TICK_INTERVAL;
          enemy.hp -= enemy.maxHp * effect.damagePerTick;
          this.spawnBurnParticles(enemy);
        }
      }

      if (effect.type === StatusEffectType.Freeze) {
        if (Math.random() < 0.05) {
          this.spawnFreezeParticle(enemy);
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      enemy.statusEffects.splice(toRemove[i], 1);
    }
  }

  private updatePlayerStatusEffects(dt: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.playerStatusEffects.length; i++) {
      const effect = this.playerStatusEffects[i];
      effect.duration -= dt;

      if (effect.duration <= 0) {
        toRemove.push(i);
        continue;
      }

      if (effect.type === StatusEffectType.Burn) {
        effect.tickTimer -= dt;
        if (effect.tickTimer <= 0) {
          effect.tickTimer = 1.0;
          this.playerTakeDamage(5);
        }
      }

      if (effect.type === StatusEffectType.Freeze) {
        this.playerFreezeFlash = 0.15;
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.playerStatusEffects.splice(toRemove[i], 1);
    }
  }

  private spawnBurnParticles(enemy: Enemy): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.5;
      const speed = 5 + Math.random() * 10;
      this.particles.push({
        x: enemy.x * TILE_SIZE + TILE_SIZE / 2 + Math.cos(angle) * 6,
        y: enemy.y * TILE_SIZE + TILE_SIZE / 2 + Math.sin(angle) * 6,
        vx: Math.cos(angle) * speed * 0.3,
        vy: -10 - Math.random() * 5,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 2 + Math.random() * 2,
        color: '#ff6b35',
        alpha: 0.8,
      });
    }
  }

  private spawnFreezeParticle(enemy: Enemy): void {
    const angle = Math.random() * Math.PI * 2;
    this.particles.push({
      x: enemy.x * TILE_SIZE + TILE_SIZE / 2 + Math.cos(angle) * 8,
      y: enemy.y * TILE_SIZE + TILE_SIZE / 2 + Math.sin(angle) * 8,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2 - 3,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      size: 2 + Math.random() * 2,
      color: '#add8e6',
      alpha: 0.5,
    });
  }

  private spawnImpactParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 1 + Math.random() * 2,
        color,
        alpha: 1.0,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife) * p.alpha;
    }

    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private emitSnapshot(): void {
    this.eventBus.emit('stateUpdate', this.getSnapshot());
  }

  getSnapshot(): GameSnapshot {
    return {
      playerPos: { ...this.playerPos },
      playerHp: this.playerHp,
      playerMaxHp: this.playerMaxHp,
      playerStatusEffects: [...this.playerStatusEffects],
      enemies: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        statusEffects: [...e.statusEffects],
        moveTimer: e.moveTimer,
        moveInterval: e.moveInterval,
        damageMultiplier: e.damageMultiplier,
      })),
      projectiles: this.projectiles.map((p) => ({ ...p })),
      particles: this.particles.map((p) => ({ ...p })),
      currentFloor: this.currentFloor,
      playerDamageFlash: this.playerDamageFlash,
      playerFreezeFlash: this.playerFreezeFlash,
      portalPos: this.dungeon ? { ...this.dungeon.portalPos } : { x: 0, y: 0 },
      grid: this.dungeon ? this.dungeon.grid.map((row) => [...row]) : [],
      gameover: this.gameover,
      hitEnemyId: this.hitEnemyId,
    };
  }

  resetGame(): void {
    this.currentFloor = 1;
    this.difficultyMultiplier = 1.0;
    this.playerHp = PLAYER_MAX_HP;
    this.playerMaxHp = PLAYER_MAX_HP;
    this.playerStatusEffects = [];
    this.projectiles = [];
    this.particles = [];
    this.playerDamageFlash = 0;
    this.playerFreezeFlash = 0;
    this.hitEnemyId = null;
    this.gameover = false;
    this.playerMoveCooldown = 0;
    this.eventBus.emit('generateNewFloor', this.getSnapshot());
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
