import {
  Tile,
  TileType,
  Position,
  Player,
  Monster,
  Torch,
  VisibleTile,
  GameState,
  Direction
} from './types';

export const MAP_SIZE = 15;
export const TILE_SIZE = 32;
export const DEFAULT_LIGHT_RADIUS = 5;
export const TORCH_LIGHT_BONUS = 2;
export const TORCH_DURATION = 15;
export const PLAYER_MAX_HP = 10;
export const TOTAL_TILES = MAP_SIZE * MAP_SIZE;

// ============================================================
// BSP 迷宫生成
// ============================================================
class BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left: BSPNode | null = null;
  right: BSPNode | null = null;
  room: { x: number; y: number; w: number; h: number } | null = null;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  isLeaf(): boolean {
    return this.left === null && this.right === null;
  }
}

function splitNode(node: BSPNode, depth: number, minSize: number, maxDepth: number): void {
  if (depth >= maxDepth) return;
  if (node.w < minSize * 2 && node.h < minSize * 2) return;

  const horizontal = decideSplitDirection(node);
  let splitPos: number;

  if (horizontal) {
    const minSplit = minSize;
    const maxSplit = node.h - minSize;
    if (maxSplit <= minSplit) return;
    splitPos = minSplit + Math.floor(Math.random() * (maxSplit - minSplit + 1));
    node.left = new BSPNode(node.x, node.y, node.w, splitPos);
    node.right = new BSPNode(node.x, node.y + splitPos, node.w, node.h - splitPos);
  } else {
    const minSplit = minSize;
    const maxSplit = node.w - minSize;
    if (maxSplit <= minSplit) return;
    splitPos = minSplit + Math.floor(Math.random() * (maxSplit - minSplit + 1));
    node.left = new BSPNode(node.x, node.y, splitPos, node.h);
    node.right = new BSPNode(node.x + splitPos, node.y, node.w - splitPos, node.h);
  }

  splitNode(node.left!, depth + 1, minSize, maxDepth);
  splitNode(node.right!, depth + 1, minSize, maxDepth);
}

function decideSplitDirection(node: BSPNode): boolean {
  const ratio = node.w / node.h;
  if (ratio > 1.25) return false;
  if (ratio < 0.8) return true;
  return Math.random() < 0.5;
}

function createRoom(node: BSPNode): void {
  if (node.isLeaf()) {
    const padding = 1;
    const minRoomW = Math.max(2, Math.floor(node.w / 2));
    const minRoomH = Math.max(2, Math.floor(node.h / 2));
    const roomW = minRoomW + Math.floor(Math.random() * Math.max(1, node.w - minRoomW - padding * 2));
    const roomH = minRoomH + Math.floor(Math.random() * Math.max(1, node.h - minRoomH - padding * 2));
    const roomX = node.x + padding + Math.floor(Math.random() * Math.max(1, node.w - roomW - padding * 2));
    const roomY = node.y + padding + Math.floor(Math.random() * Math.max(1, node.h - roomH - padding * 2));
    node.room = { x: roomX, y: roomY, w: roomW, h: roomH };
  } else {
    if (node.left) createRoom(node.left);
    if (node.right) createRoom(node.right);
  }
}

function carveRoom(tiles: Tile[][], room: { x: number; y: number; w: number; h: number }): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (isInsideMap(x, y)) {
        tiles[y][x].type = TileType.FLOOR;
      }
    }
  }
}

function getLeafRoom(node: BSPNode): { x: number; y: number; w: number; h: number } | null {
  if (node.isLeaf()) return node.room;
  const leftRoom = node.left ? getLeafRoom(node.left) : null;
  if (leftRoom) return leftRoom;
  return node.right ? getLeafRoom(node.right) : null;
}

function carveCorridor(
  tiles: Tile[][],
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): void {
  const ax = a.x + Math.floor(a.w / 2);
  const ay = a.y + Math.floor(a.h / 2);
  const bx = b.x + Math.floor(b.w / 2);
  const by = b.y + Math.floor(b.h / 2);

  if (Math.random() < 0.5) {
    carveHorizontal(tiles, ax, bx, ay);
    carveVertical(tiles, ay, by, bx);
  } else {
    carveVertical(tiles, ay, by, ax);
    carveHorizontal(tiles, ax, bx, by);
  }
}

function carveHorizontal(tiles: Tile[][], x1: number, x2: number, y: number): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  for (let x = minX; x <= maxX; x++) {
    if (isInsideMap(x, y)) {
      tiles[y][x].type = TileType.FLOOR;
    }
  }
}

