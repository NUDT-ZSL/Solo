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

export type GameState =
  | 'playing'
  | 'item_select'
  | 'death_animation'
  | 'game_over'
  | 'victory'
  | 'upgrade_select';

export interface GameStats {
  floor: number;
  roomIndex: number;
  enemiesKilled: number;
  goldCollected: number;
  endlessPoints: number;
}

export interface GameData {
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

export class GameCore {
  private data: GameData;
  private lastTime: number = 0;
  private baseSeed: number = 0;
  private pendingInput: Partial<PlayerInput> = {};
  private attackPressed: boolean = false;

  constructor() {
    this.baseSeed = Date.now();
    this.data = this.createInitialGameData();
  }

  private createInitialGameData(): GameData {
    const floor = 1;
    const roomIndex = 0;
    const isBossRoom = false;
    const seed = this.generateSeed(floor, roomIndex);
    const room = generateRoom(seed, isBossRoom);

    const entrancePos = getTileCenter(room.entrance.x, room.entrance.y);
    const player = new Player('player', entrancePos.x, entrancePos.y, 100, 10, 150, 0);

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
  }

  setInput(input: Partial<PlayerInput>): void {
    this.pendingInput = { ...this.pendingInput, ...input };
  }

  triggerAttack(): void {
    this.attackPressed = true;
  }

  update(): GameData {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    dt = Math.min(dt, 1 / 30);

    if (this.data.state === 'death_animation') {
      this.data.deathAnimationProgress += dt / 1.5;
      if (this.data.deathAnimationProgress >= 1) {
        this.data.deathAnimationProgress = 1;
        this.data.state = 'game_over';
      }
      return this.data;
    }

    if (
      this.data.state !== 'playing' &&
      this.data.state !== 'victory'
    ) {
      return this.data;
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
          return this.data;
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
      return this.data;
    }

    if (this.data.player.hp <= 0) {
      this.data.state = 'death_animation';
      this.data.deathAnimationProgress = 0;
      this.data.stats.endlessPoints = this.data.stats.floor * 10;
    }

    return this.data;
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

    const entrancePos = getTileCenter(this.data.room.entrance.x, this.data.room.entrance.y);
    this.data.player.x = entrancePos.x;
    this.data.player.y = entrancePos.y;

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

  getData(): GameData {
    return this.data;
  }
}
