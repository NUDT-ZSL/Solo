import { TileType, DungeonMap, generateDungeon } from './MapGenerator';

export type GameEventListener = (data?: unknown) => void;

export interface Position {
  x: number;
  y: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
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
  burnParticleTimer: number;
  hitFlash: number;
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
  ownerEnemyId?: number;
  kind?: 'burn' | 'freeze' | 'impact';
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
}

export class EventBus {
  private listeners: Map<string, Set<GameEventListener>> = new Map();

  on(event: string, callback: GameEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: GameEventListener): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  emit(event: string, data?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch (e) {
        console.error(`[EventBus] listener error on "${event}":`, e);
      }
    }
  }
}

export const EVENTS = {
  STATE_UPDATE: 'state:update',
  REQUEST_NEW_MAP: 'map:request',
  MAP_READY: 'map:ready',
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_FROZEN: 'player:frozen',
  ENEMY_DAMAGED: 'enemy:damaged',
  ENEMY_KILLED: 'enemy:killed',
  PROJECTILE_FIRED: 'projectile:fired',
  FLOOR_DESCEND: 'floor:descend',
  GAME_OVER: 'game:over',
  RESET_GAME: 'game:reset',
  INPUT_MOVE: 'input:move',
  INPUT_FIRE: 'input:fire',
} as const;