function carveVertical(tiles: Tile[][], y1: number, y2: number, x: number): void {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    if (isInsideMap(x, y)) {
      tiles[y][x].type = TileType.FLOOR;
    }
  }
}

function connectNodes(tiles: Tile[][], node: BSPNode): void {
  if (!node.isLeaf() && node.left && node.right) {
    connectNodes(tiles, node.left);
    connectNodes(tiles, node.right);
    const roomA = getLeafRoom(node.left);
    const roomB = getLeafRoom(node.right);
    if (roomA && roomB) {
      carveCorridor(tiles, roomA, roomB);
    }
  }
}

function isInsideMap(x: number, y: number): boolean {
  return x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE;
}

export function generateMazeBSP(): Tile[][] {
  const tiles: Tile[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      tiles[y][x] = { type: TileType.WALL, x, y };
    }
  }

  const root = new BSPNode(0, 0, MAP_SIZE, MAP_SIZE);
  splitNode(root, 0, 4, 4);
  createRoom(root);

  const leaves: BSPNode[] = [];
  function collectLeaves(n: BSPNode) {
    if (n.isLeaf()) leaves.push(n);
    else {
      if (n.left) collectLeaves(n.left);
      if (n.right) collectLeaves(n.right);
    }
  }
  collectLeaves(root);

  leaves.forEach((leaf) => {
    if (leaf.room) carveRoom(tiles, leaf.room);
  });

  connectNodes(tiles, root);

  return tiles;
}

export function findCenterFloor(tiles: Tile[][]): Position {
  const center = Math.floor(MAP_SIZE / 2);
  if (tiles[center][center].type === TileType.FLOOR) {
    return { x: center, y: center };
  }
  for (let r = 1; r < MAP_SIZE; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = center + dx;
        const y = center + dy;
        if (isInsideMap(x, y) && tiles[y][x].type === TileType.FLOOR) {
          return { x, y };
        }
      }
    }
  }
  return { x: center, y: center };
}

export function collectFloorTiles(tiles: Tile[][]): Position[] {
  const floors: Position[] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (tiles[y][x].type === TileType.FLOOR) {
        floors.push({ x, y });
      }
    }
  }
  return floors;
}

function posEq(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

// ============================================================
// 递归阴影投射 (Recursive Shadowcasting FOV)
// ============================================================
const MULTIPLIERS: number[][] = [
  [1, 0, 0, 1],
  [0, 1, -1, 0],
  [-1, 0, 0, -1],
  [0, -1, 1, 0],
  [1, 0, 0, -1],
  [0, 1, 1, 0],
  [-1, 0, 0, 1],
  [0, -1, -1, 0]
];

function isWall(tiles: Tile[][], x: number, y: number): boolean {
  if (!isInsideMap(x, y)) return true;
  return tiles[y][x].type === TileType.WALL;
}

function castLight(
  tiles: Tile[][],
  cx: number,
  cy: number,
  row: number,
  startSlope: number,
  endSlope: number,
  radius: number,
  xx: number,
  xy: number,
  yx: number,
  yy: number,
  visibleMap: Map<string, VisibleTile>,
  prevVisibleSet: Set<string>
): void {
  if (startSlope < endSlope) return;
  let nextStartSlope = startSlope;

  for (let i = row; i <= radius; i++) {
    let blocked = false;

    for (let dx = -i; dx <= 0; dx++) {
      const dy = -i;
      const mapX = cx + dx * xx + dy * xy;
      const mapY = cy + dx * yx + dy * yy;
      const lSlope = (dx - 0.5) / (dy + 0.5);
      const rSlope = (dx + 0.5) / (dy - 0.5);

      if (startSlope < rSlope) continue;
      if (endSlope > lSlope) break;

      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist <= radius && isInsideMap(mapX, mapY)) {
        const normDist = dist / radius;
        const brightness = 1.0 - normDist * 0.4;
        const key = `${mapX},${mapY}`;
        const wasVisible = prevVisibleSet.has(key);
        visibleMap.set(key, {
          x: mapX,
          y: mapY,
          brightness: Math.max(0.6, brightness),
          justBecameVisible: !wasVisible
        });
      }

      if (blocked) {
        if (isWall(tiles, mapX, mapY)) {
          nextStartSlope = rSlope;
        } else {
          blocked = false;
          startSlope = nextStartSlope;
        }
      } else if (isWall(tiles, mapX, mapY) && i < radius) {
        blocked = true;
        castLight(
          tiles, cx, cy, i + 1, startSlope, lSlope,
          radius, xx, xy, yx, yy, visibleMap, prevVisibleSet
        );
        nextStartSlope = rSlope;
      }
    }
    if (blocked) break;
  }
}

