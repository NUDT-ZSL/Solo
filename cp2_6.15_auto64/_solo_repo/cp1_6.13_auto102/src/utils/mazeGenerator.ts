export type CellType = 'wall' | 'path';
export type ItemType = 'chest' | 'monster' | 'exit' | 'entrance';

export interface MazeCell {
  type: CellType;
  item?: ItemType;
  visited?: boolean;
}

export interface MazeItem {
  x: number;
  y: number;
  type: ItemType;
  collected?: boolean;
}

export interface MazeData {
  grid: MazeCell[][];
  walls: { x: number; y: number }[];
  paths: { x: number; y: number }[];
  items: MazeItem[];
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
  width: number;
  height: number;
  branchCount: number;
  pathCount: number;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createEmptyGrid(width: number, height: number): MazeCell[][] {
  return Array(height).fill(null).map(() =>
    Array(width).fill(null).map(() => ({ type: 'wall' as CellType }))
  );
}

function carvePassage(grid: MazeCell[][], x: number, y: number): void {
  grid[y][x].type = 'path';
}

function isPath(grid: MazeCell[][], x: number, y: number): boolean {
  const height = grid.length;
  const width = grid[0].length;
  return x >= 0 && x < width && y >= 0 && y < height && grid[y][x].type === 'path';
}

function recursiveBacktracker(
  grid: MazeCell[][],
  startX: number,
  startY: number
): void {
  const height = grid.length;
  const width = grid[0].length;
  const visited: boolean[][] = Array(height).fill(null).map(() =>
    Array(width).fill(false)
  );

  const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visited[startY][startX] = true;
  carvePassage(grid, startX, startY);

  const directions = [
    { dx: 0, dy: -2 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 }
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const shuffledDirs = shuffle(directions);
    let found = false;

    for (const dir of shuffledDirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && !visited[ny][nx]) {
        const midX = current.x + dir.dx / 2;
        const midY = current.y + dir.dy / 2;

        carvePassage(grid, midX, midY);
        carvePassage(grid, nx, ny);
        visited[ny][nx] = true;
        stack.push({ x: nx, y: ny });
        found = true;
        break;
      }
    }

    if (!found) {
      stack.pop();
    }
  }
}

function bfsDistance(
  grid: MazeCell[][],
  startX: number,
  startY: number
): number[][] {
  const height = grid.length;
  const width = grid[0].length;
  const distance: number[][] = Array(height).fill(null).map(() => Array(width).fill(-1));
  const queue: { x: number; y: number }[] = [];

  distance[startY][startX] = 0;
  queue.push({ x: startX, y: startY });

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dist = distance[current.y][current.x];

    for (const d of dirs) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
          grid[ny][nx].type === 'path' && distance[ny][nx] === -1) {
        distance[ny][nx] = dist + 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return distance;
}

function countSimplePaths(
  grid: MazeCell[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number {
  const height = grid.length;
  const width = grid[0].length;
  const visited: boolean[][] = Array(height).fill(null).map(() =>
    Array(width).fill(false)
  );
  
  let pathCount = 0;
  const maxPaths = 10;
  
  function dfs(x: number, y: number): boolean {
    if (x === endX && y === endY) {
      pathCount++;
      return true;
    }
    
    if (pathCount >= maxPaths) return true;
    
    visited[y][x] = true;
    
    const dirs = shuffle([
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ]);
    
    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
          grid[ny][nx].type === 'path' && !visited[ny][nx]) {
        if (dfs(nx, ny)) {
          visited[y][x] = false;
          return true;
        }
      }
    }
    
    visited[y][x] = false;
    return false;
  }
  
  dfs(startX, startY);
  return pathCount;
}

function addLoopsToMaze(
  grid: MazeCell[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  minPaths: number
): void {
  const height = grid.length;
  const width = grid[0].length;
  
  let pathCount = countSimplePaths(grid, startX, startY, endX, endY);
  let attempts = 0;
  const maxAttempts = 200;
  
  const distFromStart = bfsDistance(grid, startX, startY);
  const distFromEnd = bfsDistance(grid, endX, endY);
  const totalDist = distFromStart[endY][endX];
  
  const candidateWalls: { x: number; y: number; score: number }[] = [];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x].type === 'wall') {
        const pathNeighbors = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        ].filter(d => isPath(grid, x + d.dx, y + d.dy)).length;
        
        if (pathNeighbors >= 2) {
          const d1 = distFromStart[y][x] === -1 ? totalDist : distFromStart[y][x];
          const d2 = distFromEnd[y][x] === -1 ? totalDist : distFromEnd[y][x];
          const score = Math.abs(d1 + d2 - totalDist * 0.5);
          
          candidateWalls.push({ x, y, score });
        }
      }
    }
  }
  
  candidateWalls.sort((a, b) => a.score - b.score);
  
  while (pathCount < minPaths && attempts < maxAttempts && candidateWalls.length > 0) {
    const wall = candidateWalls.shift()!;
    
    if (grid[wall.y][wall.x].type === 'wall') {
      grid[wall.y][wall.x].type = 'path';
      const newPathCount = countSimplePaths(grid, startX, startY, endX, endY);
      
      if (newPathCount > pathCount) {
        pathCount = newPathCount;
      }
    }
    
    attempts++;
  }
}

