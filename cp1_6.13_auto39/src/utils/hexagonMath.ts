export type HexCoord = { q: number; r: number };

export const HEX_RADIUS = 40;

const SQRT3 = Math.sqrt(3);

export function hexToPixel(coord: HexCoord): { x: number; y: number } {
  const { q, r } = coord;
  const x = HEX_RADIUS * SQRT3 * (q + r / 2);
  const y = HEX_RADIUS * 1.5 * r;
  return { x, y };
}

export function pixelToHex(x: number, y: number): HexCoord {
  const q = (SQRT3 / 3 * x - 1 / 3 * y) / HEX_RADIUS;
  const r = (2 / 3 * y) / HEX_RADIUS;
  return hexRound({ q, r });
}

function hexRound(coord: HexCoord): HexCoord {
  let { q, r } = coord;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function getNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((dir) => ({
    q: coord.q + dir.q,
    r: coord.r + dir.r,
  }));
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export type TerrainMap = Record<
  string,
  { type: string; moveCost: number; passable: boolean }
>;

interface AStarNode {
  coord: HexCoord;
  g: number;
  f: number;
  parent: AStarNode | null;
}

export function aStar(
  start: HexCoord,
  goal: HexCoord,
  terrain: TerrainMap,
  maxCost: number
): HexCoord[] | null {
  const startKey = hexKey(start);
  const goalKey = hexKey(goal);

  if (startKey === goalKey) {
    return [];
  }

  const goalTerrain = terrain[goalKey];
  if (!goalTerrain || !goalTerrain.passable) {
    return null;
  }

  const openMap: Map<string, AStarNode> = new Map();
  const closedSet: Set<string> = new Set();

  const startNode: AStarNode = {
    coord: start,
    g: 0,
    f: hexDistance(start, goal),
    parent: null,
  };
  openMap.set(startKey, startNode);

  while (openMap.size > 0) {
    let currentKey: string | null = null;
    let currentNode: AStarNode | null = null;
    for (const [key, node] of openMap) {
      if (!currentNode || node.f < currentNode.f) {
        currentKey = key;
        currentNode = node;
      }
    }

    if (!currentKey || !currentNode) {
      break;
    }

    if (currentKey === goalKey) {
      const path: HexCoord[] = [];
      let node: AStarNode | null = currentNode;
      while (node && node.parent) {
        path.unshift(node.coord);
        node = node.parent;
      }
      return path;
    }

    openMap.delete(currentKey);
    closedSet.add(currentKey);

    const neighbors = getNeighbors(currentNode.coord);
    for (const neighbor of neighbors) {
      const nKey = hexKey(neighbor);
      if (closedSet.has(nKey)) {
        continue;
      }

      const nTerrain = terrain[nKey];
      if (!nTerrain || !nTerrain.passable) {
        continue;
      }

      const moveCost = nTerrain.moveCost;
      if (moveCost === Infinity) {
        continue;
      }

      const tentativeG = currentNode.g + moveCost;
      if (tentativeG > maxCost) {
        continue;
      }

      const existing = openMap.get(nKey);
      if (existing && tentativeG >= existing.g) {
        continue;
      }

      openMap.set(nKey, {
        coord: neighbor,
        g: tentativeG,
        f: tentativeG + hexDistance(neighbor, goal),
        parent: currentNode,
      });
    }
  }

  return null;
}
