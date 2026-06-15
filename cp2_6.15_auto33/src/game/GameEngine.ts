import type {
  GameState, PlayerId, Unit, Tower, HexCoord, UnitType, Particle, Base, Crystal
} from '../shared/types';
import {
  createUnit, hexDistance, getHexNeighbors, hexToPixel, getSpawnPosition, generateId
} from './UnitFactory';
import type { WebSocketServer, WebSocket } from 'ws';

const GRID_SIZE = 20;
const GAME_DURATION = 15 * 60;
const HEX_SIZE = 40;

interface AStarNode {
  coord: HexCoord;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function coordKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

function aStar(
  start: HexCoord,
  goal: HexCoord,
  blockedSet: Set<string>,
  gridSize: number
): HexCoord[] | null {
  const open: AStarNode[] = [];
  const closed = new Set<string>();

  const startNode: AStarNode = {
    coord: start,
    g: 0,
    h: hexDistance(start, goal),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  open.push(startNode);

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = coordKey(current.coord);

    if (currentKey === coordKey(goal)) {
      const path: HexCoord[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift(node.coord);
        node = node.parent;
      }
      return path;
    }

    closed.add(currentKey);

    for (const neighbor of getHexNeighbors(current.coord)) {
      const nKey = coordKey(neighbor);
      if (closed.has(nKey)) continue;
      if (neighbor.q < 0 || neighbor.q >= gridSize || neighbor.r < 0 || neighbor.r >= gridSize) continue;
      if (blockedSet.has(nKey) && nKey !== coordKey(goal)) continue;

      const tentativeG = current.g + 1;
      const existing = open.find(n => coordKey(n.coord) === undefined;
      if (!existing || tentativeG < (open.find(n => coordKey(n.coord) === nKey)?.g!) {
        const h = hexDistance(neighbor, goal);
        const neighborNode: AStarNode = {
          coord: neighbor,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
        if (!existing) {
          open.push(neighborNode);
        }
      }
    }
  }

  return null;
}

export class GameEngine {
  state: GameState;
  private wss: WebSocketServer | null = null;
  private gameId: string;
  private lastUpdate: number;
  private gameStartTime: number;
  private players: Map<PlayerId, { ws: WebSocket; name: string }> = new Map();
  private broadcastTimer: NodeJS.Timeout | null = null;
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.gameStartTime = Date.now();
    this.lastUpdate = Date.now();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const mid = Math.floor(GRID_SIZE / 2);
    const redBase: Base = {
      owner: 'red',
      position: { q: 1, r: 1 },
      hp: 500,
      maxHp: 500,
    };
    const blueBase: Base = {
      owner: 'blue',
      position: { q: GRID_SIZE - 2, r: GRID_SIZE - 2 },
      hp: 500,
      maxHp: 500,
    };
    const crystal: Crystal = {
      owner: 'neutral',
      position: { q: mid, r: mid },
      captureProgress: 0,
      capturingPlayer: null,
      captureStartTime: null,
    };

    return {
      gridSize: GRID_SIZE,
      crystal,
      bases: { red: redBase, blue: blueBase },
      units: [],
      towers: [],
      particles: [],
      timeRemaining: GAME_DURATION,
      scores: { red: 0, blue: 0 },
      status: 'waiting',
      winner: null,
      tick: 0,
    };
  }

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  addPlayer(playerId: PlayerId, ws: WebSocket, name: string) {
    this.players.set(playerId, { ws, name });
    if (this.players.size === 2 && this.state.status === 'waiting') {
      this.state.status = 'playing';
      this.startGameLoop();
    }
  }

  removePlayer(playerId: PlayerId) {
    this.players.delete(playerId);
  }

  private startGameLoop() {
    const tickInterval = setInterval(() => {
      const now = Date.now();
      const dt = (now - this.lastUpdate) / 1000;
      this.lastUpdate = now;
      this.update(dt);
    }, 1000 / 60);
    this.tickTimer = tickInterval;

    this.broadcastTimer = setInterval(() => {
      this.broadcastState();
    }, 50);
  }

  stop() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
  }

  buildUnit(playerId: PlayerId, unitType: UnitType) {
    if (this.state.status !== 'playing') return;
    if (this.state.units.filter(u => u.owner === playerId).length +
        this.state.towers.filter(t => t.owner === playerId).length >= 25) return;

    const base = this.state.bases[playerId];
    const spawnPos = getSpawnPosition(base.position, GRID_SIZE);
    const newUnit = createUnit(unitType, playerId, spawnPos);

    if (unitType === 'attack_tower' || unitType === 'ice_tower') {
      this.state.towers.push(newUnit as Tower);
    } else {
      this.state.units.push(newUnit as Unit);
    }
  }

  private getBlockedSet(): Set<string> {
    const blocked = new Set<string>();
    for (const t of this.state.towers) {
      blocked.add(coordKey(t.position));
    }
    return blocked;
  }

  private update(dt: number) {
    if (this.state.tick++;

    if (this.state.status !== 'playing') {
      this.state.timeRemaining = Math.max(0, this.state.timeRemaining - dt);
      if (this.state.timeRemaining <= 0) {
        this.endGame();
        return;
      }
    }

    const blocked = this.getBlockedSet();

    for (const unit of this.state.units) {
      this.updateUnit(unit, dt, blocked);
    }

    for (const tower of this.state.towers) {
      this.updateTower(tower, dt);
    }

    this.updateCrystal(dt);
    this.updateParticles(dt);
    this.checkWinCondition();
  }

  private updateUnit(unit: Unit, dt: number, blocked: Set<string>) {
    if (unit.spawnAnimTimer > 0) {
      unit.spawnAnimTimer = Math.max(0, unit.spawnAnimTimer - dt);
    }

    if (unit.attackFlashTimer > 0) {
      unit.attackFlashTimer = Math.max(0, unit.attackFlashTimer - dt);
    }

    if (unit.slowTimer > 0) {
      unit.slowTimer = Math.max(0, unit.slowTimer - dt);
      if (unit.slowTimer === 0) unit.slowAmount = 0;
    }

    if (unit.attackTimer = Math.max(0, unit.attackTimer - dt);

    const enemyBase = this.state.bases[unit.owner === 'red' ? 'blue' : 'red'];
    const target = this.findNearestEnemyTarget(unit);

    if (target) {
      const dist