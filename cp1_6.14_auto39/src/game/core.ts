import {
  RoomData,
  generateRoom,
  getTileCenter,
  TILE_SIZE,
} from './room';
import {
  Player,
  Enemy,
  Projectile,
  Debris,
  Item,
  PermanentUpgrade,
  PlayerInput,
  generateRandomItems,
  generateRandomUpgrade,
} from './entities';
import type {
  IGameData,
  IPlayerState,
  IEnemyState,
  IProjectileState,
  IGameStats,
  GameState,
} from './types';

export type { GameState };
export type { IGameData as GameData };

export interface GameStats {
  floor: number;
  roomIndex: number;
  enemiesKilled: number;
  goldCollected: number;
  endlessPoints: number;
}

interface InternalGameData {
  state: GameState;
  room: RoomData;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  debris: Debris[];
  chestItems: Item[];
  selectedChestIndex: number | null;
  upgradeOptions: PermanentUpgrade[];
  stats: GameStats;
  deathAnimationProgress: number;
  showBossWarning: boolean;
}

const ROOMS_PER_FLOOR = 5;
const MAX_ENTITY_COUNT = 80;
const TARGET_FPS = 60;
const FRAME_BUDGET = 1000 / TARGET_FPS;

export class GameCore {
  private data: InternalGameData;
  private lastTime: number = 0;
  private baseSeed: number = 0;
  private pendingInput: Partial<PlayerInput> = {};
  private attackPressed: boolean = false;
  private fpsHistory: number[] = [];
  private lastFpsUpdate: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 60;

  constructor() {
    this.baseSeed = Date.now();
    this.data = this.createInitialGameData();
  }

  private createInitialGameData(): InternalGameData {
    const floor = 1;
    const roomIndex = 0;
    const isBossRoom = false;
    const seed = this.generateSeed(floor, roomIndex);
    const room = generateRoom(seed, isBossRoom);

    let spawnX: number, spawnY: number;
    if (room.entrance.x === 0) {
      spawnX = 1 * 48 + 24;
      spawnY = room.entrance.y * 48 + 24;
    } else if (room.entrance.x === room.width - 1) {
      spawnX = (room.width - 2) * 48 + 24;
      spawnY = room.entrance.y * 48 + 24;
    } else if (room.entrance.y === 0) {
      spawnX = room.entrance.x * 48 + 24;
      spawnY = 1 * 48 + 24;
    } else {
      spawnX = room.entrance.x * 48 + 24;
      spawnY = (room.height - 2) * 48 + 24;
    }
    const player = new Player('player', spawnX, spawnY, 100, 10, 150, 0);

    const enemies: Enemy[] = room.enemies.map((config, index) => {
      const pos = getTileCenter(config.position.x, config.position.y);
      return new Enemy(`enemy_${index}`, pos.x, pos.y, config.isBoss);
    });

    return {
      state: 'playing',
      room,
      player,
      enemies,
      projectiles: [],
      debris: [],
      chestItems: [],
      selectedChestIndex: null,
      upgradeOptions: [],
      stats: {
        floor,
        roomIndex,
        enemiesKilled: 0,
        goldCollected: 0,
        endlessPoints: 0,
      },
      deathAnimationProgress: 0,
      showBossWarning: false,
    };
  }

  private generateSeed(floor: number, roomIndex: number): number {
    return this.baseSeed + floor * 1000 + roomIndex * 100;
  }

  start(): void {
    this.lastTime = performance.now();
    this.lastFpsUpdate = this.lastTime;
  }

  setInput(input: Partial<PlayerInput>): void {
    this.pendingInput = { ...this.pendingInput, ...input };
  }

  triggerAttack(): void {
    this.attackPressed = true;
  }

  getFps(): number {
    return this.currentFps;
  }

  getEntityCount(): number {
    return (
      1 +
      this.data.enemies.length +
      this.data.projectiles.length +
      this.data.debris.length +
      this.data.player.particles.length
    );
  }

  private updateFps(now: number): void {
    this.frameCount++;
    const elapsed = now - this.lastFpsUpdate;
    if (elapsed >= 500) {
      this.currentFps = (this.frameCount / elapsed) * 1000;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
    }
  }

