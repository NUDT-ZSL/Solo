import { MazeData, MazeItem, ItemType } from './mazeGenerator';

export interface PlayerState {
  x: number;
  y: number;
  lives: number;
  coins: number;
  isMoving: boolean;
  moveDirection: { dx: number; dy: number };
  targetX: number;
  targetY: number;
  moveProgress: number;
  isCollecting: boolean;
  collectTimer: number;
  collectingItem: MazeItem | null;
  invincible: boolean;
  invincibleTimer: number;
  shakeTimer: number;
  floatingTexts: FloatingText[];
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  progress: number;
  duration: number;
}

export interface GameState {
  player: PlayerState;
  maze: MazeData | null;
  items: MazeItem[];
  explored: Set<string>;
  startTime: number;
  elapsedTime: number;
  isGameOver: boolean;
  isVictory: boolean;
  isPaused: boolean;
}

export interface MoveResult {
  newPosition: { x: number; y: number };
  collision: {
    wall: boolean;
    item: ItemType | null;
    itemData: MazeItem | null;
  };
  collectedItem?: MazeItem;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const MOVE_SPEED = 3;

export function createInitialPlayerState(startX: number, startY: number): PlayerState {
  return {
    x: startX,
    y: startY,
    lives: 3,
    coins: 0,
    isMoving: false,
    moveDirection: { dx: 0, dy: 0 },
    targetX: startX,
    targetY: startY,
    moveProgress: 1,
    isCollecting: false,
    collectTimer: 0,
    collectingItem: null,
    invincible: false,
    invincibleTimer: 0,
    shakeTimer: 0,
    floatingTexts: []
  };
}

export function createInitialGameState(maze: MazeData): GameState {
  return {
    player: createInitialPlayerState(maze.entrance.x, maze.entrance.y),
    maze,
    items: [...maze.items],
    explored: new Set([`${maze.entrance.x},${maze.entrance.y}`]),
    startTime: Date.now(),
    elapsedTime: 0,
    isGameOver: false,
    isVictory: false,
    isPaused: false
  };
}

export function isWallAt(maze: MazeData, x: number, y: number): boolean {
  if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) {
    return true;
  }
  return maze.grid[y][x].type === 'wall';
}

export function getItemAt(items: MazeItem[], x: number, y: number): MazeItem | undefined {
  return items.find(item => item.x === x && item.y === y && !item.collected);
}

export function getInputDirection(input: InputState): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dy = 0;
  }

  return { dx, dy };
}

let floatingTextId = 0;

function addFloatingText(player: PlayerState, x: number, y: number, text: string, color: string): PlayerState {
  floatingTextId++;
  return {
    ...player,
    floatingTexts: [
      ...player.floatingTexts,
      {
        id: floatingTextId,
        x,
        y,
        text,
        color,
        progress: 0,
        duration: 0.8
      }
    ]
  };
}

