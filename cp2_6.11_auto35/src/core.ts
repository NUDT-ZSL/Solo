export type Faction = 'player1' | 'player2';
export type PieceType = 'sword' | 'shield';
export type TerrainType = 'normal' | 'highland' | 'swamp' | 'altar';

export interface HexCoord {
  q: number;
  r: number;
}

export interface PieceState {
  id: string;
  faction: Faction;
  type: PieceType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  position: HexCoord;
  hasMoved: boolean;
  hasAttacked: boolean;
  altarTurns: number;
}

export interface HexCell {
  coord: HexCoord;
  terrain: TerrainType;
  altarOwner: Faction | null;
  pieceId: string | null;
}

export interface GameState {
  grid: Map<string, HexCell>;
  pieces: Map<string, PieceState>;
  currentFaction: Faction;
  actionPoints: Record<Faction, number>;
  altarCount: Record<Faction, number>;
  turn: number;
  gameOver: boolean;
  winner: Faction | null;
}

export interface MoveEvent {
  type: 'move';
  pieceId: string;
  from: HexCoord;
  to: HexCoord;
}

export interface AttackEvent {
  type: 'attack';
  attackerId: string;
  defenderId: string;
  damage: number;
  attackerPos: HexCoord;
  defenderPos: HexCoord;
}

export interface DeathEvent {
  type: 'death';
  pieceId: string;
  position: HexCoord;
  faction: Faction;
}

export interface SummonEvent {
  type: 'summon';
  piece: PieceState;
  fromAltar: HexCoord;
}

export type GameEvent = MoveEvent | AttackEvent | DeathEvent | SummonEvent;

const HEX_SIZE = 52;
const HEX_GAP = 2;
const GRID_RADIUS = 4;
const MAX_ACTION_POINTS = 3;
const ALTAR_WIN_COUNT = 5;
const MOVE_COST = 1;
const ATTACK_COST = 1;

const PIECE_STATS: Record<PieceType, { hp: number; attack: number; defense: number }> = {
  sword: { hp: 20, attack: 10, defense: 5 },
  shield: { hp: 30, attack: 5, defense: 10 }
};

const HEX_DIRS: HexCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function hexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle)
    });
  }
  return corners;
}

export function axialToPixel(hex: HexCoord, originX: number, originY: number): { x: number; y: number } {
  const size = HEX_SIZE + HEX_GAP;
  const x = originX + size * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
  const y = originY + size * ((3 / 2) * hex.r);
  return { x, y };
}

