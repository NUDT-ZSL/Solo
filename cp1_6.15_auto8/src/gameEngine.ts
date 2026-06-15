import { Maze, canMove, startDoorOpening, playCreakSound, getDoor } from './mazeGenerator';

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  position: Position;
  health: number;
  maxHealth: number;
  coins: number;
  lastMoveTime: number;
  exploredRooms: Set<string>;
}

export interface Monster {
  id: number;
  position: Position;
  lastUpdateTime: number;
}

export interface ChestResult {
  coins: number;
  isTrap: boolean;
}

export type GameState = 'playing' | 'won' | 'lost';

export interface GameStatus {
  state: GameState;
  health: number;
  maxHealth: number;
  coins: number;
  exploredCount: number;
  totalRooms: number;
}

const MOVE_COOLDOWN = 200;
const MONSTER_UPDATE_INTERVAL = 2000;
const MONSTER_COUNT = 3;
const TRAP_DAMAGE = 1;

export class GameEngine {
  private maze: Maze;
  private player: Player;
  private monsters: Monster[];
  private gameState: GameState;
  private onStateChange?: (status: GameStatus) => void;
  private onGameOver?: (won: boolean) => void;

  constructor(maze: Maze) {
    this.maze = maze;
    const size = maze.length;
    
    this.player = {
      position: { x: 0, y: 0 },
      health: 3,
      maxHealth: 3,
      coins: 0,
      lastMoveTime: 0,
      exploredRooms: new Set(['0,0'])
    };

    this.monsters = this.spawnMonsters(size);
    this.gameState = 'playing';
  }

  setCallbacks(onStateChange: (status: GameStatus) => void, onGameOver: (won: boolean) => void): void {
    this.onStateChange = onStateChange;
    this.onGameOver = onGameOver;
    this.notifyStateChange();
  }

  private spawnMonsters(size: number): Monster[] {
    const monsters: Monster[] = [];
    const occupiedPositions = new Set(['0,0', `${size - 1},${size - 1}`]);

    for (let i = 0; i < MONSTER_COUNT; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * size);
        y = Math.floor(Math.random() * size);
        attempts++;
      } while (occupiedPositions.has(`${x},${y}`) && attempts < 100);

      if (attempts < 100) {
        occupiedPositions.add(`${x},${y}`);
        monsters.push({
          id: i,
          position: { x, y },
          lastUpdateTime: 0
        });
      }
    }

    return monsters;
  }

  getMaze(): Maze {
    return this.maze;
  }

  getPlayer(): Player {
    return { ...this.player };
  }

  getMonsters(): Monster[] {
    return [...this.monsters];
  }

  getGameState(): GameState {
    return this.gameState;
  }

  movePlayer(direction: 'north' | 'south' | 'east' | 'west'): boolean {
    if (this.gameState !== 'playing') return false;

    const now = Date.now();
    if (now - this.player.lastMoveTime < MOVE_COOLDOWN) return false;

    const { x, y } = this.player.position;
    
    const door = getDoor(this.maze, x, y, direction);
    if (door && door.state === 'closed') {
      startDoorOpening(this.maze, x, y, direction);
      playCreakSound();
      return false;
    }

    if (!canMove(this.maze, x, y, direction)) {
      return false;
    }

    let newX = x;
    let newY = y;

    switch (direction) {
      case 'north': newY--; break;
      case 'south': newY++; break;
      case 'east': newX++; break;
      case 'west': newX--; break;
    }

    this.player.position = { x: newX, y: newY };
    this.player.lastMoveTime = now;
    this.player.exploredRooms.add(`${newX},${newY}`);
    this.maze[newY][newX].visited = true;

    this.handleRoomInteraction(newX, newY);
    this.checkMonsterCollision();
    this.notifyStateChange();

    return true;
  }

  private handleRoomInteraction(x: number, y: number): void {
    const room = this.maze[y][x];

    if (room.hasChest && !room.chestOpened) {
      const result = this.openChest();
      room.chestOpened = true;
      this.player.coins += result.coins;
      if (result.isTrap) {
        this.player.health -= TRAP_DAMAGE;
        if (this.player.health <= 0) {
          this.endGame(false);
          return;
        }
      }
    }

    if (room.isExit) {
      this.endGame(true);
    }
  }

  private openChest(): ChestResult {
    const isTrap = Math.random() < 0.3;
    const coins = isTrap ? 0 : Math.floor(Math.random() * 50) + 10;
    return { coins, isTrap };
  }

  updateMonsters(currentTime: number): void {
    if (this.gameState !== 'playing') return;

    for (const monster of this.monsters) {
      if (currentTime - monster.lastUpdateTime >= MONSTER_UPDATE_INTERVAL) {
        this.moveMonster(monster);
        monster.lastUpdateTime = currentTime;
      }
    }

    if (this.checkMonsterCollision()) {
      this.notifyStateChange();
    }
  }

  private moveMonster(monster: Monster): void {
    const { x, y } = monster.position;
    const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
    
    const validDirections = directions.filter(dir => {
      if (!canMove(this.maze, x, y, dir)) return false;
      
      let newX = x;
      let newY = y;
      switch (dir) {
        case 'north': newY--; break;
        case 'south': newY++; break;
        case 'east': newX++; break;
        case 'west': newX--; break;
      }
      
      return newX >= 0 && newX < this.maze.length && newY >= 0 && newY < this.maze.length;
    });

    if (validDirections.length === 0) return;

    const randomDir = validDirections[Math.floor(Math.random() * validDirections.length)];
    let newX = x;
    let newY = y;

    switch (randomDir) {
      case 'north': newY--; break;
      case 'south': newY++; break;
      case 'east': newX++; break;
      case 'west': newX--; break;
    }

    monster.position = { x: newX, y: newY };
  }

  checkCollision(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  checkMonsterCollision(): boolean {
    for (const monster of this.monsters) {
      if (this.checkCollision(this.player.position, monster.position)) {
        this.player.health -= 1;
        this.respawnPlayer();
        
        if (this.player.health <= 0) {
          this.endGame(false);
        }
        return true;
      }
    }
    return false;
  }

  private respawnPlayer(): void {
    this.player.position = { x: 0, y: 0 };
  }

  private endGame(won: boolean): void {
    this.gameState = won ? 'won' : 'lost';
    if (this.onGameOver) {
      this.onGameOver(won);
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({
        state: this.gameState,
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        coins: this.player.coins,
        exploredCount: this.player.exploredRooms.size,
        totalRooms: this.maze.length * this.maze.length
      });
    }
  }

  restart(newMaze: Maze): void {
    this.maze = newMaze;
    const size = newMaze.length;
    
    this.player = {
      position: { x: 0, y: 0 },
      health: 3,
      maxHealth: 3,
      coins: 0,
      lastMoveTime: 0,
      exploredRooms: new Set(['0,0'])
    };

    this.monsters = this.spawnMonsters(size);
    this.gameState = 'playing';
    this.notifyStateChange();
  }

  getStatus(): GameStatus {
    return {
      state: this.gameState,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      coins: this.player.coins,
      exploredCount: this.player.exploredRooms.size,
      totalRooms: this.maze.length * this.maze.length
    };
  }
}

export function checkCollision(pos1: Position, pos2: Position): boolean {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

export function isInLight(playerPos: Position, roomX: number, roomY: number): boolean {
  return Math.abs(playerPos.x - roomX) <= 1 && Math.abs(playerPos.y - roomY) <= 1;
}

export function isRoomExplored(exploredRooms: Set<string>, x: number, y: number): boolean {
  return exploredRooms.has(`${x},${y}`);
}