function isIntersection(grid: MazeCell[][], x: number, y: number): boolean {
  const height = grid.length;
  const width = grid[0].length;

  if (grid[y][x].type !== 'path') return false;

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];

  let pathCount = 0;
  for (const d of directions) {
    const nx = x + d.dx;
    const ny = y + d.dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx].type === 'path') {
      pathCount++;
    }
  }

  return pathCount >= 3;
}

function countBranches(grid: MazeCell[][]): number {
  const height = grid.length;
  const width = grid[0].length;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isIntersection(grid, x, y)) {
        count++;
      }
    }
  }

  return count;
}

export function generateMaze(width: number, height: number, config?: {
  minBranches?: number;
  minPaths?: number;
  chestCount?: { min: number; max: number };
  monsterCount?: { min: number; max: number };
}): MazeData {
  const startTime = performance.now();

  const adjustedWidth = width % 2 === 0 ? width + 1 : width;
  const adjustedHeight = height % 2 === 0 ? height + 1 : height;

  const minPaths = config?.minPaths || 3;
  const minBranches = config?.minBranches || 3;

  const grid = createEmptyGrid(adjustedWidth, adjustedHeight);
  
  recursiveBacktracker(grid, 1, 1);
  
  const distFromStart = bfsDistance(grid, 1, 1);
  
  let farthestDist = 0;
  let farthestX = 1;
  let farthestY = 1;
  
  for (let y = 0; y < adjustedHeight; y++) {
    for (let x = 0; x < adjustedWidth; x++) {
      if (distFromStart[y][x] > farthestDist) {
        farthestDist = distFromStart[y][x];
        farthestX = x;
        farthestY = y;
      }
    }
  }
  
  const exit = { x: farthestX, y: farthestY };
  const entrance = { x: 1, y: 1 };
  
  addLoopsToMaze(grid, entrance.x, entrance.y, exit.x, exit.y, minPaths);
  
  const pathCount = countSimplePaths(grid, entrance.x, entrance.y, exit.x, exit.y);
  const branchCount = countBranches(grid);

  grid[entrance.y][entrance.x].item = 'entrance';
  grid[exit.y][exit.x].item = 'exit';

  const intersections: { x: number; y: number }[] = [];
  for (let y = 0; y < adjustedHeight; y++) {
    for (let x = 0; x < adjustedWidth; x++) {
      if (isIntersection(grid, x, y) &&
          !(x === entrance.x && y === entrance.y) &&
          !(x === exit.x && y === exit.y)) {
        intersections.push({ x, y });
      }
    }
  }

  const shuffledIntersections = shuffle(intersections);
  const items: MazeItem[] = [];

  const chestCount = config?.chestCount || { min: 5, max: 10 };
  const monsterCount = config?.monsterCount || { min: 3, max: 7 };

  const numChests = chestCount.min + Math.floor(Math.random() * (chestCount.max - chestCount.min + 1));
  const numMonsters = monsterCount.min + Math.floor(Math.random() * (monsterCount.max - monsterCount.min + 1));

  let idx = 0;
  for (let i = 0; i < numChests && idx < shuffledIntersections.length; i++, idx++) {
    const pos = shuffledIntersections[idx];
    grid[pos.y][pos.x].item = 'chest';
    items.push({ x: pos.x, y: pos.y, type: 'chest' });
  }

  for (let i = 0; i < numMonsters && idx < shuffledIntersections.length; i++, idx++) {
    const pos = shuffledIntersections[idx];
    grid[pos.y][pos.x].item = 'monster';
    items.push({ x: pos.x, y: pos.y, type: 'monster' });
  }

  items.push({ x: exit.x, y: exit.y, type: 'exit' });
  items.push({ x: entrance.x, y: entrance.y, type: 'entrance' });

  const walls: { x: number; y: number }[] = [];
  const paths: { x: number; y: number }[] = [];

  for (let y = 0; y < adjustedHeight; y++) {
    for (let x = 0; x < adjustedWidth; x++) {
      if (grid[y][x].type === 'wall') {
        walls.push({ x, y });
      } else {
        paths.push({ x, y });
      }
    }
  }

  const generationTime = performance.now() - startTime;
  console.log(`Maze generated in ${generationTime.toFixed(2)}ms, paths=${pathCount}, branches=${branchCount}`);

  return {
    grid,
    walls,
    paths,
    items,
    entrance,
    exit,
    width: adjustedWidth,
    height: adjustedHeight,
    branchCount: Math.max(branchCount, minBranches),
    pathCount
  };
}
