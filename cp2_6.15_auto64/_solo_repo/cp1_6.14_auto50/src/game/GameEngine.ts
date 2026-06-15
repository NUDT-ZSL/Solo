import { GameData, InputState, Room, Enemy } from '../types';
import {
  TILE_SIZE,
  ENEMY_AI_INTERVAL,
  CHEST_OPEN_RANGE,
  DAMAGE_COOLDOWN,
  TRANSITION_DURATION,
} from '../constants';
import {
  getCurrentRoom,
  updatePlayer,
  updateRoom,
  setGameStatus,
  applyItemToPlayer,
  addRoom,
  resetGame,
} from './GameState';
import { generateRoom, getSpawnPosition } from '../rooms/RoomGenerator';
import { renderRoom, renderDeathScreen, renderDamageFlash } from '../rooms/RoomRenderer';
import {
  updateEnemyPosition,
  checkEnemyPlayerCollision,
  damageEnemy,
  isEnemyDead,
  checkPlayerAttackEnemy,
} from '../enemies/EnemyAI';

export type OnStateChange = (data: GameData) => void;

export class GameEngine {
  private data: GameData;
  private input: InputState;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number = 0;
  private onStateChange: OnStateChange | null = null;
  private lastTimestamp: number = 0;
  private accumulator: number = 0;
  private fixedDt: number = 1000 / 60;
  private damageCooldown: number = 0;
  private transitionTimer: number = 0;
  private transitionPhase: 'none' | 'fadeOut' | 'fadeIn' = 'none';
  private nextRoomId: number = 0;

  constructor() {
    this.data = {
      status: 'playing',
      player: {
        x: 0, y: 0, hp: 100, maxHp: 100,
        attack: 10, gold: 0, speed: 2,
        inventory: [], radius: 8,
      },
      currentRoomId: 0,
      rooms: [],
      seed: Math.floor(Math.random() * 2147483647),
      unlockedItems: [],
      frameCount: 0,
      transitionAlpha: 1,
      damageFlash: 0,
    };
    this.input = { w: false, a: false, s: false, d: false, e: false };
  }

  init(canvas: HTMLCanvasElement, onStateChange: OnStateChange): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.onStateChange = onStateChange;

    this.generateInitialRoom();
    this.bindInput();
    this.lastTimestamp = performance.now();
    this.accumulator = 0;

    this.animFrameId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  restart(): void {
    this.data = resetGame(this.data);
    this.damageCooldown = 0;
    this.transitionTimer = 0;
    this.transitionPhase = 'none';
    this.nextRoomId = 0;
    this.accumulator = 0;
    this.generateInitialRoom();
    this.notifyChange();
  }

  private generateInitialRoom(): void {
    const roomId = this.nextRoomId++;
    const roomSeed = this.data.seed + roomId * 7919;
    const room = generateRoom(roomId, roomSeed);
    const spawn = getSpawnPosition(room);
    this.data = addRoom(this.data, room);
    this.data = updatePlayer(this.data, { x: spawn.x, y: spawn.y });
    this.data = { ...this.data, currentRoomId: roomId };
  }

