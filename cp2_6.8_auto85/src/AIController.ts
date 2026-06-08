import { HexGrid, HexCoord } from './HexGrid';
import { Unit, Faction, UnitClass } from './Unit';

export interface AIAction {
  unit: Unit;
  from?: HexCoord;
  to?: HexCoord;
  target?: Unit;
  damage?: number;
  killed?: boolean;
  type: 'move' | 'attack' | 'move-attack' | 'none';
}

export interface LogEntry {
  message: string;
  faction: Faction | 'system';
  timestamp: number;
}

export interface BattleResult {
  attacker: Unit;
  defender: Unit;
  damage: number;
  killed: boolean;
}

export class AIController {
  grid: HexGrid;
  units: Unit[];
  logs: LogEntry[] = [];
  maxLogs = 20;
  highlightedUnitId: string | null = null;
  private logListeners: ((logs: LogEntry[]) => void)[] = [];

  constructor(grid: HexGrid, units: Unit[]) {
    this.grid = grid;
    this.units = units;
  }

  addLog(message: string, faction: Faction | 'system' = 'system'): void {
    const entry: LogEntry = {
      message,
      faction,
      timestamp: Date.now()
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.notifyLogListeners();
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  onLogUpdate(callback: (logs: LogEntry[]) => void): () => void {
    this.logListeners.push(callback);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== callback);
    };
  }

  private notifyLogListeners(): void {
    this.logListeners.forEach(cb => cb(this.getLogs()));
  }

  clearLogs(): void {
    this.logs = [];
    this.notifyLogListeners();
  }

  computeDamage(attacker: Unit, defender: Unit): { damage: number; killed: boolean } {
    const atkPower = attacker.getEffectiveAttack(this.grid);
    const defHP = defender.hp;
    const terrainDef = this.grid.getTerrainInfo(defender.position).defBonus;
    const effectiveDamage = Math.max(1, atkPower - terrainDef);
    const killed = effectiveDamage >= defHP;
    return { damage: effectiveDamage, killed };
  }

  resolveAttack(attacker: Unit, defender: Unit): BattleResult {
    const { damage, killed } = this.computeDamage(attacker, defender);
    defender.takeDamage(damage);
    const factionName = attacker.faction === 'red' ? '红方' : '蓝方';
    const targetFaction = defender.faction === 'red' ? '红方' : '蓝方';

    if (killed) {
      this.addLog(
        `${factionName}${attacker.getName()}攻击${targetFaction}${defender.getName()}，造成${damage}点伤害，将其消灭！`,
        attacker.faction
      );
    } else {
      this.addLog(
        `${factionName}${attacker.getName()}攻击${targetFaction}${defender.getName()}，造成${damage}点伤害`,
        attacker.faction
      );
    }

    return { attacker, defender, damage, killed };
  }

  findPath(unit: Unit, target: HexCoord): HexCoord[] | null {
    const moveRange = unit.computeMoveRange(this.grid, this.units);
    const startKey = this.grid.hexKey(unit.position);
    const targetKey = this.grid.hexKey(target);

    if (startKey === targetKey) return [unit.position];
    if (!moveRange.has(targetKey)) return null;

    const visited = new Map<string, { parent: string | null; cost: number }>();
    const queue: { hex: HexCoord; cost: number }[] = [];

    visited.set(startKey, { parent: null, cost: 0 });
    queue.push({ hex: unit.position, cost: 0 });

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const currentKey = this.grid.hexKey(current.hex);

      if (currentKey === targetKey) {
        const path: HexCoord[] = [];
        let k: string | null = currentKey;
        while (k) {
          path.unshift(this.grid.parseKey(k));
          k = visited.get(k)!.parent;
        }
        return path;
      }

      for (const neighbor of this.grid.getNeighbors(current.hex)) {
        if (!this.grid.isPassable(neighbor)) continue;

        const occupied = this.units.some(u =>
          u.alive && u.id !== unit.id && u.position.q === neighbor.q && u.position.r === neighbor.r
        );
        if (occupied && this.grid.hexKey(neighbor) !== targetKey) continue;

        const moveCost = this.grid.getTerrainInfo(neighbor).moveCost;
        const totalCost = current.cost + moveCost;
        if (totalCost > unit.move) continue;

        const nKey = this.grid.hexKey(neighbor);
        if (!visited.has(nKey) || visited.get(nKey)!.cost > totalCost) {
          visited.set(nKey, { parent: currentKey, cost: totalCost });
          queue.push({ hex: neighbor, cost: totalCost });
        }
      }
    }