const PLAYER_MOVE_COOLDOWN = 0.15;
const PROJECTILE_SPEED = 240;
const PROJECTILE_RADIUS = 3;
const PROJECTILE_DIAMETER = PROJECTILE_RADIUS * 2;
const PROJECTILE_LIFETIME = 2.0;
const BURN_CHANCE = 0.3;
const BURN_DURATION = 3.0;
const BURN_DAMAGE_PER_TICK = 0.05;
const BURN_TICK_INTERVAL = 1.0;
const BURN_PARTICLE_INTERVAL = 0.12;
const BURN_PARTICLE_RISE_SPEED = 10;
const FREEZE_SLOW_FACTOR = 0.5;
const ENEMY_BASE_MOVE_INTERVAL = 1.5;
const ENEMY_DAMAGE_RATIO = 0.1;
const PLAYER_MAX_HP = 100;
const TRAP_DAMAGE = 10;
const PROJECTILE_DAMAGE_RATIO = 0.15;
const TILE_SIZE = 30;
const ENEMY_HIT_RADIUS_PX = 10;

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
  private projectileIdCounter: number = 0;
  private enemyIdCounter: number = 0;
  private gameover: boolean = false;
  private difficultyMultiplier: number = 1.0;
  private mapHandlerOff: (() => void) | null = null;
  private fireHandlerOff: (() => void) | null = null;
  private moveHandlerOff: (() => void) | null = null;
  private resetHandlerOff: (() => void) | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.bindEvents();
    this.requestNewMap();
  }

  private bindEvents(): void {
    this.mapHandlerOff = this.eventBus.on(EVENTS.MAP_READY, (data) => {
      const map = data as DungeonMap;
      this.loadDungeon(map);
    });

    this.fireHandlerOff = this.eventBus.on(EVENTS.INPUT_FIRE, (data) => {
      const { mouseX, mouseY } = data as { mouseX: number; mouseY: number };
      this.fireProjectile(mouseX, mouseY);
    });

    this.moveHandlerOff = this.eventBus.on(EVENTS.INPUT_MOVE, (data) => {
      const { dx, dy } = data as { dx: number; dy: number };
      this.handleMove(dx, dy);
    });

    this.resetHandlerOff = this.eventBus.on(EVENTS.RESET_GAME, () => {
      this.resetGame();
    });
  }

  public destroy(): void {
    this.mapHandlerOff?.();
    this.fireHandlerOff?.();
    this.moveHandlerOff?.();
    this.resetHandlerOff?.();
  }

  private requestNewMap(): void {
    this.eventBus.emit(EVENTS.REQUEST_NEW_MAP);
  }

  loadDungeon(dungeon: DungeonMap): void {
    this.dungeon = dungeon;
    this.playerPos = { ...dungeon.playerSpawn };
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.spawnEnemies();
    this.emitSnapshot();
  }

  private spawnEnemies(): void {
    if (!this.dungeon) return;

    const rooms = this.dungeon.rooms;
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const tiles = Math.max(1, room.width * room.height);
      const enemyCount = Math.max(1, Math.min(4, Math.floor(tiles / 10) + 1));
      const placedPositions: Set<string> = new Set();

      for (let j = 0; j < enemyCount; j++) {
        let ex: number, ey: number;
        let attempts = 0;
        do {
          ex = randInt(room.x + 1, room.x + room.width - 2);
          ey = randInt(room.y + 1, room.y + room.height - 2);
          attempts++;
        } while (
          attempts < 20 &&
          (placedPositions.has(`${ex},${ey}`) ||
            (this.dungeon!.grid[ey]?.[ex] ?? TileType.Wall) === TileType.Portal ||
            (this.dungeon!.grid[ey]?.[ex] ?? TileType.Wall) === TileType.Trap)
        );

        placedPositions.add(`${ex},${ey}`);

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
          burnParticleTimer: 0,
          hitFlash: 0,
        });
      }
    }
  }

  handleMove(dx: number, dy: number): void {
    if (this.gameover || this.playerMoveCooldown > 0 || !this.dungeon) return;

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
    const damage = this.playerMaxHp * ENEMY_DAMAGE_RATIO * enemy.damageMultiplier;
    this.playerTakeDamage(damage);

    const dx = this.playerPos.x - enemy.x;
    const dy = this.playerPos.y - enemy.y;
    const pushDirX = dx !== 0 ? Math.sign(dx) : 0;
    const pushDirY = dy !== 0 ? Math.sign(dy) : 0;
    if (pushDirX !== 0 || pushDirY !== 0) {
      const pushX = this.playerPos.x + pushDirX;
      const pushY = this.playerPos.y + pushDirY;
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
    this.playerDamageFlash = 0.4;
    this.eventBus.emit(EVENTS.PLAYER_DAMAGED, { amount, remaining: this.playerHp });

    if (this.playerHp <= 0) {
      this.gameover = true;
      this.eventBus.emit(EVENTS.GAME_OVER, { floor: this.currentFloor });
    }
  }

  private descendFloor(): void {
    this.currentFloor++;
    this.difficultyMultiplier = 1 + (this.currentFloor - 1) * 0.2;
    this.playerHp = this.playerMaxHp;
    this.playerStatusEffects = [];
    this.playerDamageFlash = 0;
    this.playerFreezeFlash = 0;

    this.eventBus.emit(EVENTS.FLOOR_DESCEND, {
      floor: this.currentFloor,
      difficulty: this.difficultyMultiplier,
    });

    this.requestNewMap();
  }

  fireProjectile(mouseCanvasX: number, mouseCanvasY: number): void {
    if (this.gameover || !this.dungeon) return;

    const offset = getGridOffsetPx();
    const playerPixelX = this.playerPos.x * TILE_SIZE + TILE_SIZE / 2 + offset.x;
    const playerPixelY = this.playerPos.y * TILE_SIZE + TILE_SIZE / 2 + offset.y;

    const dx = mouseCanvasX - playerPixelX;
    const dy = mouseCanvasY - playerPixelY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    const vx = (dx / dist) * PROJECTILE_SPEED;
    const vy = (dy / dist) * PROJECTILE_SPEED;

    const startX = this.playerPos.x * TILE_SIZE + TILE_SIZE / 2;
    const startY = this.playerPos.y * TILE_SIZE + TILE_SIZE / 2;

    const proj: Projectile = {
      id: this.projectileIdCounter++,
      x: startX,
      y: startY,
      gridX: this.playerPos.x,
      gridY: this.playerPos.y,
      vx,
      vy,
      radius: PROJECTILE_RADIUS,
      life: PROJECTILE_LIFETIME,
      maxLife: PROJECTILE_LIFETIME,
    };

    this.projectiles.push(proj);
    this.eventBus.emit(EVENTS.PROJECTILE_FIRED, {
      id: proj.id,
      dirX: vx,
      dirY: vy,
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

    const removed = new Set<number>();

    for (const proj of this.projectiles) {
      let remainingDt = dt;
      let hitOrBlocked = false;

      while (remainingDt > 1e-6 && !hitOrBlocked) {
        const stepDt = Math.min(remainingDt, Math.max(0.5 / PROJECTILE_SPEED, dt / 6));
        remainingDt -= stepDt;

        const newX = proj.x + proj.vx * stepDt;
        const newY = proj.y + proj.vy * stepDt;
        const newGridX = Math.floor(newX / TILE_SIZE);
        const newGridY = Math.floor(newY / TILE_SIZE);

        if (
          newGridX < 0 || newGridX >= this.dungeon.width ||
          newGridY < 0 || newGridY >= this.dungeon.height
        ) {
          this.spawnImpactParticles(proj.x, proj.y, '#ffffff', 4);
          removed.add(proj.id);
          hitOrBlocked = true;
          break;
        }

        const tile = this.dungeon.grid[newGridY][newGridX];
        if (tile === TileType.Wall) {
          this.spawnImpactParticles(proj.x, proj.y, '#ffffff', 4);
          removed.add(proj.id);
          hitOrBlocked = true;
          break;
        }

        proj.x = newX;
        proj.y = newY;
        proj.gridX = newGridX;
        proj.gridY = newGridY;

        for (const enemy of this.enemies) {
          const enemyCenterX = enemy.x * TILE_SIZE + TILE_SIZE / 2;
          const enemyCenterY = enemy.y * TILE_SIZE + TILE_SIZE / 2;
          const ddx = proj.x - enemyCenterX;
          const ddy = proj.y - enemyCenterY;
          const distSq = ddx * ddx + ddy * ddy;
          const hitRadius = ENEMY_HIT_RADIUS_PX + PROJECTILE_RADIUS;

          if (distSq <= hitRadius * hitRadius) {
            this.applyProjectileDamageToEnemy(enemy, proj);
            removed.add(proj.id);
            hitOrBlocked = true;
            break;
          }
        }
      }

      if (hitOrBlocked) continue;

      proj.life -= dt;
      if (proj.life <= 0) {
        this.spawnImpactParticles(proj.x, proj.y, '#ffffff', 3);
        removed.add(proj.id);
      }
    }

    if (removed.size > 0) {
      this.projectiles = this.projectiles.filter((p) => !removed.has(p.id));
    }

    const killedThisFrame: Enemy[] = [];
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) {
        killedThisFrame.push(e);
        return false;
      }
      return true;
    });

    for (const e of killedThisFrame) {
      this.spawnImpactParticles(
        e.x * TILE_SIZE + TILE_SIZE / 2,
        e.y * TILE_SIZE + TILE_SIZE / 2,
        '#dc2626',
        14,
      );
      this.eventBus.emit(EVENTS.ENEMY_KILLED, {
        id: e.id,
        x: e.x,
        y: e.y,
        floor: this.currentFloor,
      });
    }
  }

  private applyProjectileDamageToEnemy(enemy: Enemy, _proj: Projectile): void {
    const isFrozen = enemy.statusEffects.some((s) => s.type === StatusEffectType.Freeze);
    const baseDamage = enemy.maxHp * PROJECTILE_DAMAGE_RATIO;
    const damage = isFrozen ? baseDamage * 2 : baseDamage;

    enemy.hp -= damage;
    enemy.hitFlash = 0.15;

    this.spawnImpactParticles(
      enemy.x * TILE_SIZE + TILE_SIZE / 2,
      enemy.y * TILE_SIZE + TILE_SIZE / 2,
      '#ff8a3d',
      6,
    );

    this.eventBus.emit(EVENTS.ENEMY_DAMAGED, {
      id: enemy.id,
      damage,
      remaining: Math.max(0, enemy.hp),
      frozenBonus: isFrozen,
    });

    const roll = Math.random();
    const hasBurn = enemy.statusEffects.some((s) => s.type === StatusEffectType.Burn);
    if (roll < BURN_CHANCE && !hasBurn) {
      enemy.statusEffects.push({
        type: StatusEffectType.Burn,
        duration: BURN_DURATION,
        tickTimer: BURN_TICK_INTERVAL,
        damagePerTick: BURN_DAMAGE_PER_TICK,
      });
      this.spawnImpactParticles(
        enemy.x * TILE_SIZE + TILE_SIZE / 2,
        enemy.y * TILE_SIZE + TILE_SIZE / 2,
        '#ff6b35',
        5,
      );
    }
  }

  private updateEnemies(dt: number): void {
    if (!this.dungeon) return;

    for (const enemy of this.enemies) {
      if (enemy.hitFlash > 0) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      }

      const isFrozen = enemy.statusEffects.some((s) => s.type === StatusEffectType.Freeze);
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

    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      moveX = Math.sign(dx);
    } else if (dy !== 0) {
      moveY = Math.sign(dy);
    }

    if (moveX === 0 && moveY === 0) return;

    if (Math.random() < 0.25) {
      const choices = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const pick = choices[randInt(0, choices.length - 1)];
      moveX = pick[0];
      moveY = pick[1];
    }

    const nx = enemy.x + moveX;
    const ny = enemy.y + moveY;

    if (nx < 0 || nx >= this.dungeon.width || ny < 0 || ny >= this.dungeon.height) return;
    if (this.dungeon.grid[ny][nx] === TileType.Wall) return;

    if (nx === this.playerPos.x && ny === this.playerPos.y) {
      this.damagePlayerByEnemy(enemy);
      return;
    }

    const collide = this.enemies.some((o) => o.id !== enemy.id && o.x === nx && o.y === ny);
    if (collide) return;

    enemy.x = nx;
    enemy.y = ny;
  }

  private updateEnemyStatusEffects(enemy: Enemy, dt: number): void {
    const removeIndexes: number[] = [];

    for (let i = 0; i < enemy.statusEffects.length; i++) {
      const eff = enemy.statusEffects[i];
      eff.duration -= dt;

      if (eff.duration <= 0) {
        removeIndexes.push(i);
        continue;
      }

      if (eff.type === StatusEffectType.Burn) {
        eff.tickTimer -= dt;
        enemy.burnParticleTimer -= dt;

        if (eff.tickTimer <= 0) {
          eff.tickTimer = BURN_TICK_INTERVAL;
          const tickDamage = enemy.maxHp * eff.damagePerTick;
          enemy.hp -= tickDamage;
          enemy.hitFlash = Math.max(enemy.hitFlash, 0.12);
          this.spawnImpactParticles(
            enemy.x * TILE_SIZE + TILE_SIZE / 2,
            enemy.y * TILE_SIZE + TILE_SIZE / 2,
            '#ff4d1f',
            3,
          );
        }

        if (enemy.burnParticleTimer <= 0) {
          enemy.burnParticleTimer = BURN_PARTICLE_INTERVAL;
          this.spawnBurnParticles(enemy);
        }
      }

      if (eff.type === StatusEffectType.Freeze) {
        if (Math.random() < dt * 5) {
          this.spawnFreezeParticle(enemy);
        }
      }
    }

    for (let i = removeIndexes.length - 1; i >= 0; i--) {
      enemy.statusEffects.splice(removeIndexes[i], 1);
    }
  }

  private updatePlayerStatusEffects(dt: number): void {
    const removeIndexes: number[] = [];

    for (let i = 0; i < this.playerStatusEffects.length; i++) {
      const eff = this.playerStatusEffects[i];
      eff.duration -= dt;

      if (eff.duration <= 0) {
        removeIndexes.push(i);
        continue;
      }

      if (eff.type === StatusEffectType.Burn) {
        eff.tickTimer -= dt;
        if (eff.tickTimer <= 0) {
          eff.tickTimer = 1.0;
          this.playerTakeDamage(5);
        }
      }
      if (eff.type === StatusEffectType.Freeze) {
        this.playerFreezeFlash = 0.15;
        this.eventBus.emit(EVENTS.PLAYER_FROZEN, { duration: eff.duration });
      }
    }

    for (let i = removeIndexes.length - 1; i >= 0; i--) {
      this.playerStatusEffects.splice(removeIndexes[i], 1);
    }
  }

  private spawnBurnParticles(enemy: Enemy): void {
    const cx = enemy.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = enemy.y * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.4;
      const radius = 4 + Math.random() * 4;
      const size = 2 + Math.random() * 2;
      const life = 0.7 + Math.random() * 0.3;

      this.particles.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius - 2,
        vx: Math.cos(angle) * 2 + (Math.random() - 0.5) * 3,
        vy: -BURN_PARTICLE_RISE_SPEED + (Math.random() - 0.5) * 2,
        life,
        maxLife: life,
        size,
        color: Math.random() < 0.7 ? '#ff6b35' : '#ffc24a',
        alpha: 0.85,
        ownerEnemyId: enemy.id,
        kind: 'burn',
      });
    }
  }

  private spawnFreezeParticle(enemy: Enemy): void {
    const cx = enemy.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = enemy.y * TILE_SIZE + TILE_SIZE / 2;
    const angle = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 5;

    this.particles.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5 - 2,
      life: 0.6,
      maxLife: 0.6,
      size: 2 + Math.random() * 2,
      color: '#add8e6',
      alpha: 0.55,
      ownerEnemyId: enemy.id,
      kind: 'freeze',
    });
  }

  private spawnImpactParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.35,
        maxLife: 0.65,
        size: 1 + Math.random() * 2,
        color,
        alpha: 1.0,
        kind: 'impact',
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'burn') {
        p.vx *= 0.96;
      }
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife) * (p.kind === 'freeze' ? 0.55 : 0.85);
    }

    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private emitSnapshot(): void {
    this.eventBus.emit(EVENTS.STATE_UPDATE, this.getSnapshot());
  }

  getSnapshot(): GameSnapshot {
    return {
      playerPos: { ...this.playerPos },
      playerHp: this.playerHp,
      playerMaxHp: this.playerMaxHp,
      playerStatusEffects: this.playerStatusEffects.map((e) => ({ ...e })),
      enemies: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        statusEffects: e.statusEffects.map((s) => ({ ...s })),
        moveTimer: e.moveTimer,
        moveInterval: e.moveInterval,
        damageMultiplier: e.damageMultiplier,
        burnParticleTimer: e.burnParticleTimer,
        hitFlash: e.hitFlash,
      })),
      projectiles: this.projectiles.map((p) => ({ ...p })),
      particles: this.particles.map((p) => ({ ...p })),
      currentFloor: this.currentFloor,
      playerDamageFlash: this.playerDamageFlash,
      playerFreezeFlash: this.playerFreezeFlash,
      portalPos: this.dungeon ? { ...this.dungeon.portalPos } : { x: 0, y: 0 },
      grid: this.dungeon ? this.dungeon.grid.map((row) => [...row]) : [],
      gameover: this.gameover,
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
    this.gameover = false;
    this.playerMoveCooldown = 0;
    this.requestNewMap();
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getGridOffsetPx(): { x: number; y: number } {
  const width = 20 * TILE_SIZE;
  const height = 20 * TILE_SIZE;
  return {
    x: Math.floor((800 - width) / 2),
    y: Math.floor((600 - height) / 2),
  };
}

export const TILE_SIZE_EXPORT = TILE_SIZE;
export const PROJECTILE_DIAMETER_EXPORT = PROJECTILE_DIAMETER;

export function setupMapGenerationBridge(eventBus: EventBus): () => void {
  const off = eventBus.on(EVENTS.REQUEST_NEW_MAP, () => {
    const map = generateDungeon();
    eventBus.emit(EVENTS.MAP_READY, map);
  });
  return off;
}
