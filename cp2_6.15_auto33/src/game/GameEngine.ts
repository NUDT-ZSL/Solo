import type {
  GameState, PlayerId, Unit, Tower, HexCoord, UnitType, Particle, Base, Crystal
} from '../shared/types';
import {
  createUnit, getSpawnPosition
} from './UnitFactory';
import {
  hexDistance, getHexNeighbors, hexToPixel, coordKey, aStarSearch, HEX_SIZE
} from '../utils/HexUtils';
import type { WebSocket } from 'ws';

const GRID_SIZE = 20;
const GAME_DURATION = 15 * 60;

type UnitDelta = { id: string } & Partial<Unit>;
type TowerDelta = { id: string } & Partial<Tower>;

interface StateDelta {
  tick: number;
  units?: UnitDelta[];
  towers?: TowerDelta[];
  removedUnits?: string[];
  removedTowers?: string[];
  particles?: Particle[];
  crystal?: Partial<Crystal>;
  bases?: { red?: Partial<Base>; blue?: Partial<Base> };
  scores?: { red?: number; blue?: number };
  timeRemaining?: number;
  status?: string;
  winner?: PlayerId | 'draw' | null;
}

export class GameEngine {
  state: GameState;
  gameId: string;
  private lastUpdate: number;
  private players: Map<PlayerId, { ws: WebSocket; name: string }> = new Map();
  private tickTimer: NodeJS.Timeout | null = null;
  private broadcastTimer: NodeJS.Timeout | null = null;
  private onGameOverCallback: ((winner: PlayerId | 'draw') => void) | null = null;
  private lastSentState: GameState | null = null;

