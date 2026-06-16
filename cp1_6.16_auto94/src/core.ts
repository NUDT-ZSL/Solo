import { TileType, Direction, Position, Tile, Player, Monster, Torch, BSPNode } from './types';

export const MAP_SIZE = 15;
export const TILE_SIZE = 32;
export const INITIAL_LIGHT_RADIUS = 5;
export const TORCH_BONUS_RADIUS = 2;
export const TORCH_DURATION = 15;
export const MONSTER_COUNT = 4;
export const TORCH_COUNT = 3;

export function generateBSPDungeon(size: number): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < size; y++) {
    map[y] = [];
    for (let x = 0; x < size; x++) {
      map[y][x] = {
        type: TileType.WALL,
        x,
        y,
        visible: false,
        explored: false,
        brightness: 0
      };
    }
  }

  const root: BSPNode = { x: 0, y: 0, width: size, height: size };
  splitNode(root, 0);
  createRooms(root, map);
  connectRooms(root, map);

  return map;
}

function splitNode(node: BSPNode, depth: number): void {
  if (depth > 4) return;
  if (node.width < 6 && node.height < 6) return;

  const splitHorizontal = node.width > node.height 
    ? Math.random() < 0.3 
    : Math.random() < 0.7;

  if (splitHorizontal && node.height >= 6) {
    const splitY = node.y + 3 + Math.floor(Math.random() * (node.height - 6));
    node.left = { x: node.x, y: node.y, width: node.width, height: splitY - node.y };
    node.right = { x: node.x, y: splitY, width: node.width, height: node.y + node.height - splitY };
  } else if (node.width >= 6) {
    const splitX = node.x + 3 + Math.floor(Math.random() * (node.width - 6));
    node.left = { x: node.x, y: node.y, width: splitX - node.x, height: node.height };
    node.right = { x: splitX, y: node.y, width: node.x + node.width - splitX, height: node.height };
  } else {
    return;
  }

  splitNode(node.left!, depth + 1);
  splitNode(node.right!, depth + 1);
}

function createRooms(node: BSPNode, map: Tile[][]): void {
  if (node.left || node.right) {
    if (node.left) createRooms(node.left, map);
    if (node.right) createRooms(node.right, map);
  } else {
    const roomWidth = Math.max(3, Math.min(node.width - 2, 5 + Math.floor(Math.random() * 3)));
    const roomHeight = Math.max(3, Math.min(node.height - 2, 5 + Math.floor(Math.random() * 3)));
    const roomX = node.x + 1 + Math.floor(Math.random() * (node.width - roomWidth - 1));
    const roomY = node.y + 1 + Math.floor(Math.random() * (node.height - roomHeight - 1));

    node.room = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };

    for (let y = roomY; y < roomY + roomHeight; y++) {
      for (let x = roomX; x < roomX + roomWidth; x++) {
        if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
          map[y][x].type = TileType.FLOOR;
        }
      }
    }
  }
}

function connectRooms(node: BSPNode, map: Tile[][]): void {
  if (node.left && node.right) {
    const leftRoom = getLeafRoom(node.left);
    const rightRoom = getLeafRoom(node.right);

    if (leftRoom && rightRoom) {
      const leftCenter = {
        x: Math.floor(leftRoom.x + leftRoom.width / 2),
        y: Math.floor(leftRoom.y + leftRoom.height / 2)
      };
      const rightCenter = {
        x: Math.floor(rightRoom.x + rightRoom.width / 2),
        y: Math.floor(rightRoom.y + rightRoom.height / 2)
      };

      createCorridor(leftCenter, rightCenter, map);
    }

    connectRooms(node.left, map);
    connectRooms(node.right, map);
  }
}

function getLeafRoom(node: BSPNode): BSPNode['room'] {
  if (node.room) return node.room;
  if (node.left) return getLeafRoom(node.left);
  if (node.right) return getLeafRoom(node.right);
  return undefined;
}

function createCorridor(start: Position, end: Position, map: Tile[][]): void {
  let x = start.x;
  let y = start.y;

  while (x !== end.x) {
    if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
      map[y][x].type = TileType.FLOOR;
      if (y + 1 < map.length) map[y + 1][x].type = TileType.FLOOR;
    }
    x += x < end.x ? 1 : -1;
  }

  while (y !== end.y) {
    if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
      map[y][x].type = TileType.FLOOR;
      if (x + 1 < map[0].length) map[y][x + 1].type = TileType.FLOOR;
    }
    y += y < end.y ? 1 : -1;
  }
}

