import { Position } from '../types';
import { TileType } from '../types';

interface Node {
  position: Position;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

const heuristic = (a: Position, b: Position): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const getNeighbors = (pos: Position, map: TileType[][]): Position[] => {
  const neighbors: Position[] = [];
  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ];

  for (const dir of directions) {
    const newX = pos.x + dir.x;
    const newY = pos.y + dir.y;

    if (
      newX >= 0 &&
      newX < map[0].length &&
      newY >= 0 &&
      newY < map.length &&
      map[newY][newX] !== 'wall'
    ) {
      neighbors.push({ x: newX, y: newY });
    }
  }

  return neighbors;
};

export const findPath = (
  start: Position,
  end: Position,
  map: TileType[][]
): Position[] => {
  if (start.x === end.x && start.y === end.y) {
    return [];
  }

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    position: start,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null
  };

  openList.push(startNode);

  const maxIterations = 500;
  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    if (current.position.x === end.x && current.position.y === end.y) {
      const path: Position[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift(node.position);
        node = node.parent;
      }
      return path.slice(1);
    }

    closedSet.add(`${current.position.x},${current.position.y}`);

    const neighbors = getNeighbors(current.position, map);

    for (const neighborPos of neighbors) {
      const key = `${neighborPos.x},${neighborPos.y}`;
      if (closedSet.has(key)) continue;

      const tentativeG = current.g + 1;

      const existingNode = openList.find(
        n => n.position.x === neighborPos.x && n.position.y === neighborPos.y
      );

      if (!existingNode) {
        const h = heuristic(neighborPos, end);
        const newNode: Node = {
          position: neighborPos,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current
        };
        openList.push(newNode);
      } else if (tentativeG < existingNode.g) {
        existingNode.g = tentativeG;
        existingNode.f = tentativeG + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  return [];
};

export const getNextStepTowards = (
  start: Position,
  end: Position,
  map: TileType[][]
): Position | null => {
  const path = findPath(start, end, map);
  if (path.length > 0) {
    return path[0];
  }
  return null;
};