export function calculateFOV(
  tiles: Tile[][],
  player: Position,
  radius: number,
  prevVisibleSet: Set<string>
): Map<string, VisibleTile> {
  const visibleMap = new Map<string, VisibleTile>();
  const key = `${player.x},${player.y}`;
  const wasVisible = prevVisibleSet.has(key);
  visibleMap.set(key, {
    x: player.x,
    y: player.y,
    brightness: 1.0,
    justBecameVisible: !wasVisible
  });

  for (let oct = 0; oct < 8; oct++) {
    const [xx, xy, yx, yy] = MULTIPLIERS[oct];
    castLight(
      tiles, player.x, player.y, 1, 1.0, 0.0,
      radius, xx, xy, yx, yy, visibleMap, prevVisibleSet
    );
  }

  return visibleMap;
}

// ============================================================
// A* 寻路
// ============================================================
interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function aStarPathfind(
  tiles: Tile[][],
  start: Position,
  goal: Position,
  blocked: Set<string> = new Set()
): Position[] {
  if (posEq(start, goal)) return [];

  const open: AStarNode[] = [];
  const closed = new Set<string>();
  const openMap = new Map<string, AStarNode>();

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, goal),
    f: 0,
    parent: null
  };
  startNode.f = startNode.h;
  open.push(startNode);
  openMap.set(`${start.x},${start.y}`, startNode);

  const neighbors: [number, number][] = [
    [0, -1], [0, 1], [-1, 0], [1, 0]
  ];

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    openMap.delete(`${current.x},${current.y}`);
    closed.add(`${current.x},${current.y}`);

    if (current.x === goal.x && current.y === goal.y) {
      const path: Position[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      path.shift();
      return path;
    }

    for (const [dx, dy] of neighbors) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nkey = `${nx},${ny}`;

      if (!isInsideMap(nx, ny)) continue;
      if (tiles[ny][nx].type !== TileType.FLOOR) continue;
      if (closed.has(nkey)) continue;
      if (blocked.has(nkey) && !(nx === goal.x && ny === goal.y)) continue;

      const g = current.g + 1;
      const h = heuristic({ x: nx, y: ny }, goal);
      const existing = openMap.get(nkey);
      if (existing && existing.g <= g) continue;

      const node: AStarNode = {
        x: nx,
        y: ny,
        g,
        h,
        f: g + h,
        parent: current
      };
      open.push(node);
      openMap.set(nkey, node);
    }

    if (closed.size > 500) break;
  }

  return [];
}

// ============================================================
// 玩家移动与火炬拾取
// ============================================================
export function directionToDelta(dir: Direction): Position {
  switch (dir) {
    case Direction.UP: return { x: 0, y: -1 };
    case Direction.DOWN: return { x: 0, y: 1 };
    case Direction.LEFT: return { x: -1, y: 0 };
    case Direction.RIGHT: return { x: 1, y: 0 };
  }
}

export function canMoveTo(
  tiles: Tile[][],
  pos: Position,
  monsters: Monster[]
): boolean {
  if (!isInsideMap(pos.x, pos.y)) return false;
  if (tiles[pos.y][pos.x].type !== TileType.FLOOR) return false;
  for (const m of monsters) {
    if (m.alive && posEq(m.position, pos)) return false;
  }
  return true;
}

export function tryPickupTorch(
  player: Player,
  torches: Torch[],
  pos: Position
): { torchPicked: Torch | null; torches: Torch[] } {
  let picked: Torch | null = null;
  const newTorches = torches.map((t) => {
    if (!t.picked && posEq(t.position, pos)) {
      picked = t;
      return { ...t, picked: true };
    }
    return t;
  });
  return { torchPicked: picked, torches: newTorches };
}

export function applyTorchEffect(player: Player): Player {
  return {
    ...player,
    torchesPicked: player.torchesPicked + 1,
    torchTurnsRemaining: TORCH_DURATION,
    lightRadius: player.baseLightRadius + TORCH_LIGHT_BONUS
  };
}