  constructor(gameId: string) {
    this.gameId = gameId;
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

  setOnGameOver(callback: (winner: PlayerId | 'draw') => void) {
    this.onGameOverCallback = callback;
  }

  addPlayer(playerId: PlayerId, ws: WebSocket, name: string) {
    this.players.set(playerId, { ws, name });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleClientMessage(msg, playerId);
      } catch (e) {
        console.error('Failed to parse client message:', e);
      }
    });

    ws.on('close', () => {
      this.players.delete(playerId);
      if (this.state.status === 'playing') {
        this.endGame(playerId === 'red' ? 'blue' : 'red');
      }
    });

    if (this.players.size === 2 && this.state.status === 'waiting') {
      this.state.status = 'playing';
      this.lastUpdate = Date.now();
      this.startGameLoop();
      this.sendFullState();
    }
  }

  private handleClientMessage(msg: any, playerId: PlayerId) {
    switch (msg.type) {
      case 'ping':
        this.sendToPlayer(playerId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'build_unit':
        this.buildUnit(playerId, msg.unitType as UnitType);
        break;
      case 'surrender':
        this.endGame(playerId === 'red' ? 'blue' : 'red');
        break;
      case 'request_full_state':
        this.sendFullStateToPlayer(playerId);
        break;
    }
  }

  getPlayerName(playerId: PlayerId): string {
    return this.players.get(playerId)?.name || '';
  }

  private startGameLoop() {
    this.tickTimer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastUpdate) / 1000, 0.1);
      this.lastUpdate = now;
      this.update(dt);
    }, 1000 / 60);

    this.broadcastTimer = setInterval(() => {
      this.sendDeltaState();
    }, 50);
  }

  stop() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
  }

  buildUnit(playerId: PlayerId, unitType: UnitType) {
    if (this.state.status !== 'playing') return;

    const totalCount = this.state.units.filter(u => u.owner === playerId).length +
                       this.state.towers.filter(t => t.owner === playerId).length;
    if (totalCount >= 25) return;

    const base = this.state.bases[playerId];
    const spawnPos = this.findFreeSpawnPosition(base.position);
    if (!spawnPos) return;

    const newUnit = createUnit(unitType, playerId, spawnPos);

    if (unitType === 'attack_tower' || unitType === 'ice_tower') {
      this.state.towers.push(newUnit as Tower);
    } else {
      this.state.units.push(newUnit as Unit);
    }
  }

  private findFreeSpawnPosition(basePos: HexCoord): HexCoord | null {
    const neighbors = getHexNeighbors(basePos);
    const occupied = new Set<string>();
    for (const t of this.state.towers) {
      occupied.add(coordKey(t.position));
    }
    for (const u of this.state.units) {
      occupied.add(coordKey(u.position));
    }

    for (const n of neighbors) {
      if (n.q >= 0 && n.q < GRID_SIZE && n.r >= 0 && n.r < GRID_SIZE && !occupied.has(coordKey(n))) {
        return n;
      }
    }
    return null;
  }

  private getBlockedSet(): Set<string> {
    const blocked = new Set<string>();
    for (const t of this.state.towers) {
      blocked.add(coordKey(t.position));
    }
    return blocked;
  }

  private getTerrainWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    for (const t of this.state.towers) {
      const towerKey = coordKey(t.position);
      for (const neighbor of getHexNeighbors(t.position)) {
        const nKey = coordKey(neighbor);
        const currentWeight = weights.get(nKey) || 1;
        weights.set(nKey, currentWeight + (t.owner === 'red' ? 0 : 0.5));
      }
    }
    return weights;
  }

  private update(dt: number) {
    if (this.state.status !== 'playing') return;

    this.state.tick++;
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - dt);

    if (this.state.timeRemaining <= 0) {
      this.endGameByScore();
      return;
    }

    const blocked = this.getBlockedSet();
    const terrainWeights = Object.fromEntries(this.getTerrainWeights());

    for (const unit of this.state.units) {
      this.updateUnit(unit, dt, blocked, terrainWeights);
    }

    for (const tower of this.state.towers) {
      this.updateTower(tower, dt);
    }

    this.updateCrystal(dt);
    this.updateParticles(dt);
    this.cleanupDeadUnits();
    this.checkWinCondition();
  }

  private updateUnit(unit: Unit, dt: number, blocked: Set<string>, terrainWeights: Record<string, number>) {
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

    if (unit.attackTimer > 0) {
      unit.attackTimer = Math.max(0, unit.attackTimer - dt);
    }

    const targetInfo = this.findNearestEnemyTarget(unit);

    if (targetInfo) {
      const dist = targetInfo.distance;

      if (dist <= unit.stats.range) {
        unit.isAttacking = true;
        if (unit.attackTimer <= 0) {
          this.performAttack(unit, targetInfo.target);
          unit.attackTimer = unit.stats.attackCooldown;
          unit.attackFlashTimer = 0.1;
        }
      } else {
        unit.isAttacking = false;
        this.moveTowardsTarget(unit, targetInfo.target.position, dt, blocked, terrainWeights);
      }
    } else {
      unit.isAttacking = false;
      const enemyBase = this.state.bases[unit.owner === 'red' ? 'blue' : 'red'];
      this.moveTowardsTarget(unit, enemyBase.position, dt, blocked, terrainWeights);

      const baseDist = hexDistance(unit.position, enemyBase.position);
      if (baseDist <= unit.stats.range && unit.attackTimer <= 0) {
        this.attackBase(unit, enemyBase);
        unit.attackTimer = unit.stats.attackCooldown;
        unit.attackFlashTimer = 0.1;
      }
    }

    if (unit.stats.speed > 0) {
      this.addTrailParticle(unit);
    }
  }

  private moveTowardsTarget(
    unit: Unit,
    targetPos: HexCoord,
    dt: number,
    blocked: Set<string>,
    terrainWeights: Record<string, number>
  ) {
    if (unit.path.length === 0 || this.state.tick % 30 === 0) {
      const path = aStarSearch(unit.position, targetPos, GRID_SIZE, blocked, terrainWeights, true);
      if (path && path.length > 1) {
        unit.path = path.slice(1);
      }
    }

    if (unit.path.length > 0) {
      const nextHex = unit.path[0];
      const targetPixel = hexToPixel(nextHex.q, nextHex.r);
      const dx = targetPixel.x - unit.pixelX;
      const dy = targetPixel.y - unit.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const speed = unit.stats.speed * HEX_SIZE * (1 - unit.slowAmount);
      const moveAmount = speed * dt;

      if (dist <= moveAmount) {
        unit.pixelX = targetPixel.x;
        unit.pixelY = targetPixel.y;
        unit.position = nextHex;
        unit.path.shift();
      } else {
        unit.pixelX += (dx / dist) * moveAmount;
        unit.pixelY += (dy / dist) * moveAmount;
      }
    }
  }

  private findNearestEnemyTarget(unit: Unit): { target: Unit | Tower; distance: number; type: 'unit' | 'tower' } | null {
    let nearest: { target: Unit | Tower; distance: number; type: 'unit' | 'tower' } | null = null;
    const enemyPlayer = unit.owner === 'red' ? 'blue' : 'red';

    for (const enemy of this.state.units) {
      if (enemy.owner === enemyPlayer && enemy.hp > 0) {
        const dist = hexDistance(unit.position, enemy.position);
        if (!nearest || dist < nearest.distance) {
          nearest = { target: enemy, distance: dist, type: 'unit' };
        }
      }
    }

    for (const tower of this.state.towers) {
      if (tower.owner === enemyPlayer && tower.hp > 0) {
        const dist = hexDistance(unit.position, tower.position);
        if (!nearest || dist < nearest.distance) {
          nearest = { target: tower, distance: dist, type: 'tower' };
        }
      }
    }

    return nearest;
  }

  private performAttack(attacker: Unit, target: Unit | Tower) {
    target.hp -= attacker.stats.attack;

    if (attacker.stats.slowEffect && 'slowTimer' in target) {
      (target as Unit).slowAmount = attacker.stats.slowEffect;
      (target as Unit).slowTimer = attacker.stats.slowDuration || 2;
    }

    this.spawnHitParticles(
      'pixelX' in target ? target.pixelX : hexToPixel(target.position.q, target.position.r).x,
      'pixelY' in target ? target.pixelY : hexToPixel(target.position.q, target.position.r).y,
      attacker.owner
    );
  }

  private attackBase(attacker: Unit, base: Base) {
    base.hp -= attacker.stats.attack;
    const pixel = hexToPixel(base.position.q, base.position.r);
    this.spawnHitParticles(pixel.x, pixel.y, attacker.owner);
  }

  private updateTower(tower: Tower, dt: number) {
    if (tower.spawnAnimTimer > 0) {
      tower.spawnAnimTimer = Math.max(0, tower.spawnAnimTimer - dt);
    }

    if (tower.attackFlashTimer > 0) {
      tower.attackFlashTimer = Math.max(0, tower.attackFlashTimer - dt);
    }

    if (tower.attackTimer > 0) {
      tower.attackTimer = Math.max(0, tower.attackTimer - dt);
    }

    const targetInfo = this.findNearestEnemyForTower(tower);
    if (targetInfo && tower.attackTimer <= 0) {
      this.performTowerAttack(tower, targetInfo.target as Unit);
      tower.attackTimer = tower.stats.attackCooldown;
      tower.attackFlashTimer = 0.1;
    }
  }

  private findNearestEnemyForTower(tower: Tower): { target: Unit | Tower; distance: number } | null {
    let nearest: { target: Unit | Tower; distance: number } | null = null;
    const enemyPlayer = tower.owner === 'red' ? 'blue' : 'red';

    for (const enemy of this.state.units) {
      if (enemy.owner === enemyPlayer && enemy.hp > 0) {
        const dist = hexDistance(tower.position, enemy.position);
        if (dist <= tower.stats.range && (!nearest || dist < nearest.distance)) {
          nearest = { target: enemy, distance: dist };
        }
      }
    }

    return nearest;
  }

  private performTowerAttack(tower: Tower, target: Unit) {
    target.hp -= tower.stats.attack;

    if (tower.stats.slowEffect) {
      target.slowAmount = tower.stats.slowEffect;
      target.slowTimer = tower.stats.slowDuration || 2;
    }

    const pixel = hexToPixel(target.position.q, target.position.r);
    this.spawnHitParticles(pixel.x, pixel.y, tower.owner);
  }

  private updateCrystal(dt: number) {
    const crystal = this.state.crystal;
    const redUnitsNear = this.countUnitsNear('red', crystal.position, 1);
    const blueUnitsNear = this.countUnitsNear('blue', crystal.position, 1);

    if (redUnitsNear > 0 && blueUnitsNear === 0) {
      if (crystal.capturingPlayer !== 'red') {
        crystal.capturingPlayer = 'red';
        crystal.captureStartTime = Date.now();
        crystal.captureProgress = 0;
      }
      crystal.captureProgress += dt;
      if (crystal.captureProgress >= 1 && crystal.owner !== 'red') {
        crystal.owner = 'red';
        this.state.scores.red++;
        this.spawnCaptureParticles(crystal.position, 'red');
      }
    } else if (blueUnitsNear > 0 && redUnitsNear === 0) {
      if (crystal.capturingPlayer !== 'blue') {
        crystal.capturingPlayer = 'blue';
        crystal.captureStartTime = Date.now();
        crystal.captureProgress = 0;
      }
      crystal.captureProgress += dt;
      if (crystal.captureProgress >= 1 && crystal.owner !== 'blue') {
        crystal.owner = 'blue';
        this.state.scores.blue++;
        this.spawnCaptureParticles(crystal.position, 'blue');
      }
    } else {
      crystal.capturingPlayer = null;
      crystal.captureProgress = 0;
    }
  }

  private countUnitsNear(player: PlayerId, pos: HexCoord, range: number): number {
    let count = 0;
    for (const u of this.state.units) {
      if (u.owner === player && u.hp > 0 && hexDistance(u.position, pos) <= range) {
        count++;
      }
    }
    return count;
  }

  private addTrailParticle(unit: Unit) {
    if (this.state.tick % 3 !== 0) return;
    const color = unit.owner === 'red' ? '#ff6644' : '#4488ff';
    this.state.particles.push({
      x: unit.pixelX,
      y: unit.pixelY,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.5,
      maxLife: 0.5,
      color,
      size: 3,
    });
  }

  private spawnHitParticles(x: number, y: number, attacker: PlayerId) {
    const color = attacker === 'red' ? '#ff4444' : '#4488ff';
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        life: 0.3,
        maxLife: 0.3,
        color,
        size: 4,
      });
    }
  }

  private spawnCaptureParticles(pos: HexCoord, player: PlayerId) {
    const pixel = hexToPixel(pos.q, pos.r);
    const color = player === 'red' ? '#ff4444' : '#4488ff';
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      this.state.particles.push({
        x: pixel.x,
        y: pixel.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        color,
        size: 5,
      });
    }
  }

  private spawnExplosionParticles(pos: HexCoord) {
    const pixel = hexToPixel(pos.q, pos.r);
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      this.state.particles.push({
        x: pixel.x,
        y: pixel.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: '#ff8844',
        size: 6,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private cleanupDeadUnits() {
    for (let i = this.state.units.length - 1; i >= 0; i--) {
      if (this.state.units[i].hp <= 0) {
        const unit = this.state.units[i];
        this.spawnDeathParticles(unit);
        this.state.units.splice(i, 1);
      }
    }
    for (let i = this.state.towers.length - 1; i >= 0; i--) {
      if (this.state.towers[i].hp <= 0) {
        const tower = this.state.towers[i];
        this.spawnDeathParticles(tower);
        this.state.towers.splice(i, 1);
      }
    }
  }

  private spawnDeathParticles(entity: Unit | Tower) {
    const x = 'pixelX' in entity ? entity.pixelX : hexToPixel(entity.position.q, entity.position.r).x;
    const y = 'pixelY' in entity ? entity.pixelY : hexToPixel(entity.position.q, entity.position.r).y;
    const color = entity.owner === 'red' ? '#ff6644' : '#66aaff';
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        color,
        size: 4,
      });
    }
  }

  private checkWinCondition() {
    if (this.state.bases.red.hp <= 0) {
      this.endGame('blue');
    } else if (this.state.bases.blue.hp <= 0) {
      this.endGame('red');
    }
  }

  private endGameByScore() {
    if (this.state.scores.red > this.state.scores.blue) {
      this.endGame('red');
    } else if (this.state.scores.blue > this.state.scores.red) {
      this.endGame('blue');
    } else {
      this.endGame('draw');
    }
  }

  private endGame(winner: PlayerId | 'draw') {
    if (this.state.status === 'ended') return;

    this.state.status = 'ended';
    this.state.winner = winner;
    this.stop();

    if (winner !== 'draw') {
      const loserBase = this.state.bases[winner === 'red' ? 'blue' : 'red'];
      this.spawnExplosionParticles(loserBase.position);
    }

    this.sendFullState();

    if (this.onGameOverCallback) {
      this.onGameOverCallback(winner);
    }
  }

  private computeDelta(): StateDelta | null {
    if (!this.lastSentState) {
      return null;
    }

    const delta: StateDelta = { tick: this.state.tick };
    let hasChanges = false;

    const unitDeltas: UnitDelta[] = [];
    const removedUnits: string[] = [];
    const lastUnits = new Map(this.lastSentState.units.map(u => [u.id, u]));
    for (const u of this.state.units) {
      const last = lastUnits.get(u.id);
      if (!last) {
        unitDeltas.push({ ...u });
        hasChanges = true;
      } else {
        const d: UnitDelta = { id: u.id };
        if (u.pixelX !== last.pixelX) { d.pixelX = u.pixelX; hasChanges = true; }
        if (u.pixelY !== last.pixelY) { d.pixelY = u.pixelY; hasChanges = true; }
        if (u.hp !== last.hp) { d.hp = u.hp; hasChanges = true; }
        if (u.position.q !== last.position.q || u.position.r !== last.position.r) {
          d.position = u.position; hasChanges = true;
        }
        if (u.attackFlashTimer !== last.attackFlashTimer) {
          d.attackFlashTimer = u.attackFlashTimer; hasChanges = true;
        }
        if (u.slowTimer !== last.slowTimer) {
          d.slowTimer = u.slowTimer; hasChanges = true;
        }
        if (u.spawnAnimTimer !== last.spawnAnimTimer) {
          d.spawnAnimTimer = u.spawnAnimTimer; hasChanges = true;
        }
        if (Object.keys(d).length > 1) unitDeltas.push(d);
      }
      lastUnits.delete(u.id);
    }
    for (const [id] of lastUnits) {
      removedUnits.push(id);
      hasChanges = true;
    }

    const towerDeltas: TowerDelta[] = [];
    const removedTowers: string[] = [];
    const lastTowers = new Map(this.lastSentState.towers.map(t => [t.id, t]));
    for (const t of this.state.towers) {
      const last = lastTowers.get(t.id);
      if (!last) {
        towerDeltas.push({ ...t });
        hasChanges = true;
      } else {
        const d: TowerDelta = { id: t.id };
        if (t.hp !== last.hp) { d.hp = t.hp; hasChanges = true; }
        if (t.attackFlashTimer !== last.attackFlashTimer) {
          d.attackFlashTimer = t.attackFlashTimer; hasChanges = true;
        }
        if (t.spawnAnimTimer !== last.spawnAnimTimer) {
          d.spawnAnimTimer = t.spawnAnimTimer; hasChanges = true;
        }
        if (Object.keys(d).length > 1) towerDeltas.push(d);
      }
      lastTowers.delete(t.id);
    }
    for (const [id] of lastTowers) {
      removedTowers.push(id);
      hasChanges = true;
    }

    if (unitDeltas.length > 0) delta.units = unitDeltas;
    if (removedUnits.length > 0) delta.removedUnits = removedUnits;
    if (towerDeltas.length > 0) delta.towers = towerDeltas;
    if (removedTowers.length > 0) delta.removedTowers = removedTowers;

    if (this.state.particles.length > 0) {
      delta.particles = this.state.particles;
      hasChanges = true;
    }

    const lastCrystal = this.lastSentState.crystal;
    if (this.state.crystal.captureProgress !== lastCrystal.captureProgress ||
        this.state.crystal.owner !== lastCrystal.owner ||
        this.state.crystal.capturingPlayer !== lastCrystal.capturingPlayer) {
      delta.crystal = { ...this.state.crystal };
      hasChanges = true;
    }

    if (this.state.bases.red.hp !== this.lastSentState.bases.red.hp ||
        this.state.bases.blue.hp !== this.lastSentState.bases.blue.hp) {
      delta.bases = {
        red: { hp: this.state.bases.red.hp },
        blue: { hp: this.state.bases.blue.hp },
      };
      hasChanges = true;
    }

    if (this.state.scores.red !== this.lastSentState.scores.red ||
        this.state.scores.blue !== this.lastSentState.scores.blue) {
      delta.scores = { ...this.state.scores };
      hasChanges = true;
    }

    if (this.state.timeRemaining !== this.lastSentState.timeRemaining) {
      delta.timeRemaining = this.state.timeRemaining;
      hasChanges = true;
    }

    if (this.state.status !== this.lastSentState.status) {
      delta.status = this.state.status;
      delta.winner = this.state.winner;
      hasChanges = true;
    }

    return hasChanges ? delta : null;
  }

  private sendFullState() {
    const message = JSON.stringify({
      type: 'game_state',
      state: this.state,
    });
    this.broadcast(message);
    this.lastSentState = JSON.parse(JSON.stringify(this.state));
  }

  private sendFullStateToPlayer(playerId: PlayerId) {
    const message = JSON.stringify({
      type: 'game_state',
      state: this.state,
    });
    this.sendToPlayer(playerId, message);
  }

  private sendDeltaState() {
    const delta = this.computeDelta();
    if (delta) {
      const message = JSON.stringify({
        type: 'state_delta',
        delta,
      });
      this.broadcast(message);
      this.lastSentState = JSON.parse(JSON.stringify(this.state));
    }
  }

  private broadcast(message: string) {
    for (const [, player] of this.players) {
      if (player.ws.readyState === 1) {
        player.ws.send(message);
      }
    }
  }

  private sendToPlayer(playerId: PlayerId, message: any) {
    const player = this.players.get(playerId);
    if (player && player.ws.readyState === 1) {
      player.ws.send(JSON.stringify(message));
    }
  }
}