export function findStartPosition(map: Tile[][]): Position {
  const center = Math.floor(MAP_SIZE / 2);
  const positions: Position[] = [];

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (map[y][x].type === TileType.FLOOR) {
        positions.push({ x, y });
      }
    }
  }

  positions.sort((a, b) => {
    const distA = Math.abs(a.x - center) + Math.abs(a.y - center);
    const distB = Math.abs(b.x - center) + Math.abs(b.y - center);
    return distA - distB;
  });

  return positions[0] || { x: center, y: center };
}

export function calculateVisibility(
  map: Tile[][],
  playerPos: Position,
  radius: number
): { visible: Set<string>; brightness: Map<string, number> } {
  const visible = new Set<string>();
  const brightness = new Map<string, number>();
  const centerX = playerPos.x + 0.5;
  const centerY = playerPos.y + 0.5;

  visible.add(`${playerPos.x},${playerPos.y}`);
  brightness.set(`${playerPos.x},${playerPos.y}`, 1.0);

  for (let i = 0; i < 8; i++) {
    castLight(map, centerX, centerY, 1, 1.0, 0.0, i, radius, visible, brightness);
  }

  return { visible, brightness };
}

function castLight(
  map: Tile[][],
  cx: number,
  cy: number,
  row: number,
  startSlope: number,
  endSlope: number,
  octant: number,
  radius: number,
  visible: Set<string>,
  brightness: Map<string, number>
): void {
  if (startSlope < endSlope) return;

  for (let y = row; y <= radius; y++) {
    let blocked = false;
    let newStart = startSlope;

    for (let x = -y; x <= 0; x++) {
      const lSlope = (x - 0.5) / (y + 0.5);
      const rSlope = (x + 0.5) / (y - 0.5);

      if (startSlope < rSlope) continue;
      if (endSlope > lSlope) break;

      const octantTable = [
        [1, 0, 0, 1], [0, 1, 1, 0], [0, -1, 1, 0], [-1, 0, 0, 1],
        [-1, 0, 0, -1], [0, -1, -1, 0], [0, 1, -1, 0], [1, 0, 0, -1]
      ];
      const [xx, xy, yx, yy] = octantTable[octant];
      
      const mapX = Math.floor(cx + x * xx + y * xy);
      const mapY = Math.floor(cy + x * yx + y * yy);

      if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) continue;

      const dist = Math.sqrt(x * x + y * y);
      if (dist <= radius) {
        const key = `${mapX},${mapY}`;
        visible.add(key);
        const brightnessValue = Math.max(0.6, 1 - (dist / radius) * 0.4);
        brightness.set(key, brightnessValue);
      }

      if (blocked) {
        if (map[mapY][mapX].type === TileType.WALL) {
          newStart = rSlope;
        } else {
          blocked = false;
          startSlope = newStart;
        }
      } else {
        if (map[mapY][mapX].type === TileType.WALL && y < radius) {
          blocked = true;
          castLight(map, cx, cy, y + 1, startSlope, lSlope, octant, radius, visible, brightness);
          newStart = rSlope;
        }
      }
    }

    if (blocked) break;
  }
}

export function findPath(
  map: Tile[][],
  start: Position,
  end: Position,
  maxSteps: number = 50
): Position[] {
  const openSet: { pos: Position; g: number; h: number; f: number; parent: Position | null }[] = [];
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, Position>();

  const heuristic = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  openSet.push({
    pos: start,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null
  });

  let steps = 0;
  while (openSet.length > 0 && steps < maxSteps) {
    steps++;
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = `${current.pos.x},${current.pos.y}`;

    if (current.pos.x === end.x && current.pos.y === end.y) {
      const path: Position[] = [];
      let pos: Position | null = current.pos;
      while (pos) {
        path.unshift(pos);
        const key: string = `${pos.x},${pos.y}`;
        pos = cameFrom.get(key) || null;
      }
      return path;
    }

    closedSet.add(currentKey);

    const neighbors = [
      { x: current.pos.x + 1, y: current.pos.y },
      { x: current.pos.x - 1, y: current.pos.y },
      { x: current.pos.x, y: current.pos.y + 1 },
      { x: current.pos.x, y: current.pos.y - 1 }
    ];

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(key)) continue;
      if (neighbor.x < 0 || neighbor.x >= MAP_SIZE || neighbor.y < 0 || neighbor.y >= MAP_SIZE) continue;
      if (map[neighbor.y][neighbor.x].type === TileType.WALL) continue;

      const g = current.g + 1;
      const h = heuristic(neighbor, end);
      const f = g + h;

      const existing = openSet.find(n => n.pos.x === neighbor.x && n.pos.y === neighbor.y);
      if (!existing || g < existing.g) {
        if (existing) {
          existing.g = g;
          existing.f = f;
          existing.parent = current.pos;
        } else {
          openSet.push({ pos: neighbor, g, h, f, parent: current.pos });
        }
        cameFrom.set(key, current.pos);
      }
    }
  }

  return [];
}

