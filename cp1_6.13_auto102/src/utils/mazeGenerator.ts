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

interface StackCell {
  x: number;
  y: number;
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

function isWall(grid: MazeCell[][], x: number, y: number): boolean {
  const height = grid.length;
  const width = grid[0].length;
  return x < 0 || x >= width || y < 0 || y >= height || grid[y][x].type === 'wall';
}

function getUnvisitedNeighbors(
  grid: MazeCell[][],
  x: number,
  y: number,
  visited: boolean[][]
): { x: number; y: number; dx: number; dy: number }[] {
  const height = grid.length;
  const width = grid[0].length;
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
      isWall(grid, n.x, n.y) && 
      !visited[n.y][n.x]
    );
}

function recursiveBacktracker(
  grid: MazeCell[][],
  startX: number,
  startY: number,
  visited: boolean[][]
): void {
  const stack: StackCell[] = [{ x: startX, y: startY }];
  visited[startY][startX] = true;
  carvePassage(grid, startX, startY);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(grid, current.x, current.y, visited);

    if (neighbors.length > 0) {
      const next = neighbors[0];
      const midX = current.x + next.dx / 2;
      const midY = current.y + next.dy / 2;

      carvePassage(grid, midX, midY);
      carvePassage(grid, next.x, next.y);
      visited[next.y][next.x] = true;

      stack.push({ x: next.x, y: next.y });
    } else {
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

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dist = distance[current.y][current.x];

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

  return distance;
}

function findFarthestPoint(
  distance: number[][],
  excludePoints: { x: number; y: number }[] = []
): { x: number; y: number; distance: number } {
  const height = distance.length;
  const width = distance[0].length;
  let farthest = { x: 0, y: 0, distance: -1 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isExcluded = excludePoints.some(p => p.x === x && p.y === y);
      if (distance[y][x] > farthest.distance && !isExcluded) {
        farthest = { x, y, distance: distance[y][x] };
      }
    }
  }

  return farthest;
}

function countEdgeDisjointPaths(
  grid: MazeCell[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  maxPaths: number = 5
): number {
  const height = grid.length;
  const width = grid[0].length;
  let pathCount = 0;

  const tempGrid: MazeCell[][] = grid.map(row => row.map(cell => ({ ...cell })));

  while (pathCount < maxPaths) {
    const parent: { x: number; y: number }[][] = Array(height).fill(null).map(() =>
      Array(width).fill(null)
    );
    const visited: boolean[][] = Array(height).fill(null).map(() =>
      Array(width).fill(false)
    );

    const queue: { x: number; y: number }[] = [];
    queue.push({ x: startX, y: startY });
    visited[startY][startX] = true;

    let found = false;

    while (queue.length > 0 && !found) {
      const current = queue.shift()!;

      if (current.x === endX && current.y === endY) {
        found = true;
        break;
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
            !visited[ny][nx] && tempGrid[ny][nx].type === 'path') {
          visited[ny][nx] = true;
          parent[ny][nx] = { x: current.x, y: current.y };
          queue.push({ x: nx, y: ny });
        }
      }
    }

    if (!found) break;

    let cx = endX;
    let cy = endY;
    while (!(cx === startX && cy === startY)) {
      const p = parent[cy][cx];
      if (!p) break;
      if (!(cx === endX && cy === endY) && !(cx === startX && cy === startY)) {
        tempGrid[cy][cx].type = 'wall';
      }
      cx = p.x;
      cy = p.y;
    }

    pathCount++;
  }

  return pathCount;
}

function createAdditionalPaths(
  grid: MazeCell[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  minPaths: number = 3
): void {
  const height = grid.length;
  const width = grid[0].length;

  let pathCount = countEdgeDisjointPaths(grid, startX, startY, endX, endY);
  let attempts = 0;
  const maxAttempts = 50;

  while (pathCount < minPaths && attempts < maxAttempts) {
    const wallsToTest: { x: number; y: number }[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (grid[y][x].type === 'wall') {
          const adjacentPaths = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
          ].filter(d => {
            const nx = x + d.dx;
            const ny = y + d.dy;
            return nx >= 0 && nx < width && ny >= 0 && ny < height &&
                   grid[ny][nx].type === 'path';
          }).length;

          if (adjacentPaths >= 2) {
            wallsToTest.push({ x, y });
          }
        }
      }
    }

    let opened = false;
    for (const wall of shuffle(wallsToTest)) {
      grid[wall.y][wall.x].type = 'path';
      const newPathCount = countEdgeDisjointPaths(grid, startX, startY, endX, endY);

      if (newPathCount > pathCount) {
        pathCount = newPathCount;
        opened = true;
        if (pathCount >= minPaths) break;
      } else {
        grid[wall.y][wall.x].type = 'wall';
      }
    }

    if (!opened) {
      const distFromStart = bfsDistance(grid, startX, startY);
      const distFromEnd = bfsDistance(grid, endX, endY);
      const targetDistance = distFromStart[endY][endX] * 0.5;

      let bestWall: { x: number; y: number } | null = null;
      let bestScore = Infinity;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (grid[y][x].type === 'wall') {
            const adjacentPaths = [
              { dx: 1, dy: 0 },
              { dx: -1, dy: 0 },
              { dx: 0, dy: 1 },
              { dx: 0, dy: -1 }
            ].filter(d => {
              const nx = x + d.dx;
              const ny = y + d.dy;
              return nx >= 0 && nx < width && ny >= 0 && ny < height &&
                     grid[ny][nx].type === 'path';
            }).length;

            if (adjacentPaths >= 2) {
              const d1 = distFromStart[y][x] === -1 ? Infinity : distFromStart[y][x];
              const d2 = distFromEnd[y][x] === -1 ? Infinity : distFromEnd[y][x];
              const score = Math.abs(d1 + d2 - targetDistance);

              if (score < bestScore) {
                bestScore = score;
                bestWall = { x, y };
              }
            }
          }
        }
      }

      if (bestWall) {
        grid[bestWall.y][bestWall.x].type = 'path';
        pathCount = countEdgeDisjointPaths(grid, startX, startY, endX, endY);
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

  let grid: MazeCell[][] = [];
  let entrance = { x: 1, y: 1 };
  let exit = { x: adjustedWidth - 2, y: adjustedHeight - 2 };
  let pathCount = 0;
  let branchCount = 0;
  let attempts = 0;

  while ((pathCount < minPaths || branchCount < minBranches) && attempts < 20) {
    grid = createEmptyGrid(adjustedWidth, adjustedHeight);
    const visited: boolean[][] = Array(adjustedHeight).fill(null).map(() =>
      Array(adjustedWidth).fill(false)
    );

    recursiveBacktracker(grid, 1, 1, visited);

    const distFromStart = bfsDistance(grid, 1, 1);
    const farthest = findFarthestPoint(distFromStart);
    exit = { x: farthest.x, y: farthest.y };

    createAdditionalPaths(grid, 1, 1, exit.x, exit.y, minPaths);

    pathCount = countEdgeDisjointPaths(grid, 1, 1, exit.x, exit.y);
    branchCount = countBranches(grid);
    attempts++;

    console.log(`Attempt ${attempts}: paths=${pathCount}, branches=${branchCount}`);
  }

  entrance = { x: 1, y: 1 };
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
    branchCount,
    pathCount
  };
}