export function decrementTorchTimer(player: Player): Player {
  if (player.torchTurnsRemaining > 0) {
    const remaining = player.torchTurnsRemaining - 1;
    if (remaining <= 0) {
      return {
        ...player,
        torchTurnsRemaining: 0,
        lightRadius: player.baseLightRadius
      };
    }
    return { ...player, torchTurnsRemaining: remaining };
  }
  return player;
}

// ============================================================
// 怪物 AI 移动
// ============================================================
export function getMonsterBlockedSet(monsters: Monster[], excludeId: number): Set<string> {
  const s = new Set<string>();
  for (const m of monsters) {
    if (m.alive && m.id !== excludeId) {
      s.add(`${m.position.x},${m.position.y}`);
    }
  }
  return s;
}

export function moveMonster(
  tiles: Tile[][],
  monster: Monster,
  target: Position,
  blocked: Set<string>
): Monster {
  if (!monster.alive) return monster;

  const path = aStarPathfind(tiles, monster.position, target, blocked);
  if (path.length > 0) {
    const nextStep = path[0];
    const adjBlocked = new Set(blocked);
    adjBlocked.delete(`${nextStep.x},${nextStep.y}`);
    if (!adjBlocked.has(`${nextStep.x},${nextStep.y}`)) {
      return { ...monster, position: { ...nextStep }, nextPath: path.slice(1) };
    }
  }
  return { ...monster, nextPath: path };
}

// ============================================================
// 战斗判定
// ============================================================
export function checkBattleTriggers(
  player: Player,
  monsters: Monster[]
): number[] {
  const triggered: number[] = [];
  for (const m of monsters) {
    if (!m.alive) continue;
    const dist = Math.abs(m.position.x - player.position.x) + Math.abs(m.position.y - player.position.y);
    if (dist <= player.lightRadius && posEq(m.position, player.position)) {
      triggered.push(m.id);
    } else if (dist <= 0) {
      triggered.push(m.id);
    }
  }
  return triggered;
}

export function monsterInLightRadius(
  playerPos: Position,
  monsterPos: Position,
  lightRadius: number
): boolean {
  const dx = monsterPos.x - playerPos.x;
  const dy = monsterPos.y - playerPos.y;
  return Math.sqrt(dx * dx + dy * dy) <= lightRadius;
}

// ============================================================
// 随机放置实体
// ============================================================
function sampleWithoutReplacement<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

export function placeTorches(tiles: Tile[][], playerPos: Position, count: number): Torch[] {
  const floors = collectFloorTiles(tiles).filter(
    (p) => !posEq(p, playerPos)
  );
  const chosen = sampleWithoutReplacement(floors, count);
  return chosen.map((p, i) => ({
    id: i,
    position: p,
    picked: false
  }));
}

export function placeMonsters(tiles: Tile[][], playerPos: Position, count: number): Monster[] {
  const floors = collectFloorTiles(tiles).filter((p) => {
    if (posEq(p, playerPos)) return false;
    const dist = Math.abs(p.x - playerPos.x) + Math.abs(p.y - playerPos.y);
    return dist >= 4;
  });
  const chosen = sampleWithoutReplacement(floors, count);
  return chosen.map((p, i) => ({
    id: i,
    position: p,
    hp: 1,
    alive: true,
    nextPath: []
  }));
}

// ============================================================
// 游戏状态初始化
// ============================================================
export function createInitialGameState(): GameState {
  const tiles = generateMazeBSP();
  const playerPos = findCenterFloor(tiles);

  const player: Player = {
    name: '探险者',
    position: playerPos,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    lightRadius: DEFAULT_LIGHT_RADIUS,
    baseLightRadius: DEFAULT_LIGHT_RADIUS,
    torchTurnsRemaining: 0,
    torchesPicked: 0
  };

  const torches = placeTorches(tiles, playerPos, 3);
  const monsters = placeMonsters(tiles, playerPos, 4);

  const emptyPrev = new Set<string>();
  const visibleMap = calculateFOV(tiles, playerPos, player.lightRadius, emptyPrev);
  const exploredSet = new Set<string>();
  visibleMap.forEach((v) => exploredSet.add(`${v.x},${v.y}`));
  const visibleSet = new Set(visibleMap.keys());

  return {
    tiles,
    player,
    monsters,
    torches,
    turn: 0,
    exploredSet,
    visibleMap,
    prevVisibleSet: visibleSet,
    fogTransitionMap: new Map<string, number>(),
    battleAnimation: null,
    won: false,
    gameOver: false
  };
}

export function posKey(x: number, y: number): string {
  return `${x},${y}`;
}
