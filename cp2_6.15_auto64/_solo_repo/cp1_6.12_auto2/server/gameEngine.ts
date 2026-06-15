import { v4 as uuidv4 } from 'uuid';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  id: string;
  nickname: string;
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
  color: string;
  score: number;
  speed: number;
  baseSpeed: number;
  isBoosted: boolean;
  boostEndTime: number;
  foodEaten: number;
  isAlive: boolean;
  killCount: number;
  spawnTime: number;
  deathTime?: number;
}

export interface Food {
  id: string;
  position: Position;
  type: 'normal' | 'speed';
}

export interface GameState {
  snakes: Snake[];
  foods: Food[];
  gridSize: { width: number; height: number };
  startTime: number;
  isRunning: boolean;
}

export interface GameStats {
  playerId: string;
  nickname: string;
  score: number;
  survivalTime: number;
  killCount: number;
  rank: number;
}

const SNAKE_COLORS = ['#a855f7', '#06b6d4', '#f43f5e', '#84cc16'];
const GRID_WIDTH = 60;
const GRID_HEIGHT = 34;
const INITIAL_SPEED = 150;
const BOOST_MULTIPLIER = 1.5;
const BOOST_DURATION = 10000;
const FOODS_FOR_BOOST = 5;
const SPAWN_POSITIONS: Position[] = [
  { x: 10, y: 17 },
  { x: 50, y: 17 },
  { x: 30, y: 8 },
  { x: 30, y: 26 },
];

export class GameEngine {
  private state: GameState;
  private lastTickTime: number = 0;
  private tickInterval: number = INITIAL_SPEED;

  constructor() {
    this.state = {
      snakes: [],
      foods: [],
      gridSize: { width: GRID_WIDTH, height: GRID_HEIGHT },
      startTime: 0,
      isRunning: false,
    };
  }

  getState(): GameState {
    return this.state;
  }

  addSnake(playerId: string, nickname: string, playerIndex: number): Snake {
    const spawnPos = SPAWN_POSITIONS[playerIndex % SPAWN_POSITIONS.length];
    const direction: Direction = playerIndex % 2 === 0 ? 'right' : 'left';
    const body: Position[] = [];

    for (let i = 0; i < 4; i++) {
      if (direction === 'right') {
        body.push({ x: spawnPos.x - i, y: spawnPos.y });
      } else if (direction === 'left') {
        body.push({ x: spawnPos.x + i, y: spawnPos.y });
      }
    }

    const snake: Snake = {
      id: playerId,
      nickname,
      body,
      direction,
      nextDirection: direction,
      color: SNAKE_COLORS[playerIndex % SNAKE_COLORS.length],
      score: 0,
      speed: INITIAL_SPEED,
      baseSpeed: INITIAL_SPEED,
      isBoosted: false,
      boostEndTime: 0,
      foodEaten: 0,
      isAlive: true,
      killCount: 0,
      spawnTime: Date.now(),
    };

    this.state.snakes.push(snake);
    return snake;
  }

  removeSnake(snakeId: string): void {
    this.state.snakes = this.state.snakes.filter(s => s.id !== snakeId);
  }

  setDirection(snakeId: string, direction: Direction): void {
    const snake = this.state.snakes.find(s => s.id === snakeId);
    if (!snake || !snake.isAlive) return;

    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };

    if (opposites[direction] !== snake.direction) {
      snake.nextDirection = direction;
    }
  }

  spawnFood(): Food | null {
    const occupiedPositions = new Set<string>();
    
    this.state.snakes.forEach(snake => {
      snake.body.forEach(pos => {
        occupiedPositions.add(`${pos.x},${pos.y}`);
      });
    });

    this.state.foods.forEach(food => {
      occupiedPositions.add(`${food.position.x},${food.position.y}`);
    });

    const availablePositions: Position[] = [];
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      for (let y = 1; y < GRID_HEIGHT - 1; y++) {
        if (!occupiedPositions.has(`${x},${y}`)) {
          availablePositions.push({ x, y });
        }
      }
    }

    if (availablePositions.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    const position = availablePositions[randomIndex];

    const food: Food = {
      id: uuidv4(),
      position,
      type: Math.random() < 0.2 ? 'speed' : 'normal',
    };

    this.state.foods.push(food);
    return food;
  }

  initializeFoods(count: number = 8): void {
    for (let i = 0; i < count; i++) {
      this.spawnFood();
    }
  }

  start(): void {
    this.state.isRunning = true;
    this.state.startTime = Date.now();
    this.lastTickTime = Date.now();
  }

  stop(): void {
    this.state.isRunning = false;
  }

  checkWallCollision(head: Position): boolean {
    return head.x < 0 || head.x >= this.state.gridSize.width || 
           head.y < 0 || head.y >= this.state.gridSize.height;
  }

  checkSnakeCollision(snake: Snake, head: Position): { collided: boolean; killerId?: string } {
    for (const otherSnake of this.state.snakes) {
      if (!otherSnake.isAlive) continue;

      for (let i = 0; i < otherSnake.body.length; i++) {
        const segment = otherSnake.body[i];
        if (head.x === segment.x && head.y === segment.y) {
          if (snake.id === otherSnake.id && i === 0) continue;
          
          if (snake.id !== otherSnake.id) {
            otherSnake.killCount++;
            otherSnake.score += 5;
            return { collided: true, killerId: otherSnake.id };
          } else {
            return { collided: true };
          }
        }
      }
    }
    return { collided: false };
  }

  checkFoodCollision(head: Position): Food | null {
    for (let i = this.state.foods.length - 1; i >= 0; i--) {
      const food = this.state.foods[i];
      if (head.x === food.position.x && head.y === food.position.y) {
        this.state.foods.splice(i, 1);
        return food;
      }
    }
    return null;
  }

  tick(): { deadSnakes: { snakeId: string; killerId?: string }[]; speedBoosts: string[] } {
    if (!this.state.isRunning) return { deadSnakes: [], speedBoosts: [] };

    const now = Date.now();
    const elapsed = now - this.lastTickTime;
    
    const minSpeed = Math.min(...this.state.snakes.filter(s => s.isAlive).map(s => s.speed));
    if (elapsed < minSpeed) return { deadSnakes: [], speedBoosts: [] };

    this.lastTickTime = now;

    const deadSnakes: { snakeId: string; killerId?: string }[] = [];
    const speedBoosts: string[] = [];

    for (const snake of this.state.snakes) {
      if (!snake.isAlive) continue;

      if (snake.isBoosted && now >= snake.boostEndTime) {
        snake.isBoosted = false;
        snake.speed = snake.baseSpeed;
      }

      if (now - snake.spawnTime < snake.speed) continue;
      snake.spawnTime = now;

      snake.direction = snake.nextDirection;

      const head = { ...snake.body[0] };

      switch (snake.direction) {
        case 'up':
          head.y -= 1;
          break;
        case 'down':
          head.y += 1;
          break;
        case 'left':
          head.x -= 1;
          break;
        case 'right':
          head.x += 1;
          break;
      }

      if (this.checkWallCollision(head)) {
        snake.isAlive = false;
        snake.deathTime = now;
        deadSnakes.push({ snakeId: snake.id });
        continue;
      }

      const snakeCollision = this.checkSnakeCollision(snake, head);
      if (snakeCollision.collided) {
        snake.isAlive = false;
        snake.deathTime = now;
        deadSnakes.push({ snakeId: snake.id, killerId: snakeCollision.killerId });
        continue;
      }

      snake.body.unshift(head);

      const food = this.checkFoodCollision(head);
      if (food) {
        snake.score += food.type === 'speed' ? 20 : 10;
        snake.foodEaten++;

        if (snake.foodEaten % FOODS_FOR_BOOST === 0 && !snake.isBoosted) {
          snake.isBoosted = true;
          snake.boostEndTime = now + BOOST_DURATION;
          snake.speed = Math.floor(snake.baseSpeed / BOOST_MULTIPLIER);
          speedBoosts.push(snake.id);
        }

        this.spawnFood();
      } else {
        snake.body.pop();
      }
    }

    return { deadSnakes, speedBoosts };
  }

  checkGameOver(): boolean {
    const aliveSnakes = this.state.snakes.filter(s => s.isAlive);
    return aliveSnakes.length <= 1 && this.state.snakes.length >= 2;
  }

  getStats(): GameStats[] {
    const now = Date.now();
    const stats: GameStats[] = this.state.snakes.map(snake => ({
      playerId: snake.id,
      nickname: snake.nickname,
      score: snake.score,
      survivalTime: snake.deathTime 
        ? Math.floor((snake.deathTime - this.state.startTime) / 1000)
        : Math.floor((now - this.state.startTime) / 1000),
      killCount: snake.killCount,
      rank: 0,
    }));

    stats.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.survivalTime !== a.survivalTime) return b.survivalTime - a.survivalTime;
      return b.killCount - a.killCount;
    });

    stats.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    return stats;
  }

  reset(): void {
    this.state = {
      snakes: [],
      foods: [],
      gridSize: { width: GRID_WIDTH, height: GRID_HEIGHT },
      startTime: 0,
      isRunning: false,
    };
    this.lastTickTime = 0;
  }
}