    return null;
  }

  findBestMoveTowards(unit: Unit, targetPos: HexCoord): HexCoord | null {
    const moveRange = unit.computeMoveRange(this.grid, this.units);
    let best: HexCoord | null = null;
    let bestDist = Infinity;

    const startPos = unit.position;
    const startDist = this.grid.hexDistance(startPos, targetPos);
    best = startPos;
    bestDist = startDist;

    moveRange.forEach(key => {
      const hex = this.grid.parseKey(key);
      const dist = this.grid.hexDistance(hex, targetPos);
      if (dist < bestDist) {
        bestDist = dist;
        best = hex;
      }
    });

    return best;
  }

  getEnemies(faction: Faction): Unit[] {
    return this.units.filter(u => u.alive && u.faction !== faction);
  }

  getAliveUnits(faction?: Faction): Unit[] {
    if (!faction) return this.units.filter(u => u.alive);
    return this.units.filter(u => u.alive && u.faction === faction);
  }

  findTargetInRange(unit: Unit, fromPos?: HexCoord): Unit | null {
    const attackRange = unit.computeAttackRange(this.grid, fromPos);
    const enemies = this.getEnemies(unit.faction);

    let best: Unit | null = null;
    let bestPriority = -Infinity;

    for (const enemy of enemies) {
      const eKey = this.grid.hexKey(enemy.position);
      if (!attackRange.has(eKey)) continue;

      let priority = 0;
      if (unit.faction === 'blue') {
        if (enemy.unitClass === 'mage') priority += 100;
        else if (enemy.unitClass === 'archer') priority += 50;
        else priority += 10;
      }
      priority += (10 - enemy.hp);
      priority -= this.grid.hexDistance(unit.position, enemy.position);

      if (priority > bestPriority) {
        bestPriority = priority;
        best = enemy;
      }
    }

    return best;
  }

  planRedAction(unit: Unit): AIAction {
    const enemies = this.getEnemies(unit.faction);
    if (enemies.length === 0) return { unit, type: 'none' };

    let nearest: Unit | null = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      const d = this.grid.hexDistance(unit.position, e.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }

    if (!nearest) return { unit, type: 'none' };

    const target = nearest as Unit;
    const directTarget = this.findTargetInRange(unit);
    if (directTarget) {
      const { damage, killed } = this.computeDamage(unit, directTarget);
      return {
        unit,
        target: directTarget,
        damage,
        killed,
        type: 'attack'
      };
    }

    const attackRange = unit.computeAttackRange(this.grid);
    const moveRange = unit.computeMoveRange(this.grid, this.units);

    let bestAttackFrom: HexCoord | null = null;
    let bestTarget: Unit | null = null;
    let bestPriority = -Infinity;

    moveRange.forEach(key => {
      const hex = this.grid.parseKey(key);
      const tempAttackRange = unit.computeAttackRange(this.grid, hex);
      for (const enemy of enemies) {
        if (tempAttackRange.has(this.grid.hexKey(enemy.position))) {
          let priority = 0;
          priority += (10 - enemy.hp);
          priority -= this.grid.hexDistance(hex, enemy.position);
          priority -= this.grid.hexDistance(unit.position, hex) * 0.1;
          if (priority > bestPriority) {
            bestPriority = priority;
            bestAttackFrom = hex;
            bestTarget = enemy;
          }
        }
      }
    });

    if (bestAttackFrom && bestTarget) {
      const originalPos = unit.position;
      unit.position = bestAttackFrom;
      const { damage, killed } = this.computeDamage(unit, bestTarget);
      unit.position = originalPos;
      return {
        unit,
        from: unit.position,
        to: bestAttackFrom,
        target: bestTarget,
        damage,
        killed,
        type: 'move-attack'
      };
    }

    const moveTo = this.findBestMoveTowards(unit, target.position);
    if (moveTo && this.grid.hexKey(moveTo) !== this.grid.hexKey(unit.position)) {
      return {
        unit,
        from: unit.position,
        to: moveTo,
        type: 'move'
      };
    }

    return { unit, type: 'none' };
  }

  planBlueAction(unit: Unit): AIAction {
    const enemies = this.getEnemies(unit.faction);
    if (enemies.length === 0) return { unit, type: 'none' };

    let bestEnemy: Unit | null = null;
    let bestPriority = -Infinity;
    for (const e of enemies) {
      let priority = 0;
      if (e.unitClass === 'mage') priority += 1000;
      else if (e.unitClass === 'archer') priority += 500;
      priority += (10 - e.hp) * 10;
      priority -= this.grid.hexDistance(unit.position, e.position);
      if (priority > bestPriority) {
        bestPriority = priority;
        bestEnemy = e;
      }
    }

    if (!bestEnemy) return { unit, type: 'none' };

    const target = bestEnemy as Unit;
    const directTarget = this.findTargetInRange(unit);
    if (directTarget) {
      let tgtPriority = -Infinity;
      for (const e of enemies) {
        if (unit.computeAttackRange(this.grid).has(this.grid.hexKey(e.position))) {
          let p = 0;
          if (e.unitClass === 'mage') p += 1000;
          else if (e.unitClass === 'archer') p += 500;
          p += (10 - e.hp) * 10;
          if (p > tgtPriority) {
            tgtPriority = p;
            directTarget = e as any;
          }
        }
      }
      const actualTarget = (directTarget as any) === directTarget ? directTarget : directTarget;
      const { damage, killed } = this.computeDamage(unit, actualTarget);
      return {
        unit,
        target: actualTarget,
        damage,
        killed,
        type: 'attack'
      };
    }

    const moveRange = unit.computeMoveRange(this.grid, this.units);
    let bestAttackFrom: HexCoord | null = null;
    let bestTarget: Unit | null = null;
    let bestAtkPriority = -Infinity;

    moveRange.forEach(key => {
      const hex = this.grid.parseKey(key);
      const tempAttackRange = unit.computeAttackRange(this.grid, hex);
      for (const enemy of enemies) {
        if (tempAttackRange.has(this.grid.hexKey(enemy.position))) {
          let priority = 0;
          if (enemy.unitClass === 'mage') priority += 1000;
          else if (enemy.unitClass === 'archer') priority += 500;
          priority += (10 - enemy.hp) * 10;
          priority -= this.grid.hexDistance(hex, enemy.position);
          if (priority > bestAtkPriority) {
            bestAtkPriority = priority;
            bestAttackFrom = hex;
            bestTarget = enemy;
          }
        }
      }
    });

    if (bestAttackFrom && bestTarget) {
      const originalPos = unit.position;
      unit.position = bestAttackFrom;
      const { damage, killed } = this.computeDamage(unit, bestTarget);
      unit.position = originalPos;
      return {
        unit,
        from: unit.position,
        to: bestAttackFrom,
        target: bestTarget,
        damage,
        killed,
        type: 'move-attack'
      };
    }

    const moveTo = this.findBestMoveTowards(unit, target.position);
    if (moveTo && this.grid.hexKey(moveTo) !== this.grid.hexKey(unit.position)) {
      return {
        unit,
        from: unit.position,
        to: moveTo,
        type: 'move'
      };
    }

    return { unit, type: 'none' };
  }

  planAction(unit: Unit): AIAction {
    if (unit.faction === 'red') {
      return this.planRedAction(unit);
    } else {
      return this.planBlueAction(unit);
    }
  }

  executeAction(action: AIAction): void {
    const factionName = action.unit.faction === 'red' ? '红方' : '蓝方';
    this.highlightedUnitId = action.unit.id;

    if (action.type === 'move' && action.to) {
      const from = action.from || action.unit.position;
      action.unit.position = { ...action.to };
      this.addLog(
        `${factionName}${action.unit.getName()}从(${from.q},${from.r})移动到(${action.to.q},${action.to.r})`,
        action.unit.faction
      );
    } else if (action.type === 'move-attack' && action.to && action.target) {
      const from = action.from || action.unit.position;
      action.unit.position = { ...action.to };
      this.addLog(
        `${factionName}${action.unit.getName()}从(${from.q},${from.r})移动到(${action.to.q},${action.to.r})并攻击${action.target.faction === 'red' ? '红方' : '蓝方'}${action.target.getName()}，造成${action.damage}点伤害${action.killed ? '，将其消灭！' : ''}`,
        action.unit.faction
      );
      this.resolveAttack(action.unit, action.target);
    } else if (action.type === 'attack' && action.target) {
      const from = action.unit.position;
      this.addLog(
        `${factionName}${action.unit.getName()}从(${from.q},${from.r})攻击${action.target.faction === 'red' ? '红方' : '蓝方'}${action.target.getName()}，造成${action.damage}点伤害${action.killed ? '，将其消灭！' : ''}`,
        action.unit.faction
      );
      this.resolveAttack(action.unit, action.target);
    }
  }

  async runAutoTurn(
    onHighlight: (unitId: string | null) => void,
    onUpdate: () => void,
    stepDelay: number = 300
  ): Promise<void> {
    const aliveUnits = this.getAliveUnits();
    const ordered = [
      ...aliveUnits.filter(u => u.faction === 'red'),
      ...aliveUnits.filter(u => u.faction === 'blue')
    ];

    for (const unit of ordered) {
      if (!unit.alive) continue;
      const action = this.planAction(unit);
      if (action.type === 'none') continue;

      onHighlight(unit.id);
      this.highlightedUnitId = unit.id;
      onUpdate();
      await this.sleep(stepDelay);

      this.executeAction(action);
      onUpdate();
      await this.sleep(stepDelay);
    }

    onHighlight(null);
    this.highlightedUnitId = null;
    onUpdate();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