export function movePlayer(
  player: Player,
  direction: Direction,
  map: Tile[][]
): Position {
  const newPos = { ...player.position };

  switch (direction) {
    case Direction.UP:
      newPos.y -= 1;
      break;
    case Direction.DOWN:
      newPos.y += 1;
      break;
    case Direction.LEFT:
      newPos.x -= 1;
      break;
    case Direction.RIGHT:
      newPos.x += 1;
      break;
  }

  if (
    newPos.x >= 0 &&
    newPos.x < MAP_SIZE &&
    newPos.y >= 0 &&
    newPos.y < MAP_SIZE &&
    map[newPos.y][newPos.x].type === TileType.FLOOR
  ) {
    return newPos;
  }

  return player.position;
}

export function pickUpTorch(
  player: Player,
  torches: Torch[]
): { player: Player; torches: Torch[]; pickedUp: boolean } {
  const newTorches = [...torches];
  let pickedUp = false;

  for (let i = 0; i < newTorches.length; i++) {
    const torch = newTorches[i];
    if (
      !torch.pickedUp &&
      torch.position.x === player.position.x &&
      torch.position.y === player.position.y
    ) {
      newTorches[i] = { ...torch, pickedUp: true };
      pickedUp = true;
      break;
    }
  }

  if (pickedUp) {
    return {
      player: {
        ...player,
        torchesPickedUp: player.torchesPickedUp + 1,
        torchTimer: TORCH_DURATION,
        lightRadius: player.baseLightRadius + TORCH_BONUS_RADIUS
      },
      torches: newTorches,
      pickedUp: true
    };
  }

  return { player, torches, pickedUp: false };
}

export function updateTorchTimer(player: Player): Player {
  if (player.torchTimer > 0) {
    const newTimer = player.torchTimer - 1;
    return {
      ...player,
      torchTimer: newTimer,
      lightRadius: newTimer > 0 ? player.lightRadius : player.baseLightRadius
    };
  }
  return player;
}

export function placeRandomItems(
  map: Tile[][],
  playerPos: Position,
  count: number
): Position[] {
  const positions: Position[] = [];
  const available: Position[] = [];

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (
        map[y][x].type === TileType.FLOOR &&
        !(x === playerPos.x && y === playerPos.y)
      ) {
        const dist = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
        if (dist >= 3) {
          available.push({ x, y });
        }
      }
    }
  }

  for (let i = 0; i < count && available.length > 0; i++) {
    const index = Math.floor(Math.random() * available.length);
    positions.push(available.splice(index, 1)[0]);
  }

  return positions;
}

export function moveMonsters(
  monsters: Monster[],
  playerPos: Position,
  map: Tile[][]
): { monsters: Monster[]; battleMonsterId: number | null } {
  const newMonsters = monsters.map(m => ({ ...m, path: [...m.path] }));
  let battleMonsterId: number | null = null;

  for (let i = 0; i < newMonsters.length; i++) {
    const monster = newMonsters[i];
    if (!monster.alive) continue;

    monster.moveCounter++;
    if (monster.moveCounter < 2) continue;
    monster.moveCounter = 0;

    const path = findPath(map, monster.position, playerPos, 20);
    monster.path = path.slice(1, 6);

    if (path.length > 1) {
      const nextPos = path[1];
      monster.position = nextPos;

      if (nextPos.x === playerPos.x && nextPos.y === playerPos.y) {
        battleMonsterId = monster.id;
      }
    }
  }

  return { monsters: newMonsters, battleMonsterId };
}

export function isInLight(
  pos: Position,
  playerPos: Position,
  lightRadius: number
): boolean {
  const dist = Math.sqrt(
    Math.pow(pos.x - playerPos.x, 2) + Math.pow(pos.y - playerPos.y, 2)
  );
  return dist <= lightRadius;
}

export function updateExploredCount(
  map: Tile[][],
  visibleTiles: Set<string>,
  currentCount: number
): { map: Tile[][]; count: number } {
  const newMap = map.map(row => row.map(tile => ({ ...tile })));
  let newCount = currentCount;

  visibleTiles.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    if (!newMap[y][x].explored) {
      newMap[y][x].explored = true;
      if (newMap[y][x].type === TileType.FLOOR) {
        newCount++;
      }
    }
  });

  return { map: newMap, count: newCount };
}

export function checkWinCondition(
  exploredCount: number,
  monsters: Monster[],
  totalFloor: number
): boolean {
  const allExplored = exploredCount >= totalFloor;
  const allMonstersDefeated = monsters.every(m => !m.alive);
  return allExplored && allMonstersDefeated;
}

export function countFloorTiles(map: Tile[][]): number {
  let count = 0;
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (map[y][x].type === TileType.FLOOR) {
        count++;
      }
    }
  }
  return count;
}
