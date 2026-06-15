import {
  GameState,
  Direction,
  Player,
  TileType,
  ItemType,
  Particle,
  MAP_SIZE,
  TILE_SIZE,
  DEFAULT_TORCH_RADIUS,
  BOOSTED_TORCH_RADIUS,
  TORCH_BOOST_DURATION,
  PLAYER_MOVE_INTERVAL,
  ROTATION_DURATION,
  MONSTER_MOVE_INTERVAL,
  DOOR_ANIMATION_DURATION,
  PICKUP_EFFECT_DURATION,
  DAMAGE_FLASH_DURATION,
} from './types';
import { generateDungeon, findPath } from './MapGenerator';

const DIRECTION_ROTATION: Record<Direction, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

export class GameEngine {
  private state: GameState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const dungeon = generateDungeon();
    const player: Player = {
      x: dungeon.playerStart.x,
      y: dungeon.playerStart.y,
      hp: 100,
      maxHp: 100,
      direction: 'up',
      torchRadius: DEFAULT_TORCH_RADIUS,
      torchBoostTimer: 0,
      moveCooldown: 0,
      rotation: 0,
      targetRotation: 0,
      rotationProgress: 1,
    };

    const state: GameState = {
      map: dungeon.map,
      player,
      monsters: dungeon.monsters,
      items: dungeon.items,
      doors: dungeon.doors,
      rooms: dungeon.rooms,
      exploredCount: 0,
      totalFloorCount: dungeon.totalFloorCount,
      damageFlash: 0,
      pickupEffect: null,
      particles: [],
      gameOver: false,
      visitedTiles: new Set<string>(),
    };

