import type {
  Building,
  BuildingType,
  Cell,
  CombatEvent,
  PlayerId,
  Unit,
} from './types';
import {
  BARRACKS_PRODUCTION_INTERVAL_L1,
  BARRACKS_PRODUCTION_INTERVAL_L2,
  GRID_SIZE,
  HUMAN_PLAYER,
  NEUTRAL_RESOURCE_AMOUNT,
  NEUTRAL_RESOURCE_INTERVAL,
  NEUTRAL_RESOURCE_POINT_COUNT,
  PLAYER_COLORS,
  PLAYER_NAMES,
  PLAYER_RESOURCE_AMOUNT,
  PLAYER_RESOURCE_INTERVAL,
  UNIT_MOVE_INTERVAL,
} from './types';
import { findPath, findNearestEnemyTarget, getAdjacentCells, isAdjacent } from './utils/bfs';
import { eventBus } from './eventBus';

let idCounter = 0;
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(++idCounter).toString(36)}`;

type PlayersRecord = Record<string, {
  id: PlayerId;
  resources: number;
  territoryCount: number;
  color: string;
  isAI: boolean;
  name: string;
}>;

export class MapEngine {
  grid: Cell[][] = [];
  players: PlayersRecord = {};
  units: Map<string, Unit> = new Map();
  private startTime = 0;
  private unitSpawnQueue: Map<string, { barracksId: string; spawnTime: number; owner: PlayerId; x: number; y: number }> = new Map();

  constructor() {
    this.initGrid();
    this.initPlayers();
    this.assignStartingTerritories();
    this.placeNeutralResourcePoints();
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push({
          x,
          y,
          owner: 'neutral',
          building: null,
          unit: null,
          isResourcePoint: false,
        });
      }
      this.grid.push(row);
    }
  }

  private initPlayers(): void {
    const playerIds: PlayerId[] = ['player1', 'player2', 'player3', 'player4'];
    for (const pid of playerIds) {
      this.players[pid] = {
        id: pid,
        resources: 15,
        territoryCount: 0,
        color: PLAYER_COLORS[pid],
        isAI: pid !== HUMAN_PLAYER,
        name: PLAYER_NAMES[pid],
      };
    }
  }

  private assignStartingTerritories(): void {
    const corners = [
      { x: 0, y: 0, pid: 'player1' as PlayerId },
      { x: GRID_SIZE - 1, y: GRID_SIZE - 1, pid: 'player2' as PlayerId },
      { x: 0, y: GRID_SIZE - 1, pid: 'player3' as PlayerId },
      { x: GRID_SIZE - 1, y: 0, pid: 'player4' as PlayerId },
    ];

    for (const corner of corners) {
      const startX = corner.x === 0 ? 0 : GRID_SIZE - 3;
      const startY = corner.y === 0 ? 0 : GRID_SIZE - 3;
      let count = 0;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const x = startX + dx;
          const y = startY + dy;
          if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            this.grid[y][x].owner = corner.pid;
            count++;
          }
        }
      }
      this.players[corner.pid].territoryCount = count;

      const bx = corner.x;
      const by = corner.y;
      const building = this.createBuilding('resource', corner.pid, bx, by);
      this.grid[by][bx].building = building;
    }
  }

  private placeNeutralResourcePoints(): void {
    const positions: { x: number; y: number }[] = [];
    const usedKeys = new Set<string>();

    for (let i = 0; i < NEUTRAL_RESOURCE_POINT_COUNT; i++) {
      let attempts = 0;
      while (attempts < 100) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        const key = `${x},${y}`;
        const cell = this.grid[y][x];
        if (
          !usedKeys.has(key) &&
          cell.owner === 'neutral' &&
          !cell.building &&
          !cell.isResourcePoint &&
          x > 1 && x < GRID_SIZE - 2 && y > 1 && y < GRID_SIZE - 2
        ) {
          usedKeys.add(key);
          positions.push({ x, y });
          cell.isResourcePoint = true;
          const building: Building = {
            id: genId('neutral_resource'),
            type: 'resource',
            owner: 'neutral',
            level: 1,
            hp: 999,
            maxHp: 999,
            attack: 0,
            defense: 0,
            lastProductionTime: 0,
            productionInterval: NEUTRAL_RESOURCE_INTERVAL,
            productionAmount: NEUTRAL_RESOURCE_AMOUNT,
          };
          cell.building = building;
          break;
        }
        attempts++;
      }
    }
  }

  private createBuilding(type: BuildingType, owner: PlayerId, x: number, y: number): Building {
    const baseHp: Record<BuildingType, number> = {
      resource: 20,
      tower: 30,
      barracks: 25,
    };
    const baseAttack: Record<BuildingType, number> = {
      resource: 0,
      tower: 5,
      barracks: 0,
    };
    const baseDefense: Record<BuildingType, number> = {
      resource: 1,
      tower: 3,
      barracks: 2,
    };
    const interval: Record<BuildingType, number> = {
      resource: PLAYER_RESOURCE_INTERVAL,
      tower: 0,
      barracks: BARRACKS_PRODUCTION_INTERVAL_L1,
    };
    const amount: Record<BuildingType, number> = {
      resource: PLAYER_RESOURCE_AMOUNT,
      tower: 0,
      barracks: 1,
    };
    return {
      id: genId('b'),
      type,
      owner,
      level: 1,
      hp: baseHp[type],
      maxHp: baseHp[type],
      attack: baseAttack[type],
      defense: baseDefense[type],
      lastProductionTime: this.startTime || performance.now(),
      productionInterval: interval[type],
      productionAmount: amount[type],
    };
  }

  createInfantry(owner: PlayerId, x: number, y: number): Unit {
    return {
      id: genId('u'),
      owner,
      type: 'infantry',
      x,
      y,
      hp: 10,
      maxHp: 10,
      attack: 3,
      defense: 1,
      lastMoveTime: this.startTime || performance.now(),
      moveInterval: UNIT_MOVE_INTERVAL,
      path: [],
      targetX: x,
      targetY: y,
      trail: [],
    };
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return this.grid[y][x];
  }

  canPlaceBuilding(x: number, y: number, playerId: PlayerId): { ok: boolean; reason?: string } {
    const cell = this.getCell(x, y);
    if (!cell) return { ok: false, reason: '坐标越界' };
    if (cell.building) return { ok: false, reason: '该格已有建筑' };
    const adjacent = getAdjacentCells(this.grid, x, y);
    const hasFriendlyAdjacent = adjacent.some(
      (c) => c.owner === playerId
    );
    if (!hasFriendlyAdjacent) {
      return { ok: false, reason: '必须与己方领地相邻' };
    }
    return { ok: true };
  }

  placeBuilding(x: number, y: number, type: BuildingType, playerId: PlayerId): { ok: boolean; building?: Building; reason?: string } {
    const check = this.canPlaceBuilding(x, y, playerId);
    if (!check.ok) return check;
    const cell = this.grid[y][x];
    const building = this.createBuilding(type, playerId, x, y);
    cell.building = building;
    if (cell.owner !== playerId) {
      const oldOwner = cell.owner;
      cell.owner = playerId;
      this.updateTerritoryCounts();
      eventBus.emit('territory:change', { x, y, oldOwner, newOwner: playerId });
    }
    return { ok: true, building };
  }

  removeBuilding(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell || !cell.building) return false;
    cell.building = null;
    return true;
  }

  upgradeBarracks(x: number, y: number): { ok: boolean; building?: Building; reason?: string } {
    const cell = this.getCell(x, y);
    if (!cell) return { ok: false, reason: '坐标越界' };
    if (!cell.building || cell.building.type !== 'barracks') {
      return { ok: false, reason: '该格没有兵营' };
    }
    if (cell.building.level >= 2) {
      return { ok: false, reason: '兵营已是最高等级' };
    }
    cell.building.level = 2;
    cell.building.productionInterval = BARRACKS_PRODUCTION_INTERVAL_L2;
    cell.building.hp = cell.building.maxHp = 35;
    cell.building.defense = 3;
    return { ok: true, building: cell.building };
  }

  placeUnit(unit: Unit): boolean {
    const cell = this.getCell(unit.x, unit.y);
    if (!cell) return false;
    cell.unit = unit;
    this.units.set(unit.id, unit);
    return true;
  }

  removeUnit(unitId: string): boolean {
    const unit = this.units.get(unitId);
    if (!unit) return false;
    const cell = this.getCell(unit.x, unit.y);
    if (cell && cell.unit?.id === unitId) cell.unit = null;
    this.units.delete(unitId);
    return true;
  }

  moveUnit(unitId: string, newX: number, newY: number): boolean {
    const unit = this.units.get(unitId);
    if (!unit) return false;
    const oldCell = this.getCell(unit.x, unit.y);
    const newCell = this.getCell(newX, newY);
    if (!newCell) return false;
    if (oldCell && oldCell.unit?.id === unitId) oldCell.unit = null;
    unit.x = newX;
    unit.y = newY;
    newCell.unit = unit;
    eventBus.emit('unit:move', { unitId, x: newX, y: newY });
    return true;
  }

  setCellOwner(x: number, y: number, owner: PlayerId): void {
    const cell = this.getCell(x, y);
    if (!cell) return;
    const oldOwner = cell.owner;
    if (oldOwner === owner) return;
    cell.owner = owner;
    this.updateTerritoryCounts();
    eventBus.emit('territory:change', { x, y, oldOwner, newOwner: owner });
  }

  updateTerritoryCounts(): void {
    const counts: Record<string, number> = {
      player1: 0,
      player2: 0,
      player3: 0,
      player4: 0,
      neutral: 0,
    };
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const owner = this.grid[y][x].owner;
        counts[owner] = (counts[owner] || 0) + 1;
      }
    }
    for (const pid of Object.keys(this.players)) {
      this.players[pid].territoryCount = counts[pid] || 0;
    }
  }

  getTerritoryCount(playerId: PlayerId): number {
    return this.players[playerId]?.territoryCount ?? 0;
  }

  checkConflictAtCell(x: number, y: number): CombatEvent | null {
    const cell = this.getCell(x, y);
    if (!cell) return null;
    const unit = cell.unit;
    if (!unit) return null;

    if (cell.building && cell.building.owner !== unit.owner && cell.building.owner !== 'neutral') {
      return {
        attackerId: unit.id,
        attackerType: 'unit',
        defenderId: cell.building.id,
        defenderType: 'building',
        x,
        y,
      };
    }

    const adjacents = getAdjacentCells(this.grid, x, y);
    for (const adj of adjacents) {
      if (adj.unit && adj.unit.owner !== unit.owner) {
        return {
          attackerId: unit.id,
          attackerType: 'unit',
          defenderId: adj.unit.id,
          defenderType: 'unit',
          x,
          y,
        };
      }
      if (adj.building && adj.building.owner !== unit.owner && adj.building.owner !== 'neutral' && adj.building.type === 'tower') {
        return {
          attackerId: adj.building.id,
          attackerType: 'building',
          defenderId: unit.id,
          defenderType: 'unit',
          x: adj.x,
          y: adj.y,
        };
      }
    }

    if (cell.owner !== unit.owner && cell.owner !== 'neutral') {
      return null;
    }
    return null;
  }

  findEnemyTargetAndPath(unit: Unit): void {
    const target = findNearestEnemyTarget(this.grid, unit.x, unit.y, unit.owner);
    if (target) {
      unit.targetX = target.x;
      unit.targetY = target.y;
      unit.path = findPath(this.grid, unit.x, unit.y, target.x, target.y, unit.owner);
    } else {
      unit.path = [];
    }
  }

  stepUnitTowardsTarget(unit: Unit, now: number): boolean {
    if (now - unit.lastMoveTime < unit.moveInterval) return false;
    if (unit.path.length === 0) {
      this.findEnemyTargetAndPath(unit);
      if (unit.path.length === 0) return false;
    }

    const next = unit.path.shift();
    if (!next) return false;
    const targetCell = this.getCell(next.x, next.y);
    if (!targetCell) {
      unit.path = [];
      return false;
    }

    unit.trail.push({ x: unit.x, y: unit.y, alpha: 1, id: genId('t') });
    if (unit.trail.length > 4) unit.trail.shift();

    this.moveUnit(unit.id, next.x, next.y);
    unit.lastMoveTime = now;

    const cell = this.grid[next.y][next.x];
    if (cell.owner !== unit.owner && !cell.building && !cell.unit) {
      this.setCellOwner(next.x, next.y, unit.owner);
      eventBus.emit('log:add', {
        message: `${this.players[unit.owner]?.name || unit.owner}占领了(${next.x},${next.y})`,
        type: 'capture',
      });
    }

    return true;
  }

  findFreeAdjacentSpawn(x: number, y: number): { x: number; y: number } | null {
    const adjacents = getAdjacentCells(this.grid, x, y);
    const sorted = adjacents.sort(() => Math.random() - 0.5);
    for (const adj of sorted) {
      if (!adj.unit && !adj.building) {
        return { x: adj.x, y: adj.y };
      }
    }
    const cell = this.getCell(x, y);
    if (cell && !cell.unit) return { x, y };
    return null;
  }

  queueInfantryProduction(barracks: Building, barracksX: number, barracksY: number, now: number): void {
    const spawnTime = now + barracks.productionInterval;
    const spawnId = genId('spawn');
    this.unitSpawnQueue.set(spawnId, {
      barracksId: barracks.id,
      spawnTime,
      owner: barracks.owner,
      x: barracksX,
      y: barracksY,
    });
  }

  processSpawns(now: number): void {
    const ready: string[] = [];
    for (const [id, entry] of this.unitSpawnQueue) {
      if (now >= entry.spawnTime) {
        const spawnPos = this.findFreeAdjacentSpawn(entry.x, entry.y);
        if (spawnPos) {
          const cell = this.getCell(entry.x, entry.y);
          if (cell && cell.building && cell.building.id === entry.barracksId) {
            const unit = this.createInfantry(entry.owner, spawnPos.x, spawnPos.y);
            this.placeUnit(unit);
            cell.building.lastProductionTime = now;
            eventBus.emit('log:add', {
              message: `${this.players[entry.owner]?.name || entry.owner}生产了步兵单位`,
              type: 'info',
            });
          }
        } else {
          entry.spawnTime = now + 1000;
          continue;
        }
        ready.push(id);
      }
    }
    for (const id of ready) this.unitSpawnQueue.delete(id);
  }

  processBuildingProduction(now: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.grid[y][x];
        const b = cell.building;
        if (!b) continue;
        if (b.type === 'resource') {
          if (b.owner !== 'neutral') {
            if (now - b.lastProductionTime >= b.productionInterval) {
              this.players[b.owner].resources += b.productionAmount;
              eventBus.emit('resource:update', { playerId: b.owner, amount: this.players[b.owner].resources });
              b.lastProductionTime = now;
            }
          } else if (cell.owner !== 'neutral') {
            if (now - b.lastProductionTime >= b.productionInterval) {
              this.players[cell.owner].resources += b.productionAmount;
              eventBus.emit('resource:update', { playerId: cell.owner, amount: this.players[cell.owner].resources });
              b.lastProductionTime = now;
              eventBus.emit('log:add', {
                message: `${this.players[cell.owner]?.name || cell.owner}获得中立资源点+${b.productionAmount}`,
                type: 'info',
              });
            }
          }
        } else if (b.type === 'barracks') {
          const spawned = this.unitSpawnQueue;
          let hasPending = false;
          for (const entry of spawned.values()) {
            if (entry.barracksId === b.id) {
              hasPending = true;
              break;
            }
          }
          if (!hasPending && now - b.lastProductionTime >= b.productionInterval) {
            this.queueInfantryProduction(b, x, y, now);
          }
        }
      }
    }
  }

  getEnemyCombatTargetsForUnit(unit: Unit): { x: number; y: number; type: 'unit' | 'building' } | null {
    const cell = this.getCell(unit.x, unit.y);
    if (cell) {
      if (cell.building && cell.building.owner !== unit.owner && cell.building.owner !== 'neutral') {
        return { x: cell.x, y: cell.y, type: 'building' };
      }
      if (cell.unit && cell.unit.owner !== unit.owner) {
        return { x: cell.x, y: cell.y, type: 'unit' };
      }
    }
    const adjacents = getAdjacentCells(this.grid, unit.x, unit.y);
    for (const adj of adjacents) {
      if (adj.unit && adj.unit.owner !== unit.owner) {
        return { x: adj.x, y: adj.y, type: 'unit' };
      }
      if (adj.building && adj.building.owner !== unit.owner && adj.building.owner !== 'neutral') {
        return { x: adj.x, y: adj.y, type: 'building' };
      }
    }
    return null;
  }

  findCombatEventsForTurn(): CombatEvent[] {
    const events: CombatEvent[] = [];
    const processedUnits = new Set<string>();

    for (const unit of this.units.values()) {
      if (processedUnits.has(unit.id)) continue;
      const target = this.getEnemyCombatTargetsForUnit(unit);
      if (target) {
        const targetCell = this.grid[target.y][target.x];
        if (target.type === 'building' && targetCell.building) {
          events.push({
            attackerId: unit.id,
            attackerType: 'unit',
            defenderId: targetCell.building.id,
            defenderType: 'building',
            x: target.x,
            y: target.y,
          });
          processedUnits.add(unit.id);
        } else if (target.type === 'unit' && targetCell.unit) {
          events.push({
            attackerId: unit.id,
            attackerType: 'unit',
            defenderId: targetCell.unit.id,
            defenderType: 'unit',
            x: target.x,
            y: target.y,
          });
          processedUnits.add(unit.id);
          processedUnits.add(targetCell.unit.id);
        }
      }
    }
    return events;
  }

  getBuildingById(id: string): Building | null {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const b = this.grid[y][x].building;
        if (b && b.id === id) return b;
      }
    }
    return null;
  }

  getBuildingPosition(id: string): { x: number; y: number } | null {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x].building?.id === id) return { x, y };
      }
    }
    return null;
  }

  getUnitById(id: string): Unit | null {
    return this.units.get(id) || null;
  }

  _isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
    return isAdjacent(x1, y1, x2, y2);
  }
}
