import { Wall, Point, Exhibit } from '@/types';

const GRID_SIZE = 20;
const PATH_WIDTH = 4;

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function heuristic(a: Node, b: Node): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node: Node, gridWidth: number, gridHeight: number): Node[] {
  const neighbors: Node[] = [];
  const dirs = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
    { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
  ];

  for (const dir of dirs) {
    const nx = node.x + dir.x;
    const ny = node.y + dir.y;
    if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
      neighbors.push({ x: nx, y: ny, g: 0, h: 0, f: 0, parent: null });
    }
  }

  return neighbors;
}

function isWallAt(gridX: number, gridY: number, walls: Wall[]): boolean {
  const px = gridX * GRID_SIZE;
  const py = gridY * GRID_SIZE;
  const margin = PATH_WIDTH / 2;

  for (const wall of walls) {
    if (wall.shape === 'rectangle') {
      if (px + GRID_SIZE > wall.x - margin &&
          px < wall.x + wall.width + margin &&
          py + GRID_SIZE > wall.y - margin &&
          py < wall.y + wall.height + margin) {
        return true;
      }
    } else if (wall.shape === 'L-shape') {
      const sw = wall.lShapeSecondWidth || wall.width;
      const sh = wall.lShapeSecondHeight || wall.height;
      if ((px + GRID_SIZE > wall.x - margin &&
           px < wall.x + wall.width + margin &&
           py + GRID_SIZE > wall.y - margin &&
           py < wall.y + wall.height + margin) ||
          (px + GRID_SIZE > wall.x + wall.width - sw - margin &&
           px < wall.x + wall.width + margin &&
           py + GRID_SIZE > wall.y + wall.height - margin &&
           py < wall.y + wall.height + sh + margin)) {
        return true;
      }
    } else if (wall.shape === 'arc') {
      const radius = wall.arcRadius || 100;
      const startAngle = wall.arcStartAngle || 0;
      const endAngle = wall.arcEndAngle || Math.PI;
      const cx = wall.x + radius;
      const cy = wall.y + radius;
      const thickness = wall.height;

      for (let dx = 0; dx <= GRID_SIZE; dx += GRID_SIZE / 2) {
        for (let dy = 0; dy <= GRID_SIZE; dy += GRID_SIZE / 2) {
          const testX = px + dx;
          const testY = py + dy;
          const dist = Math.sqrt((testX - cx) ** 2 + (testY - cy) ** 2);
          const angle = Math.atan2(testY - cy, testX - cx);
          const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
          const normStart = startAngle < 0 ? startAngle + 2 * Math.PI : startAngle;
          const normEnd = endAngle < 0 ? endAngle + 2 * Math.PI : endAngle;

          if (dist >= radius - thickness / 2 - margin &&
              dist <= radius + thickness / 2 + margin) {
            if (normStart <= normEnd) {
              if (normalizedAngle >= normStart && normalizedAngle <= normEnd) {
                return true;
              }
            } else {
              if (normalizedAngle >= normStart || normalizedAngle <= normEnd) {
                return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
}

export function findPath(
  walls: Wall[],
  entrance: Point,
  exit: Point,
  canvasWidth: number,
  canvasHeight: number
): Point[] {
  const gridWidth = Math.ceil(canvasWidth / GRID_SIZE);
  const gridHeight = Math.ceil(canvasHeight / GRID_SIZE);

  const startNode: Node = {
    x: Math.floor(entrance.x / GRID_SIZE),
    y: Math.floor(entrance.y / GRID_SIZE),
    g: 0,
    h: 0,
    f: 0,
    parent: null
  };

  const endNode: Node = {
    x: Math.floor(exit.x / GRID_SIZE),
    y: Math.floor(exit.y / GRID_SIZE),
    g: 0,
    h: 0,
    f: 0,
    parent: null
  };

  const openSet: Node[] = [startNode];
  const closedSet: Set<string> = new Set();
  const nodeMap: Map<string, Node> = new Map();

  nodeMap.set(`${startNode.x},${startNode.y}`, startNode);

  while (openSet.length > 0) {
    let current = openSet[0];
    let currentIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < current.f) {
        current = openSet[i];
        currentIndex = i;
      }
    }

    if (current.x === endNode.x && current.y === endNode.y) {
      const path: Point[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({
          x: node.x * GRID_SIZE + GRID_SIZE / 2,
          y: node.y * GRID_SIZE + GRID_SIZE / 2
        });
        node = node.parent;
      }
      return smoothPath(path);
    }

    openSet.splice(currentIndex, 1);
    closedSet.add(`${current.x},${current.y}`);

    const neighbors = getNeighbors(current, gridWidth, gridHeight);

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;

      if (closedSet.has(key) || isWallAt(neighbor.x, neighbor.y, walls)) {
        continue;
      }

      const moveCost = (neighbor.x !== current.x && neighbor.y !== current.y) ? Math.SQRT2 : 1;
      const tentativeG = current.g + moveCost;

      let existingNode = nodeMap.get(key);

      if (!existingNode) {
        existingNode = neighbor;
        nodeMap.set(key, existingNode);
      }

      if (tentativeG < existingNode.g || !openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
        existingNode.g = tentativeG;
        existingNode.h = heuristic(existingNode, endNode);
        existingNode.f = existingNode.g + existingNode.h;
        existingNode.parent = current;

        if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(existingNode);
        }
      }
    }
  }

  return [];
}

function smoothPath(path: Point[]): Point[] {
  if (path.length < 3) return path;

  const result: Point[] = [path[0]];
  let i = 0;

  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1) {
      if (canWalkStraight(path[i], path[j])) {
        break;
      }
      j--;
    }
    result.push(path[j]);
    i = j;
  }

  return result;
}

function canWalkStraight(p1: Point, p2: Point): boolean {
  return true;
}

export function calculatePathLength(path: Point[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

export function calculateVisibilityScores(
  path: Point[],
  exhibits: Exhibit[],
  walls: Wall[]
): { exhibitId: string; visibility: number }[] {
  return exhibits.map(exhibit => {
    let visibleCount = 0;
    const sampleInterval = 50;
    let totalSamples = 0;

    const exhibitCenter = {
      x: exhibit.x + exhibit.width / 2,
      y: exhibit.y + exhibit.height / 2
    };

    for (let i = 0; i < path.length - 1; i++) {
      const segmentLength = Math.sqrt(
        (path[i + 1].x - path[i].x) ** 2 + (path[i + 1].y - path[i].y) ** 2
      );
      const samplesInSegment = Math.max(1, Math.floor(segmentLength / sampleInterval));

      for (let s = 0; s < samplesInSegment; s++) {
        const t = s / samplesInSegment;
        const samplePoint = {
          x: path[i].x + (path[i + 1].x - path[i].x) * t,
          y: path[i].y + (path[i + 1].y - path[i].y) * t
        };

        if (isLineOfSightClear(samplePoint, exhibitCenter, walls)) {
          visibleCount++;
        }
        totalSamples++;
      }
    }

    return {
      exhibitId: exhibit.id,
      visibility: totalSamples > 0 ? Math.round((visibleCount / totalSamples) * 100) : 0
    };
  });
}

function isLineOfSightClear(p1: Point, p2: Point, walls: Wall[]): boolean {
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = p1.x + (p2.x - p1.x) * t;
    const py = p1.y + (p2.y - p1.y) * t;

    for (const wall of walls) {
      if (wall.shape === 'rectangle') {
        if (px >= wall.x && px <= wall.x + wall.width &&
            py >= wall.y && py <= wall.y + wall.height) {
          return false;
        }
      }
    }
  }
  return true;
}

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export const GRID_SIZE_CONST = GRID_SIZE;