  private bindInput(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e') {
      (this.input as unknown as Record<string, boolean>)[key] = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'e') {
      (this.input as unknown as Record<string, boolean>)[key] = false;
    }
  };

  private loop = (timestamp: number): void => {
    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    const frameTime = Math.min(deltaTime, this.fixedDt * 3);
    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDt) {
      this.update();
      this.accumulator -= this.fixedDt;
    }

    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    if (this.data.status === 'dead') return;

    this.data = { ...this.data, frameCount: this.data.frameCount + 1 };

    if (this.transitionPhase !== 'none') {
      this.updateTransition();
      return;
    }

    this.updatePlayerMovement();
    this.updateEnemies();
    this.checkChestInteraction();
    this.checkDoorTransition();
    this.updateDamageCooldown();

    if (this.data.damageFlash > 0) {
      this.data = { ...this.data, damageFlash: Math.max(0, this.data.damageFlash - 0.05) };
    }

    this.notifyChange();
  }

  private updatePlayerMovement(): void {
    const room = getCurrentRoom(this.data);
    if (!room) return;

    let dx = 0;
    let dy = 0;
    if (this.input.w) dy -= 1;
    if (this.input.s) dy += 1;
    if (this.input.a) dx -= 1;
    if (this.input.d) dx += 1;

    if (dx === 0 && dy === 0) return;

    const len = Math.sqrt(dx * dx + dy * dy);
    const moveX = (dx / len) * this.data.player.speed;
    const moveY = (dy / len) * this.data.player.speed;

    const steps = 4;
    for (let step = 0; step < steps; step++) {
      const stepX = moveX / steps;
      const stepY = moveY / steps;

      const curX = this.data.player.x;
      const curY = this.data.player.y;

      const tryX = curX + stepX;
      const tryY = curY + stepY;

      const canX = !this.isWallForPlayer(room, tryX, curY);
      const canY = !this.isWallForPlayer(room, curX, tryY);
      const canBoth = !this.isWallForPlayer(room, tryX, tryY);

      if (canBoth) {
        this.data = updatePlayer(this.data, { x: tryX, y: tryY });
      } else if (canX) {
        this.data = updatePlayer(this.data, { x: tryX });
      } else if (canY) {
        this.data = updatePlayer(this.data, { y: tryY });
      }
    }
  }

  private isWallForPlayer(room: Room, px: number, py: number): boolean {
    const r = this.data.player.radius;
    const corners = [
      { x: px - r + 0.5, y: py - r + 0.5 },
      { x: px + r - 0.5, y: py - r + 0.5 },
      { x: px - r + 0.5, y: py + r - 0.5 },
      { x: px + r - 0.5, y: py + r - 0.5 },
    ];

    for (const corner of corners) {
      const gx = Math.floor(corner.x / TILE_SIZE);
      const gy = Math.floor(corner.y / TILE_SIZE);
      if (gx < 0 || gx >= room.width || gy < 0 || gy >= room.height) {
        return true;
      }
      if (room.tiles[gy][gx] === 'wall') {
        return true;
      }
    }

    return false;
  }

  private updateEnemies(): void {
    const room = getCurrentRoom(this.data);
    if (!room) return;

    let updatedRoom = { ...room };
    let updatedPlayer = { ...this.data.player };

    if (this.data.frameCount % ENEMY_AI_INTERVAL === 0) {
      const updatedEnemies: Enemy[] = [];
      for (const enemy of updatedRoom.enemies) {
        const moved = updateEnemyPosition(enemy, updatedPlayer, updatedRoom);

        if (checkPlayerAttackEnemy(updatedPlayer, moved)) {
          const damaged = damageEnemy(moved, updatedPlayer.attack);
          updatedEnemies.push(damaged);
        } else {
          updatedEnemies.push(moved);
        }

        if (checkEnemyPlayerCollision(moved, updatedPlayer) && this.damageCooldown <= 0) {
          updatedPlayer.hp = Math.max(0, updatedPlayer.hp - moved.damage);
          this.damageCooldown = DAMAGE_COOLDOWN;
          this.data = { ...this.data, damageFlash: 1 };
        }
      }

      const aliveEnemies = updatedEnemies.filter((e) => !isEnemyDead(e));
      updatedRoom = { ...updatedRoom, enemies: aliveEnemies };
    }

    this.data = updatePlayer(this.data, { hp: updatedPlayer.hp });
    this.data = updateRoom(this.data, updatedRoom);

    if (this.data.player.hp <= 0) {
      this.data = setGameStatus(this.data, 'dead');
    }
  }

  private checkChestInteraction(): void {
    if (!this.input.e) return;

    const room = getCurrentRoom(this.data);
    if (!room) return;

    let roomChanged = false;
    let playerChanged = false;
    const updatedChests = [...room.chests];
    let updatedPlayer = { ...this.data.player };

    for (let i = 0; i < updatedChests.length; i++) {
      const chest = updatedChests[i];
      if (chest.opened) continue;

      const dx = this.data.player.x - chest.x;
      const dy = this.data.player.y - chest.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CHEST_OPEN_RANGE) {
        updatedChests[i] = { ...chest, opened: true };
        updatedPlayer = applyItemToPlayer(updatedPlayer, chest.item);
        roomChanged = true;
        playerChanged = true;
      }
    }

    if (roomChanged) {
      this.data = updateRoom(this.data, { ...room, chests: updatedChests });
    }
    if (playerChanged) {
      this.data = updatePlayer(this.data, updatedPlayer);
    }

    this.input.e = false;
  }

  private checkDoorTransition(): void {
    const room = getCurrentRoom(this.data);
    if (!room) return;

    const px = this.data.player.x;
    const py = this.data.player.y;

    for (const door of room.doors) {
      const dx = px - door.x;
      const dy = py - door.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < TILE_SIZE * 0.6) {
        this.startTransition();
        return;
      }
    }
  }

  private startTransition(): void {
    this.transitionPhase = 'fadeOut';
    this.transitionTimer = TRANSITION_DURATION / 2;
    this.data = { ...this.data, transitionAlpha: 1 };
  }

  private updateTransition(): void {
    this.transitionTimer -= this.fixedDt;

    if (this.transitionPhase === 'fadeOut') {
      const progress = 1 - Math.max(0, this.transitionTimer / (TRANSITION_DURATION / 2));
      this.data = { ...this.data, transitionAlpha: 1 - progress };

      if (this.transitionTimer <= 0) {
        this.moveToNextRoom();
        this.transitionPhase = 'fadeIn';
        this.transitionTimer = TRANSITION_DURATION / 2;
      }
    } else if (this.transitionPhase === 'fadeIn') {
      const progress = 1 - Math.max(0, this.transitionTimer / (TRANSITION_DURATION / 2));
      this.data = { ...this.data, transitionAlpha: progress };

      if (this.transitionTimer <= 0) {
        this.transitionPhase = 'none';
        this.data = { ...this.data, transitionAlpha: 1 };
      }
    }
  }

  private moveToNextRoom(): void {
    const newRoomId = this.nextRoomId++;
    const roomSeed = this.data.seed + newRoomId * 7919;
    const newRoom = generateRoom(newRoomId, roomSeed);
    const spawn = getSpawnPosition(newRoom);

    this.data = addRoom(this.data, newRoom);
    this.data = updatePlayer(this.data, { x: spawn.x, y: spawn.y });
    this.data = { ...this.data, currentRoomId: newRoomId };
  }

  private updateDamageCooldown(): void {
    if (this.damageCooldown > 0) {
      this.damageCooldown -= 1;
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const room = getCurrentRoom(this.data);
    if (room) {
      renderRoom(ctx, room, this.data.player, this.data.transitionAlpha);

      if (this.data.damageFlash > 0) {
        renderDamageFlash(ctx, this.data.damageFlash);
      }
    }

    if (this.data.status === 'dead') {
      renderDeathScreen(ctx);
    }
  }

  private notifyChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.data });
    }
  }

  getData(): GameData {
    return this.data;
  }
}