export function updatePlayer(
  player: PlayerState,
  maze: MazeData,
  items: MazeItem[],
  input: InputState,
  deltaTime: number
): {
  player: PlayerState;
  items: MazeItem[];
  events: {
    itemCollected: MazeItem | null;
    damageTaken: boolean;
    victory: boolean;
  };
} {
  let newPlayer = { ...player };
  let newItems = [...items];
  const events = {
    itemCollected: null as MazeItem | null,
    damageTaken: false,
    victory: false
  };

  newPlayer.floatingTexts = newPlayer.floatingTexts
    .map(ft => ({
      ...ft,
      progress: ft.progress + deltaTime
    }))
    .filter(ft => ft.progress < ft.duration);

  if (newPlayer.invincible) {
    newPlayer.invincibleTimer -= deltaTime;
    if (newPlayer.invincibleTimer <= 0) {
      newPlayer.invincible = false;
    }
  }

  if (newPlayer.shakeTimer > 0) {
    newPlayer.shakeTimer -= deltaTime;
  }

  if (newPlayer.isCollecting) {
    newPlayer.collectTimer -= deltaTime;
    if (newPlayer.collectTimer <= 0) {
      newPlayer.isCollecting = false;
      if (newPlayer.collectingItem) {
        const itemIndex = newItems.findIndex(
          item => item.x === newPlayer.collectingItem!.x && item.y === newPlayer.collectingItem!.y
        );
        if (itemIndex !== -1) {
          newItems[itemIndex] = { ...newItems[itemIndex], collected: true };
          events.itemCollected = newItems[itemIndex];
          
          if (newPlayer.collectingItem.type === 'chest') {
            newPlayer.coins += 10;
            newPlayer = addFloatingText(newPlayer, newPlayer.collectingItem.x, newPlayer.collectingItem.y, '+10', '#fbbf24');
          } else if (newPlayer.collectingItem.type === 'exit') {
            events.victory = true;
          }
        }
      }
      newPlayer.collectingItem = null;
    }
    return { player: newPlayer, items: newItems, events };
  }

  if (newPlayer.isMoving) {
    newPlayer.moveProgress += deltaTime * MOVE_SPEED;

    if (newPlayer.moveProgress >= 1) {
      newPlayer.x = newPlayer.targetX;
      newPlayer.y = newPlayer.targetY;
      newPlayer.moveProgress = 1;
      newPlayer.isMoving = false;

      const itemAtPosition = getItemAt(newItems, newPlayer.x, newPlayer.y);
      if (itemAtPosition) {
        if (itemAtPosition.type === 'chest') {
          newPlayer.isCollecting = true;
          newPlayer.collectTimer = 0.5;
          newPlayer.collectingItem = itemAtPosition;
        } else if (itemAtPosition.type === 'monster') {
          if (!newPlayer.invincible) {
            newPlayer.lives -= 1;
            newPlayer.invincible = true;
            newPlayer.invincibleTimer = 1.0;
            newPlayer.shakeTimer = 0.3;
            events.damageTaken = true;

            const itemIndex = newItems.findIndex(
              item => item.x === itemAtPosition.x && item.y === itemAtPosition.y
            );
            if (itemIndex !== -1) {
              newItems[itemIndex] = { ...newItems[itemIndex], collected: true };
            }

            if (newPlayer.lives <= 0) {
              return { player: newPlayer, items: newItems, events };
            }
          }
        } else if (itemAtPosition.type === 'exit') {
          events.victory = true;
        }
      }
    }
  } else {
    const direction = getInputDirection(input);

    if (direction.dx !== 0 || direction.dy !== 0) {
      const nextX = newPlayer.x + direction.dx;
      const nextY = newPlayer.y + direction.dy;

      if (!isWallAt(maze, nextX, nextY)) {
        newPlayer.targetX = nextX;
        newPlayer.targetY = nextY;
        newPlayer.moveDirection = direction;
        newPlayer.moveProgress = 0;
        newPlayer.isMoving = true;
      }
    }
  }

  return { player: newPlayer, items: newItems, events };
}

export function getSmoothPosition(player: PlayerState): { x: number; y: number } {
  if (!player.isMoving) {
    return { x: player.x, y: player.y };
  }

  const t = Math.min(player.moveProgress, 1);
  const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  return {
    x: player.x + (player.targetX - player.x) * easeT,
    y: player.y + (player.targetY - player.y) * easeT
  };
}

export function updateExplored(
  explored: Set<string>, x: number, y: number, maze: MazeData): Set<string> {
  const newExplored = new Set(explored);
  
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = Math.floor(x) + dx;
      const ny = Math.floor(y) + dy;
      if (nx >= 0 && nx < maze.width && ny >= 0 && ny < maze.height) {
        if (maze.grid[ny][nx].type === 'path') {
          newExplored.add(`${nx},${ny}`);
        }
      }
    }
  }
  
  return newExplored;
}

export function getWallsNearPlayer(
  playerX: number,
  playerY: number,
  maze: MazeData,
  distance: number = 3
): Set<string> {
  const nearWalls = new Set<string>();
  
  for (let dy = -distance; dy <= distance; dy++) {
    for (let dx = -distance; dx <= distance; dx++) {
      const nx = Math.floor(playerX) + dx;
      const ny = Math.floor(playerY) + dy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= distance && nx >= 0 && nx < maze.width && ny >= 0 && ny < maze.height) {
        if (maze.grid[ny][nx].type === 'wall') {
          nearWalls.add(`${nx},${ny}`);
        }
      }
    }
  }
  
  return nearWalls;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