export function pixelToAxial(px: number, py: number, originX: number, originY: number): HexCoord {
  const size = HEX_SIZE + HEX_GAP;
  const q = (Math.sqrt(3) / 3 * (px - originX) - 1 / 3 * (py - originY)) / size;
  const r = (2 / 3 * (py - originY)) / size;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): HexCoord {
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

function hexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRS.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

function inGrid(hex: HexCoord): boolean {
  return hexDistance(hex, { q: 0, r: 0 }) <= GRID_RADIUS;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let pieceIdCounter = 0;
function newPieceId(): string {
  return `p${++pieceIdCounter}`;
}

export class HexGrid {
  cells: Map<string, HexCell> = new Map();

  constructor() {
    this.initialize();
  }

  initialize(): void {
    this.cells.clear();
    for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
      const rMin = Math.max(-GRID_RADIUS, -q - GRID_RADIUS);
      const rMax = Math.min(GRID_RADIUS, -q + GRID_RADIUS);
      for (let r = rMin; r <= rMax; r++) {
        this.cells.set(hexKey(q, r), {
          coord: { q, r },
          terrain: 'normal',
          altarOwner: null,
          pieceId: null
        });
      }
    }
  }

  getCell(hex: HexCoord): HexCell | undefined {
    return this.cells.get(hexKey(hex.q, hex.r));
  }

  getAllCells(): HexCell[] {
    return Array.from(this.cells.values());
  }

  getCellsInRadius(center: HexCoord, radius: number): HexCell[] {
    const results: HexCell[] = [];
    for (let dq = -radius; dq <= radius; dq++) {
      const rMin = Math.max(-radius, -dq - radius);
      const rMax = Math.min(radius, -dq + radius);
      for (let dr = rMin; dr <= rMax; dr++) {
        const cell = this.getCell({ q: center.q + dq, r: center.r + dr });
        if (cell) results.push(cell);
      }
    }
    return results;
  }
}

export class Piece implements PieceState {
  id: string;
  faction: Faction;
  type: PieceType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  position: HexCoord;
  hasMoved: boolean = false;
  hasAttacked: boolean = false;
  altarTurns: number = 0;

  constructor(faction: Faction, type: PieceType, position: HexCoord) {
    this.id = newPieceId();
    this.faction = faction;
    this.type = type;
    this.position = { ...position };
    const stats = PIECE_STATS[type];
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.attack = stats.attack;
    this.defense = stats.defense;
  }
}

export class CombatSystem {
  static calculateDamage(attacker: PieceState, defender: PieceState, terrain: TerrainType): number {
    const atkFactor = 0.8 + Math.random() * 0.4;
    const defFactor = 0.8 + Math.random() * 0.4;
    let atk = attacker.attack * atkFactor;
    let def = defender.defense * defFactor;
    if (terrain === 'highland') def += 2;
    if (terrain === 'swamp') atk = Math.max(0, atk - 2);
    const damage = Math.max(1, Math.round(atk - def * 0.5));
    return damage;
  }
}

export class TurnManager {
  private listeners: ((events: GameEvent[]) => void)[] = [];

  onEvents(fn: (events: GameEvent[]) => void): void {
    this.listeners.push(fn);
  }

  emit(events: GameEvent[]): void {
    this.listeners.forEach(l => l(events));
  }
}

export class Game {
  grid: HexGrid;
  pieces: Map<string, Piece> = new Map();
  currentFaction: Faction = 'player1';
  actionPoints: Record<Faction, number> = { player1: MAX_ACTION_POINTS, player2: MAX_ACTION_POINTS };
  altarCount: Record<Faction, number> = { player1: 0, player2: 0 };
  turn: number = 1;
  gameOver: boolean = false;
  winner: Faction | null = null;
  turnManager: TurnManager;
  private pendingSummons: { altar: HexCoord; faction: Faction; delay: number }[] = [];

  constructor() {
    this.grid = new HexGrid();
    this.turnManager = new TurnManager();
  }

  getState(): GameState {
    const pieceStates = new Map<string, PieceState>();
    this.pieces.forEach(p => pieceStates.set(p.id, { ...p, position: { ...p.position } }));
    return {
      grid: new Map(this.grid.cells),
      pieces: pieceStates,
      currentFaction: this.currentFaction,
      actionPoints: { ...this.actionPoints },
      altarCount: { ...this.altarCount },
      turn: this.turn,
      gameOver: this.gameOver,
      winner: this.winner
    };
  }

  startNewGame(): void {
    pieceIdCounter = 0;
    this.grid.initialize();
    this.pieces.clear();
    this.currentFaction = 'player1';
    this.actionPoints = { player1: MAX_ACTION_POINTS, player2: MAX_ACTION_POINTS };
    this.altarCount = { player1: 0, player2: 0 };
    this.turn = 1;
    this.gameOver = false;
    this.winner = null;
    this.pendingSummons = [];
    this.generateTerrain();
    this.placeInitialPieces();
    this.turnManager.emit([]);
  }

  private generateTerrain(): void {
    const allCells = shuffle(this.grid.getAllCells().filter(c => {
      const d = hexDistance(c.coord, { q: 0, r: 0 });
      return d > 0;
    }));

    const centerCells = allCells.filter(c => hexDistance(c.coord, { q: 0, r: 0 }) <= 2);
    const altarCount = randInt(3, 5);
    const chosenAltars = shuffle(centerCells).slice(0, Math.min(altarCount, centerCells.length));
    chosenAltars.forEach(c => { c.terrain = 'altar'; });

    const edgeCells = allCells.filter(c => {
      const d = hexDistance(c.coord, { q: 0, r: 0 });
      return d >= 3 && c.terrain === 'normal';
    });
    const shuffledEdge = shuffle(edgeCells);
    for (let i = 0; i < 3 && i < shuffledEdge.length; i++) {
      shuffledEdge[i].terrain = 'highland';
    }
    for (let i = 3; i < 5 && i < shuffledEdge.length; i++) {
      shuffledEdge[i].terrain = 'swamp';
    }
  }

  private placeInitialPieces(): void {
    const p1Positions = [
      { q: -4, r: 0 }, { q: -4, r: 1 }, { q: -4, r: 2 },
      { q: -3, r: -1 }, { q: -3, r: 0 }
    ];
    const p2Positions = [
      { q: 4, r: 0 }, { q: 4, r: -1 }, { q: 4, r: -2 },
      { q: 3, r: 1 }, { q: 3, r: 0 }
    ];

    p1Positions.forEach((pos, i) => {
      if (!this.grid.getCell(pos)) return;
      const type: PieceType = i % 2 === 0 ? 'sword' : 'shield';
      this.addPiece(new Piece('player1', type, pos));
    });
    p2Positions.forEach((pos, i) => {
      if (!this.grid.getCell(pos)) return;
      const type: PieceType = i % 2 === 0 ? 'sword' : 'shield';
      this.addPiece(new Piece('player2', type, pos));
    });
  }

  private addPiece(piece: Piece): void {
    this.pieces.set(piece.id, piece);
    const cell = this.grid.getCell(piece.position);
    if (cell) cell.pieceId = piece.id;
  }

  getPieceAt(hex: HexCoord): Piece | null {
    const cell = this.grid.getCell(hex);
    if (!cell || !cell.pieceId) return null;
    return this.pieces.get(cell.pieceId) || null;
  }

  getMovableHexes(piece: Piece): HexCoord[] {
    if (piece.hasMoved || this.actionPoints[piece.faction] < MOVE_COST) return [];
    const results: HexCoord[] = [];
    const visited = new Set<string>();
    visited.add(hexKey(piece.position.q, piece.position.r));
    const queue: { hex: HexCoord; cost: number }[] = [{ hex: piece.position, cost: 0 }];
    const maxRange = 2;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.cost >= maxRange) continue;

      for (const n of hexNeighbors(current.hex)) {
        const key = hexKey(n.q, n.r);
        if (visited.has(key)) continue;
        if (!inGrid(n)) continue;
        const cell = this.grid.getCell(n);
        if (!cell) continue;
        if (cell.pieceId) continue;

        visited.add(key);
        let stepCost = MOVE_COST;
        if (cell.terrain === 'swamp') stepCost *= 2;
        const newCost = current.cost + stepCost;
        if (newCost <= maxRange) {
          results.push(n);
          queue.push({ hex: n, cost: newCost });
        }
      }
    }
    return results;
  }

  getAttackableHexes(piece: Piece): HexCoord[] {
    if (piece.hasAttacked || this.actionPoints[piece.faction] < ATTACK_COST) return [];
    const results: HexCoord[] = [];
    for (const n of hexNeighbors(piece.position)) {
      if (!inGrid(n)) continue;
      const cell = this.grid.getCell(n);
      if (!cell || !cell.pieceId) continue;
      const target = this.pieces.get(cell.pieceId);
      if (target && target.faction !== piece.faction) {
        results.push(n);
      }
    }
    return results;
  }

  movePiece(pieceId: string, to: HexCoord): GameEvent[] {
    if (this.gameOver) return [];
    const piece = this.pieces.get(pieceId);
    if (!piece || piece.faction !== this.currentFaction) return [];
    if (piece.hasMoved) return [];
    if (this.actionPoints[piece.faction] < MOVE_COST) return [];

    const movable = this.getMovableHexes(piece);
    if (!movable.some(h => h.q === to.q && h.r === to.r)) return [];

    const events: GameEvent[] = [];
    const from = { ...piece.position };

    const fromCell = this.grid.getCell(from);
    if (fromCell) fromCell.pieceId = null;

    piece.position = { ...to };
    piece.hasMoved = true;
    this.actionPoints[piece.faction] -= MOVE_COST;

    const toCell = this.grid.getCell(to);
    if (toCell) toCell.pieceId = pieceId;

    events.push({ type: 'move', pieceId, from, to });

    if (toCell && toCell.terrain === 'altar' && toCell.altarOwner !== piece.faction) {
      piece.altarTurns++;
      if (piece.altarTurns >= 2) {
        if (toCell.altarOwner) {
          this.altarCount[toCell.altarOwner]--;
        }
        toCell.altarOwner = piece.faction;
        this.altarCount[piece.faction]++;
        piece.hp = Math.max(1, piece.hp - 5);
        piece.altarTurns = 0;

        const adjEmpty = hexNeighbors(to).filter(n => {
          if (!inGrid(n)) return false;
          const c = this.grid.getCell(n);
          return c && !c.pieceId;
        });
        if (adjEmpty.length > 0) {
          this.pendingSummons.push({
            altar: to,
            faction: piece.faction,
            delay: 3
          });
        }
      }
    } else {
      piece.altarTurns = 0;
    }

    this.checkWinCondition();
    this.turnManager.emit(events);
    return events;
  }

  attackPiece(attackerId: string, defenderPos: HexCoord): GameEvent[] {
    if (this.gameOver) return [];
    const attacker = this.pieces.get(attackerId);
    if (!attacker || attacker.faction !== this.currentFaction) return [];
    if (attacker.hasAttacked) return [];
    if (this.actionPoints[attacker.faction] < ATTACK_COST) return [];

    const attackable = this.getAttackableHexes(attacker);
    if (!attackable.some(h => h.q === defenderPos.q && h.r === defenderPos.r)) return [];

    const defender = this.getPieceAt(defenderPos);
    if (!defender) return [];

    const events: GameEvent[] = [];
    const defenderCell = this.grid.getCell(defenderPos);
    const terrain = defenderCell?.terrain || 'normal';
    const damage = CombatSystem.calculateDamage(attacker, defender, terrain);

    attacker.hasAttacked = true;
    this.actionPoints[attacker.faction] -= ATTACK_COST;

    defender.hp -= damage;

    events.push({
      type: 'attack',
      attackerId,
      defenderId: defender.id,
      damage,
      attackerPos: { ...attacker.position },
      defenderPos: { ...defender.position }
    });

    if (defender.hp <= 0) {
      events.push({
        type: 'death',
        pieceId: defender.id,
        position: { ...defender.position },
        faction: defender.faction
      });
      if (defenderCell) defenderCell.pieceId = null;
      this.pieces.delete(defender.id);
    }

    this.checkWinCondition();
    this.turnManager.emit(events);
    return events;
  }

  endTurn(): void {
    if (this.gameOver) return;

    this.pendingSummons = this.pendingSummons.filter(s => {
      s.delay--;
      if (s.delay <= 0) {
        const adjEmpty = hexNeighbors(s.altar).filter(n => {
          if (!inGrid(n)) return false;
          const c = this.grid.getCell(n);
          return c && !c.pieceId;
        });
        if (adjEmpty.length > 0) {
          const pos = adjEmpty[randInt(0, adjEmpty.length - 1)];
          const newPiece = new Piece(s.faction, 'shield', pos);
          this.addPiece(newPiece);
          this.turnManager.emit([{
            type: 'summon',
            piece: { ...newPiece, position: { ...newPiece.position } },
            fromAltar: s.altar
          }]);
        }
        return false;
      }
      return true;
    });

    this.pieces.forEach(p => {
      p.hasMoved = false;
      p.hasAttacked = false;
    });

    this.currentFaction = this.currentFaction === 'player1' ? 'player2' : 'player1';
    this.actionPoints[this.currentFaction] = MAX_ACTION_POINTS;
    if (this.currentFaction === 'player1') this.turn++;
    this.checkWinCondition();
    this.turnManager.emit([]);
  }

  private checkWinCondition(): void {
    const p1Pieces = Array.from(this.pieces.values()).filter(p => p.faction === 'player1').length;
    const p2Pieces = Array.from(this.pieces.values()).filter(p => p.faction === 'player2').length;

    if (p1Pieces === 0) {
      this.gameOver = true;
      this.winner = 'player2';
    } else if (p2Pieces === 0) {
      this.gameOver = true;
      this.winner = 'player1';
    } else if (this.altarCount.player1 >= ALTAR_WIN_COUNT) {
      this.gameOver = true;
      this.winner = 'player1';
    } else if (this.altarCount.player2 >= ALTAR_WIN_COUNT) {
      this.gameOver = true;
      this.winner = 'player2';
    }
  }

  canEndTurn(): boolean {
    return !this.gameOver;
  }
}

export { HEX_SIZE, HEX_GAP, GRID_RADIUS, MAX_ACTION_POINTS };