  update(): IGameData {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.updateFps(now);

    dt = Math.min(dt, 1 / 30);

    if (this.data.state === 'death_animation') {
      this.data.deathAnimationProgress += dt / 1.5;
      if (this.data.deathAnimationProgress >= 1) {
        this.data.deathAnimationProgress = 1;
        this.data.state = 'game_over';
      }
      return this.toSnapshot();
    }

    if (
      this.data.state !== 'playing' &&
      this.data.state !== 'victory'
    ) {
      return this.toSnapshot();
    }

    const input: PlayerInput = {
      up: this.pendingInput.up || false,
      down: this.pendingInput.down || false,
      left: this.pendingInput.left || false,
      right: this.pendingInput.right || false,
      attack: false,
    };

    if (this.attackPressed) {
      this.data.player.attack();
      this.attackPressed = false;
    }

    this.data.player.update(dt, input, this.data.room);

    const attackArea = this.data.player.getAttackArea();
    if (attackArea) {
      for (let i = this.data.enemies.length - 1; i >= 0; i--) {
        const enemy = this.data.enemies[i];
        if (enemy.checkHitByAttack(attackArea)) {
          const debris = enemy.takeDamage(
            this.data.player.attackPower,
            attackArea.direction
          );
          if (debris) {
            this.data.debris.push(...debris);
            this.data.enemies.splice(i, 1);
            this.data.stats.enemiesKilled++;
          }
        }
      }
    }

    for (let i = this.data.enemies.length - 1; i >= 0; i--) {
      const enemy = this.data.enemies[i];
      const event = enemy.update(dt, this.data.player, this.data.room, this.data.projectiles);
      if (event && event.type === 'player_hit' && event.damage) {
        this.data.player.takeDamage(event.damage);
      }
    }

    for (let i = this.data.projectiles.length - 1; i >= 0; i--) {
      const alive = this.data.projectiles[i].update(
        dt,
        this.data.player,
        this.data.room
      );
      if (!alive) {
        const dist = Math.sqrt(
          Math.pow(this.data.projectiles[i].x - this.data.player.x, 2) +
            Math.pow(this.data.projectiles[i].y - this.data.player.y, 2)
        );
        if (dist <= this.data.projectiles[i].radius + this.data.player.radius) {
          this.data.player.takeDamage(this.data.projectiles[i].damage);
        }
        this.data.projectiles.splice(i, 1);
      }
    }

    this.data.debris = this.data.debris.filter((d) => {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.95;
      d.vy *= 0.95;
      return d.life > 0;
    });

    if (this.getEntityCount() > MAX_ENTITY_COUNT) {
      this.data.debris.sort((a, b) => a.life - b.life);
      const excess = this.getEntityCount() - MAX_ENTITY_COUNT;
      this.data.debris.splice(0, Math.min(excess, this.data.debris.length));
    }

    for (let i = 0; i < this.data.room.chests.length; i++) {
      const chest = this.data.room.chests[i];
      if (!chest.opened) {
        const chestPos = getTileCenter(chest.position.x, chest.position.y);
        const dist = Math.sqrt(
          Math.pow(this.data.player.x - chestPos.x, 2) +
            Math.pow(this.data.player.y - chestPos.y, 2)
        );
        if (dist < 24) {
          chest.opened = true;
          this.data.chestItems = generateRandomItems(3);
          this.data.selectedChestIndex = i;
          this.data.state = 'item_select';
          return this.toSnapshot();
        }
      }
    }

    const exitPos = getTileCenter(this.data.room.exit.x, this.data.room.exit.y);
    const exitDist = Math.sqrt(
      Math.pow(this.data.player.x - exitPos.x, 2) +
        Math.pow(this.data.player.y - exitPos.y, 2)
    );

    const allEnemiesDefeated = this.data.enemies.length === 0;

    if (exitDist < 24 && allEnemiesDefeated) {
      this.nextRoom();
      return this.toSnapshot();
    }

    if (this.data.player.hp <= 0) {
      this.data.state = 'death_animation';
      this.data.deathAnimationProgress = 0;
      this.data.stats.endlessPoints = this.data.stats.floor * 10;
    }

    return this.toSnapshot();
  }

  private nextRoom(): void {
    this.data.stats.roomIndex++;
    this.data.player.resetTemporaryEffects();

    if (this.data.stats.roomIndex >= ROOMS_PER_FLOOR) {
      this.data.stats.floor++;
      this.data.stats.roomIndex = 0;
      this.data.upgradeOptions = [
        generateRandomUpgrade(),
        generateRandomUpgrade(),
        generateRandomUpgrade(),
      ];
      this.data.state = 'upgrade_select';
      return;
    }

    const isBossRoom = this.data.stats.roomIndex === ROOMS_PER_FLOOR - 1;
    this.loadRoom(isBossRoom);
  }

