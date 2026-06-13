import { MazeData, MazeItem, ItemType } from './mazeGenerator';

export type Direction = 'up' | 'down' | 'left' | 'right' | null;

export interface PlayerState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  moveProgress: number;
  lives: number;
  coins: number;
  isPaused: boolean;
  isInvincible: boolean;
  invincibleTimer: number;
}

export interface CollisionResult {
  canMove: boolean;
  hitWall: boolean;
  hitItem: MazeItem | null;
  newPosition: { x: number; y: number };
}

export interface GameEvent {
  type: 'chest_collected' | 'monster_hit' | 'exit_reached' | 'move' | 'game_over';
  data?: {
    position?: { x: number; y: number };
    coins?: number;
    lives?: number;
    time?: number;
  };
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: string;
}

export interface GameState {
  player: PlayerState;
  maze: MazeData | null;
  collectedItems: Set<string>;
  exploredCells: Set<string>;
  events: GameEvent[];
  floatingTexts: FloatingText[];
  startTime: number;
  elapsedTime: number;
  isGameOver: boolean;
  isVictory: boolean;
  shaking: boolean;
  shakeTimer: number;
}

const MOVE_SPEED = 3;
const CELL_SIZE = 1;

export function createInitialPlayerState(startX: number, startY: number): PlayerState {
  return {
    x: startX,
    y: startY,
    targetX: startX,
    targetY: startY,
    isMoving: false,
    moveProgress: 0,
    lives: 3,
    coins: 0,
    isPaused: false,
    isInvincible: false,
    invincibleTimer: 0
  };
}

export function createInitialGameState(): GameState {
  return {
    player: createInitialPlayerState(1, 1),
    maze: null,
    collectedItems: new Set(),
    exploredCells: new Set(),
    events: [],
    floatingTexts: [],
    startTime: 0,
    elapsedTime: 0,
    isGameOver: false,
    isVictory: false,
    shaking: false,
    shakeTimer: 0
  };
}

export function checkCollision(
  playerX: number,
  playerY: number,
  direction: Direction,
  maze: MazeData,
  collectedItems: Set<string>
): CollisionResult {
  if (!direction) {
    return {
      canMove: false,
      hitWall: false,
      hitItem: null,
      newPosition: { x: playerX, y: playerY }
    };
  }

  const deltaMap: Record<string, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 }
  };

  const delta = deltaMap[direction];
  const newX = playerX + delta.dx;
  const newY = playerY + delta.dy;

  if (newX < 0 || newX >= maze.width || newY < 0 || newY >= maze.height) {
    return {
      canMove: false,
      hitWall: true,
      hitItem: null,
      newPosition: { x: playerX, y: playerY }
    };
  }

  if (maze.grid[newY][newX].type === 'wall') {
    return {
      canMove: false,
      hitWall: true,
      hitItem: null,
      newPosition: { x: playerX, y: playerY }
    };
  }

  const itemKey = `${newX},${newY}`;
  const item = maze.items.find(i => i.x === newX && i.y === newY && !collectedItems.has(itemKey));

  return {
    canMove: true,
    hitWall: false,
    hitItem: item || null,
    newPosition: { x: newX, y: newY }
  };
}

export function startMove(
  player: PlayerState,
  direction: Direction,
  maze: MazeData,
  collectedItems: Set<string>
): { player: PlayerState; collision: CollisionResult } {
  if (player.isMoving || player.isPaused) {
    return {
      player,
      collision: {
        canMove: false,
        hitWall: false,
        hitItem: null,
        newPosition: { x: player.x, y: player.y }
      }
    };
  }

  const collision = checkCollision(player.x, player.y, direction, maze, collectedItems);

  if (!collision.canMove) {
    return { player, collision };
  }

  const newPlayer = {
    ...player,
    targetX: collision.newPosition.x,
    targetY: collision.newPosition.y,
    isMoving: true,
    moveProgress: 0
  };

  return { player: newPlayer, collision };
}

export function updatePlayerMovement(
  player: PlayerState,
  deltaTime: number
): { player: PlayerState; completed: boolean } {
  if (!player.isMoving) {
    return { player, completed: false };
  }

  const newProgress = player.moveProgress + MOVE_SPEED * deltaTime;
  
  if (newProgress >= 1) {
    const newPlayer = {
      ...player,
      x: player.targetX,
      y: player.targetY,
      isMoving: false,
      moveProgress: 0
    };
    return { player: newPlayer, completed: true };
  }

  const newPlayer = {
    ...player,
    moveProgress: newProgress
  };

  return { player: newPlayer, completed: false };
}

export function getInterpolatedPosition(player: PlayerState): { x: number; y: number } {
  if (!player.isMoving) {
    return { x: player.x, y: player.y };
  }
  
  const t = player.moveProgress;
  const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  
  return {
    x: player.x + (player.targetX - player.x) * easeT,
    y: player.y + (player.targetY - player.y) * easeT
  };
}

export function handleItemCollision(
  item: MazeItem,
  player: PlayerState,
  collectedItems: Set<string>,
  floatingTexts: FloatingText[]
): {
  player: PlayerState;
  collectedItems: Set<string>;
  events: GameEvent[];
  floatingTexts: FloatingText[];
  stopMovement: boolean;
  shaking: boolean;
} {
  const itemKey = `${item.x},${item.y}`;
  const newCollected = new Set(collectedItems);
  const events: GameEvent[] = [];
  const newFloatingTexts = [...floatingTexts];
  let newPlayer = { ...player };
  let stopMovement = false;
  let shaking = false;

  switch (item.type) {
    case 'chest':
      newCollected.add(itemKey);
      newPlayer.coins += 10;
      stopMovement = true;
      events.push({
        type: 'chest_collected',
        data: { position: { x: item.x, y: item