    for (let dy = -player.torchRadius; dy <= player.torchRadius; dy++) {
      for (let dx = -player.torchRadius; dx <= player.torchRadius; dx++) {
        const tx = player.x + dx;
        const ty = player.y + dy;
        if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= player.torchRadius) {
            if (state.map[ty][tx].type === TileType.FLOOR || state.map[ty][tx].type === TileType.DOOR) {
              if (!state.visitedTiles.has(`${tx},${ty}`)) {
                state.visitedTiles.add(`${tx},${ty}`);
                state.exploredCount++;
              }
            }
            state.map[ty][tx].explored = true;
          }
        }
      }
    }

    return state;
  }

  getState(): GameState {
    return this.state;
  }

  restart(): void {
    this.state = this.createInitialState();
  }

  tryMovePlayer(direction: Direction): void {
    const state = this.state;
    const { player } = state;
    if (player.moveCooldown > 0) return;

    let dx = 0;
    let dy = 0;
    switch (direction) {
      case 'up':
        dy = -1;
        break;
      case 'down':
        dy = 1;
        break;
      case 'left':
        dx = -1;
        break;
      case 'right':
        dx = 1;
        break;
    }

    const newX = player.x + dx;
    const newY = player.y + dy;

    if (player.direction !== direction) {
      player.rotation = player.rotation + (player.targetRotation - player.rotation) * player.rotationProgress;
      player.targetRotation = DIRECTION_ROTATION[direction];
      player.rotationProgress = 0;
      player.direction = direction;
      player.moveCooldown = PLAYER_MOVE_INTERVAL;
      return;
    }

    if (!this.isPassable(newX, newY)) return;

    player.x = newX;
    player.y = newY;
    player.moveCooldown = PLAYER_MOVE_INTERVAL;

    this.updateExplored();
  }

  openDoorAt(x: number, y: number): void {
    const state = this.state;
    for (const door of state.doors) {
      if (door.x === x && door.y === y && !door.open) {
        const dx = Math.abs(door.x - state.player.x);
        const dy = Math.abs(door.y - state.player.y);
        if (dx <= 2 && dy <= 2) {
          door.open = true;
        }
      }
    }
  }

  private isPassable(x: number, y: number): boolean {
    const state = this.state;
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
    const tile = state.map[y][x];
    if (tile.type === TileType.FLOOR) return true;
    if (tile.type === TileType.DOOR) {
      const door = state.doors.find((d) => d.x === x && d.y === y);
      return door ? door.open : false;
    }
    return false;
  }

  private updateExplored(): void {
    const state = this.state;
    const { player } = state;
    for (let dy = -player.torchRadius; dy <= player.torchRadius; dy++) {
      for (let dx = -player.torchRadius; dx <= player.torchRadius; dx++) {
        const tx = player.x + dx;
        const ty = player.y + dy;
        if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= player.torchRadius) {
            if (!state.map[ty][tx].explored) {
              state.map[ty][tx].explored = true;
              if (state.map[ty][tx].type === TileType.FLOOR || state.map[ty][tx].type === TileType.DOOR) {
                if (!state.visitedTiles.has(`${tx},${ty}`)) {
                  state.visitedTiles.add(`${tx},${ty}`);
                  state.exploredCount++;
                  if (state.player.hp < state.player.maxHp) {
                    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    const state = this.state;
    const screenX = x * TILE_SIZE + TILE_SIZE / 2;
    const screenY = y * TILE_SIZE + TILE_SIZE / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const particle: Particle = {
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 500,
        maxLife: 1000,
        color,
        size: 2 + Math.random() * 3,
      };
      state.particles.push(particle);
    }
  }

  private checkItemPickup(): void {
    const state = this.state;
    const { player } = state;
    const pickedItems: number[] = [];

    for (const item of state.items) {
      if (item.x === player.x && item.y === player.y) {
        pickedItems.push(item.id);
        if (item.type === ItemType.TORCH_BOOST) {
          player.torchRadius = BOOSTED_TORCH_RADIUS;
          player.torchBoostTimer = TORCH_BOOST_DURATION;
          state.pickupEffect = {
            type: item.type,
            x: item.x,
            y: item.y,
            timer: PICKUP_EFFECT_DURATION,
          };
          this.spawnParticles(item.x, item.y, '#FFD700', 20);
        } else if (item.type === ItemType.HEALTH_POTION) {
          player.hp = Math.min(player.maxHp, player.hp + 30);
          state.pickupEffect = {
            type: item.type,
            x: item.x,
            y: item.y,
            timer: PICKUP_EFFECT_DURATION,
          };
          this.spawnParticles(item.x, item.y, '#228B22', 15);
        }
      }
    }

    if (pickedItems.length > 0) {
      state.items = state.items.filter((i) => !pickedItems.includes(i.id));
    }
  }

  private checkCombat(): void {
    const state = this.state;
    const { player } = state;
    const killedMonsters: number[] = [];

    for (const monster of state.monsters) {
      const dx = Math.abs(monster.x - player.x);
      const dy = Math.abs(monster.y - player.y);
      if (dx <= 1 && dy <= 1 && dx + dy <= 1) {
        player.hp -= 10;
        state.damageFlash = DAMAGE_FLASH_DURATION;
        killedMonsters.push(monster.id);
        this.spawnParticles(monster.x, monster.y, '#DC143C', 10);
        if (player.hp <= 0) {
          state.gameOver = true;
        }
      }
    }

    if (killedMonsters.length > 0) {
      state.monsters = state.monsters.filter((m) => !killedMonsters.includes(m.id));
    }
  }

  private updateMonsters(deltaTime: number): void {
    const state = this.state;
    const { player, map, doors, monsters } = state;

    for (const monster of monsters) {
      monster.blinkTimer += deltaTime;
      monster.moveCooldown -= deltaTime;

      if (monster.moveCooldown <= 0) {
        monster.moveCooldown = MONSTER_MOVE_INTERVAL;

        const path = findPath(map, doors, monster.x, monster.y, player.x, player.y);
        if (path && path.length > 0) {
          const next = path[0];
          const occupied = monsters.some(
            (m) => m.id !== monster.id && m.x === next.x && m.y === next.y
          );
          if (!occupied) {
            monster.x = next.x;
            monster.y = next.y;
          }
        }
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    const state = this.state;
    state.particles = state.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= deltaTime;
      return p.life > 0;
    });
  }

  private updateDoors(deltaTime: number): void {
    const state = this.state;
    for (const door of state.doors) {
      if (door.open && door.rotation < 90) {
        door.rotation = Math.min(90, door.rotation + (deltaTime / DOOR_ANIMATION_DURATION) * 90);
      }
    }
  }

  update(deltaTime: number): void {
    const state = this.state;
    if (state.gameOver) return;

    const { player } = state;

    if (player.moveCooldown > 0) {
      player.moveCooldown -= deltaTime;
    }

    if (player.rotationProgress < 1) {
      player.rotationProgress = Math.min(1, player.rotationProgress + deltaTime / ROTATION_DURATION);
    }

    if (player.torchBoostTimer > 0) {
      player.torchBoostTimer -= deltaTime;
      if (player.torchBoostTimer <= 0) {
        player.torchRadius = DEFAULT_TORCH_RADIUS;
      }
    }

    if (state.damageFlash > 0) {
      state.damageFlash -= deltaTime;
    }

    if (state.pickupEffect) {
      state.pickupEffect.timer -= deltaTime;
      if (state.pickupEffect.timer <= 0) {
        state.pickupEffect = null;
      }
    }

    this.updateDoors(deltaTime);
    this.updateMonsters(deltaTime);
    this.checkCombat();
    this.checkItemPickup();
    this.updateParticles(deltaTime);
    this.updateExplored();
  }
}
