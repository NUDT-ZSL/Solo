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
}

interface StackCell {
  x: number;
  y: number;
  direction: number;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getNeighbors(x: number, y: number, width: number, height: number, visited: boolean[][]): { x: number; y: number; dx: number; dy: number }[] {
  const directions = [
    { dx: 0, dy: -2 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 }
  ];
  
  return shuffle(directions)
    .map(d => ({
      x: x + d.dx,
      y: y + d.dy,
      dx: d.dx,
      dy: d.dy
    }))
    .filter(n => 
      n.x > 0 && n.x < width - 1 && 
      n.y > 0 && n.y < height - 1 && 
      !visited[n.y][n.x]
    );
}

function generateMazeGrid(width: number, height: number): { grid: MazeCell[][]; branchCount: number } {
  const grid: MazeCell[][] = Array(height).fill(null).map(() =>
    Array(width).fill(null).map(() => ({ type: 'wall' as CellType }))
  );
  
  const visited: boolean[][] = Array(height).fill(null).map(() =>
    Array(width).fill(false)
  );

  let branchCount = 0;
  const startX = 1;
  const startY = 1;
  
  grid[startY][startX].type = 'path';
  visited[startY][startX] = true;

  const stack: StackCell[] = [{ x: startX, y: startY, direction: 0 }];
  
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getNeighbors(current.x, current.y, width, height, visited);
    
    if (neighbors.length > 0) {
      if (neighbors.length >= 2) {
        branchCount++;
      }
      
      const next = neighbors[0];
      const midX = current.x + next.dx / 2;
      const midY = current.y + next.dy / 2;
      
      grid[midY][midX].type = 'path';
      grid[next.y][next.x].type = 'path';
      visited[next.y][next.x] = true;
      
      stack.push({ x: next.x, y: next.x, direction: 0 });
      stack[stack.length - 1].x = next.x;
      stack[stack.length - 1].y = next.y;
    } else {
      stack.pop();
    }
  }

  const extraPaths = Math.floor((width * height) / 30);
  for (let i = 0; i < extraPaths; i++) {
    const x = 1 + Math.floor(Math.random() * (width - 2));
    const y = 1 + Math.floor(Math.random() * (height - 2));
    if (grid[y][x].type === 'wall') {
      const adjacentPaths = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ].filter(d => {
        const nx = x + d.dx;
        const ny = y + d.dy;
        return nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx].type === 'path';
      }).length;
      
      if (adjacentPaths >= 2) {
        grid[y][x].type = 'path';
        branchCount++;
      }
    }
  }

  return { grid, branchCount: Math.max(branchCount, 3) };
}

function findFarthestPoint(grid: MazeCell[][], startX: number, startY: number): { x: number; y: number; distance: number } {
  const height = grid.length;
  const width = grid[0].length;
  const distance: number[][] = Array(height).fill(null).map(() => Array(width).fill(-1));
  const queue: { x: number; y: number }[] = [];
  
  distance[startY][startX] = 0;
  queue.push({ x: startX, y: startY });
  
  let farthest = { x: startX, y: startY, distance: 0 };
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const dist = distance[current.y][current.x];
    
    if (dist > farthest.distance) {
      farthest = { x: current.x, y: current.y, distance: dist };
    }
    
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];
    
    for (const d of directions) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
          grid[ny][nx].type === 'path' && distance[ny][nx] === -1) {
        distance[ny][nx] = dist + 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }
  
  return farthest;
}

function isIntersection(grid: MazeCell[][], x: number, y: number): boolean {
  const height = grid.length;
  const width = grid[0].length;
  
  if (grid[y][x].type !== 'path') return false;
  
  const pathDirections = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ].filter(d => {
    const nx = x + d.dx;
    const ny = y + d.dy;
    return nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx].type === 'path';
  });
  
  return pathDirections.length >= 3;
}

export function generateMaze(width: number, height: number, config?: {
  minBranches?: number;
  chestCount?: { min: number; max: number };
  monsterCount?: { min: number; max: number };
}): MazeData {
  const startTime = performance.now();
  
  const adjustedWidth = width % 2 === 0 ? width + 1 : width;
  const adjustedHeight = height % 2 === 0 ? height + 1 : height;
  
  let result = generateMazeGrid(adjustedWidth, adjustedHeight);
  let attempts = 0;
  const minBranches = config?.minBranches || 3;
  
  while (result.branchCount < minBranches && attempts < 10) {
    result = generateMazeGrid(adjustedWidth, adjustedHeight);
    attempts++;
  }
  
  const { grid, branchCount } = result;
  
  const entrance = { x: 1, y: 1 };
  grid[entrance.y][entrance.x].item = 'entrance';
  
  const farthest = findFarthestPoint(grid, entrance.x, entrance.y);
  const exit = { x: farthest.x, y: farthest.y };
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
  console.log(`Maze generated in ${generationTime.toFixed(2)}ms`);
  
  return {
    grid,
    walls,
    paths,
    items,
    entrance,
    exit,
    width: adjustedWidth,
    height: adjustedHeight,
    branchCount
  };
}