  private loadRoom(isBossRoom: boolean): void {
    const seed = this.generateSeed(this.data.stats.floor, this.data.stats.roomIndex);
    this.data.room = generateRoom(seed, isBossRoom);

    const room = this.data.room;
    let spawnX: number, spawnY: number;
    if (room.entrance.x === 0) {
      spawnX = 1 * 48 + 24;
      spawnY = room.entrance.y * 48 + 24;
    } else if (room.entrance.x === room.width - 1) {
      spawnX = (room.width - 2) * 48 + 24;
      spawnY = room.entrance.y * 48 + 24;
    } else if (room.entrance.y === 0) {
      spawnX = room.entrance.x * 48 + 24;
      spawnY = 1 * 48 + 24;
    } else {
      spawnX = room.entrance.x * 48 + 24;
      spawnY = (room.height - 2) * 48 + 24;
    }
    this.data.player.x = spawnX;
    this.data.player.y = spawnY;

    this.data.enemies = this.data.room.enemies.map((config, index) => {
      const pos = getTileCenter(config.position.x, config.position.y);
      return new Enemy(`enemy_${index}`, pos.x, pos.y, config.isBoss);
    });

    this.data.projectiles = [];
    this.data.debris = [];
    this.data.state = 'playing';
  }

  selectItem(itemIndex: number): void {
    if (this.data.state !== 'item_select') return;
    if (itemIndex >= 0 && itemIndex < this.data.chestItems.length) {
      const item = this.data.chestItems[itemIndex];
      this.data.player.applyItem(item);
      if (item.type === 'gold_bag') {
        this.data.stats.goldCollected += 10;
      }
    }
    this.data.chestItems = [];
    this.data.selectedChestIndex = null;
    this.data.state = 'playing';
  }

  selectUpgrade(upgradeIndex: number): void {
    if (this.data.state !== 'upgrade_select') return;
    if (upgradeIndex >= 0 && upgradeIndex < this.data.upgradeOptions.length) {
      const upgrade = this.data.upgradeOptions[upgradeIndex];
      this.data.player.applyPermanentUpgrade(upgrade);
    }
    this.data.upgradeOptions = [];

    const isBossRoom = true;
    this.loadRoom(isBossRoom);
  }

  restart(): void {
    const savedUpgrades = this.data.player.permanentUpgrades;
    const savedGold = this.data.player.gold;
    this.baseSeed = Date.now();
    this.data = this.createInitialGameData();
    this.data.player.gold = savedGold;
    savedUpgrades.forEach((u) => this.data.player.applyPermanentUpgrade(u));
  }

  getData(): IGameData {
    return this.toSnapshot();
  }

  private toSnapshot(): IGameData {
    const p = this.data.player;
    const playerState: IPlayerState = {
      x: p.x,
      y: p.y,
      hp: p.hp,
      maxHp: p.maxHp,
      attackPower: p.attackPower,
      baseAttack: p.baseAttack,
      speed: p.speed,
      baseSpeed: p.baseSpeed,
      gold: p.gold,
      direction: p.direction,
      isAttacking: p.isAttacking,
      hasShield: p.hasShield,
      activeItems: p.activeItems.map(item => ({ ...item })),
      permanentUpgrades: p.permanentUpgrades.map(u => ({ ...u })),
      hitFlashTimer: p.hitFlashTimer,
      invincibleTimer: p.invincibleTimer,
    };

    const enemiesState: IEnemyState[] = this.data.enemies.map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      hp: e.hp,
      maxHp: e.maxHp,
      attack: e.attack,
      speed: e.speed,
      state: e.state,
      isBoss: e.isBoss,
      hitFlashTimer: e.hitFlashTimer,
      attackCooldown: e.attackCooldown,
      radius: e.radius,
    }));

    const projectilesState: IProjectileState[] = this.data.projectiles.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      angle: p.angle,
      speed: p.speed,
      damage: p.damage,
      radius: p.radius,
      life: p.life,
    }));

    const debrisState = this.data.debris.map(d => ({ ...d }));
    const chestItemsState = this.data.chestItems.map(item => ({ ...item }));
    const upgradeOptionsState = this.data.upgradeOptions.map(u => ({ ...u }));

    return {
      state: this.data.state,
      room: this.data.room,
      player: playerState,
      enemies: enemiesState,
      projectiles: projectilesState,
      debris: debrisState,
      chestItems: chestItemsState,
      selectedChestIndex: this.data.selectedChestIndex,
      upgradeOptions: upgradeOptionsState,
      stats: { ...this.data.stats },
      deathAnimationProgress: this.data.deathAnimationProgress,
    };
  }
}
