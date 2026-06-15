export type DoorState = 'closed' | 'opening' | 'open';

export interface Door {
  state: DoorState;
  openProgress: number;
}

export interface RoomWalls {
  north: boolean | Door;
  south: boolean | Door;
  east: boolean | Door;
  west: boolean | Door;
}

export interface Room {
  x: number;
  y: number;
  walls: RoomWalls;
  visited: boolean;
  hasChest: boolean;
  chestOpened: boolean;
  isExit: boolean;
  isEntrance: boolean;
}

export type Maze = Room[][];

interface GenerationCell {
  x: number;
  y: number;
  walls: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  visited: boolean;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createInitialGrid(size: number): GenerationCell[][] {
  const grid: GenerationCell[][] = [];
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = {
        x,
        y,
        walls: { north: true, south: true, east: true, west: true },
        visited: false
      };
    }
  }
  return grid;
}

function recursiveBacktrack(grid: GenerationCell[][], startX: number, startY: number): void {
  const size = grid.length;
  const stack: [number, number][] = [];
  grid[startY][startX].visited = true;
  stack.push([startX, startY]);

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const current = grid[cy][cx];

    const directions = shuffle([
      { dx: 0, dy: -1, wall: 'north', opposite: 'south' },
      { dx: 0, dy: 1, wall: 'south', opposite: 'north' },
      { dx: 1, dy: 0, wall: 'east', opposite: 'west' },
      { dx: -1, dy: 0, wall: 'west', opposite: 'east' }
    ]);

    let found = false;
    for (const dir of directions) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !grid[ny][nx].visited) {
        const neighbor = grid[ny][nx];
        (current.walls as Record<string, boolean>)[dir.wall] = false;
        (neighbor.walls as Record<string, boolean>)[dir.opposite] = false;
        neighbor.visited = true;
        stack.push([nx, ny]);
        found = true;
        break;
      }
    }

    if (!found) {
      stack.pop();
    }
  }
}

function convertToMaze(generationGrid: GenerationCell[][], size: number): Maze {
  const maze: Maze = [];
  const chestPositions = new Set<string>();
  const numChests = Math.floor(size * size * 0.15);

  while (chestPositions.size < numChests) {
    const cx = Math.floor(Math.random() * size);
    const cy = Math.floor(Math.random() * size);
    if (!(cx === 0 && cy === 0) && !(cx === size - 1 && cy === size - 1)) {
      chestPositions.add(`${cx},${cy}`);
    }
  }

  for (let y = 0; y < size; y++) {
    maze[y] = [];
    for (let x = 0; x < size; x++) {
      const cell = generationGrid[y][x];
      const hasChest = chestPositions.has(`${x},${y}`);

      const walls: RoomWalls = {
        north: cell.walls.north ? { state: 'closed', openProgress: 0 } : { state: 'open', openProgress: 1 },
        south: cell.walls.south ? { state: 'closed', openProgress: 0 } : { state: 'open', openProgress: 1 },
        east: cell.walls.east ? { state: 'closed', openProgress: 0 } : { state: 'open', openProgress: 1 },
        west: cell.walls.west ? { state: 'closed', openProgress: 0 } : { state: 'open', openProgress: 1 }
      };

      maze[y][x] = {
        x,
        y,
        walls,
        visited: false,
        hasChest,
        chestOpened: false,
        isExit: x === size - 1 && y === size - 1,
        isEntrance: x === 0 && y === 0
      };
    }
  }

  maze[0][0].visited = true;

  return maze;
}

export function generateMaze(size: number = 7): Maze {
  const startTime = performance.now();

  const generationGrid = createInitialGrid(size);
  recursiveBacktrack(generationGrid, 0, 0);
  const maze = convertToMaze(generationGrid, size);

  const endTime = performance.now();
  console.log(`迷宫生成耗时: ${(endTime - startTime).toFixed(2)}ms`);

  return maze;
}

export function isDoorOpen(wall: boolean | Door): boolean {
  if (typeof wall === 'boolean') return !wall;
  return wall.state === 'open' || wall.state === 'opening';
}

export function canMove(maze: Maze, fromX: number, fromY: number, direction: 'north' | 'south' | 'east' | 'west'): boolean {
  const size = maze.length;
  const room = maze[fromY]?.[fromX];
  if (!room) return false;

  let targetX = fromX;
  let targetY = fromY;

  switch (direction) {
    case 'north': targetY--; break;
    case 'south': targetY++; break;
    case 'east': targetX++; break;
    case 'west': targetX--; break;
  }

  if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) {
    return false;
  }

  const wall = room.walls[direction];
  return isDoorOpen(wall);
}

export function getDoor(maze: Maze, x: number, y: number, direction: 'north' | 'south' | 'east' | 'west'): Door | null {
  const room = maze[y]?.[x];
  if (!room) return null;
  const wall = room.walls[direction];
  return typeof wall === 'boolean' ? null : wall;
}

export function startDoorOpening(maze: Maze, x: number, y: number, direction: 'north' | 'south' | 'east' | 'west'): void {
  const door = getDoor(maze, x, y, direction);
  if (door && door.state === 'closed') {
    door.state = 'opening';
  }
}

export function updateDoorAnimations(maze: Maze, deltaTime: number): boolean {
  let animating = false;
  const openSpeed = 5;

  for (const row of maze) {
    for (const room of row) {
      for (const direction of ['north', 'south', 'east', 'west'] as const) {
        const wall = room.walls[direction];
        if (typeof wall !== 'boolean' && wall.state === 'opening') {
          animating = true;
          wall.openProgress = Math.min(1, wall.openProgress + deltaTime * openSpeed);
          if (wall.openProgress >= 1) {
            wall.state = 'open';
          }
        }
      }
    }
  }

  return animating;
}

export function playCreakSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log('吱呀音效播放失败（资源占位）');
  }
}
