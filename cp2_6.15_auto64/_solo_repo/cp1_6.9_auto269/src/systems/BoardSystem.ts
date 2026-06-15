import { Piece, Position } from '../entities/Piece';

export const BOARD_SIZE = 8;
export const CELL_SIZE = 60;
export const CORE_NODE_COUNT = 6;

export interface CellData {
  x: number;
  y: number;
  occupied: boolean;
  occupantId: string | null;
  isCoreNode: boolean;
  ownerPlayerId: number | null;
  isSlowZone: boolean;
}

export class BoardSystem {
  public cells: CellData[][];
  public coreNodes: Position[];
  public size: number;
  public cellSize: number;

  constructor() {
    this.size = BOARD_SIZE;
    this.cellSize = CELL_SIZE;
    this.cells = [];
    this.coreNodes = [];
    this.initializeBoard();
    this.generateCoreNodes();
    this.initializeStartingNodes();
  }

  private initializeBoard(): void {
    for (let y = 0; y < this.size; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.cells[y][x] = {
          x,
          y,
          occupied: false,
          occupantId: null,
          isCoreNode: false,
          ownerPlayerId: null,
          isSlowZone: false
        };
      }
    }
  }

  private generateCoreNodes(): void {
    const availablePositions: Position[] = [];
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 5; x++) {
        availablePositions.push({ x, y });
      }
    }

    this.shuffleArray(availablePositions);
    this.coreNodes = availablePositions.slice(0, CORE_NODE_COUNT);

    for (const node of this.coreNodes) {
      this.cells[node.y][node.x].isCoreNode = true;
    }
  }

  private initializeStartingNodes(): void {
    const player1Start: Position[] = [
      { x: 0, y: 7 },
      { x: 7, y: 7 }
    ];
    const player2Start: Position[] = [
      { x: 0, y: 0 },
      { x: 7, y: 0 }
    ];

    for (const pos of player1Start) {
      this.cells[pos.y][pos.x].isCoreNode = true;
      this.cells[pos.y][pos.x].ownerPlayerId = 1;
      this.coreNodes.push(pos);
    }
    for (const pos of player2Start) {
      this.cells[pos.y][pos.x].isCoreNode = true;
      this.cells[pos.y][pos.x].ownerPlayerId = 2;
      this.coreNodes.push(pos);
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public isValidPosition(pos: Position): boolean {
    return pos.x >= 0 && pos.x < this.size && pos.y >= 0 && pos.y < this.size;
  }

  public getCell(pos: Position): CellData | null {
    if (!this.isValidPosition(pos)) return null;
    return this.cells[pos.y][pos.x];
  }

  public isCellOccupied(pos: Position): boolean {
    const cell = this.getCell(pos);
    return cell !== null && cell.occupied;
  }

  public canPlayerStandOn(pos: Position, playerId: number, pieces: Piece[]): boolean {
    const cell = this.getCell(pos);
    if (!cell) return false;
    if (cell.occupied) return false;

    const occupyingPiece = pieces.find(p =>
      p.position.x === pos.x && p.position.y === pos.y && p.isAlive()
    );
    if (occupyingPiece) return false;

    if (cell.isCoreNode) {
      return cell.ownerPlayerId === null || cell.ownerPlayerId === playerId;
    }

    return cell.ownerPlayerId === null || cell.ownerPlayerId === playerId;
  }

  public occupyCell(pos: Position, pieceId: string): boolean {
    const cell = this.getCell(pos);
    if (!cell) return false;
    cell.occupied = true;
    cell.occupantId = pieceId;
    return true;
  }

  public vacateCell(pos: Position): boolean {
    const cell = this.getCell(pos);
    if (!cell) return false;
    cell.occupied = false;
    cell.occupantId = null;
    return true;
  }

  public captureCoreNode(pos: Position, playerId: number): boolean {
    const cell = this.getCell(pos);
    if (!cell || !cell.isCoreNode) return false;
    cell.ownerPlayerId = playerId;
    return true;
  }

  public getPlayerNodeCount(playerId: number): number {
    let count = 0;
    for (const node of this.coreNodes) {
      const cell = this.cells[node.y][node.x];
      if (cell.ownerPlayerId === playerId) count++;
    }
    return count;
  }

  public getUncapturedCoreNodes(): Position[] {
    return this.coreNodes.filter(node =>
      this.cells[node.y][node.x].ownerPlayerId === null
    );
  }

  public getMovablePositions(piece: Piece, pieces: Piece[]): Position[] {
    const result: Position[] = [];
    const movePower = piece.config.movePower;

    for (let dy = -movePower; dy <= movePower; dy++) {
      for (let dx = -movePower; dx <= movePower; dx++) {
        const target: Position = {
          x: piece.position.x + dx, y: piece.position.y + dy };
        if (piece.manhattanDistanceTo(target) > movePower) continue;
        if (!this.isValidPosition(target)) continue;
        if (target.x === piece.position.x && target.y === piece.position.y) continue;
        if (this.canPlayerStandOn(target, piece.playerId, pieces)) {
          result.push(target);
        }
      }
    }
    return result;
  }

  public getAttackablePositions(piece: Piece, pieces: Piece[]): Position[] {
    const result: Position[] = [];
    const range = piece.config.attackRange;

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const target: Position = {
          x: piece.position.x + dx, y: piece.position.y + dy };
        if (!piece.canAttack(target)) continue;
        if (!this.isValidPosition(target)) continue;
        const enemy = pieces.find(p =>
          p.position.x === target.x && p.position.y === target.y &&
          p.playerId !== piece.playerId && p.isAlive()
        );
        if (enemy) {
          result.push(target);
        }
      }
    }
    return result;
  }

  public getLegalMoveTargets(piece: Piece, pieces: Piece[]): { moves: Position[], attacks: Position[] } {
    return {
      moves: this.getMovablePositions(piece, pieces),
      attacks: this.getAttackablePositions(piece, pieces)
    };
  }

  public findNearestCoreNode(pos: Position, playerId: number): Position | null {
    const uncaptured = this.getUncapturedCoreNodes().filter(n => {
      const cell = this.cells[n.y][n.x];
      return cell.ownerPlayerId === null || cell.ownerPlayerId !== playerId;
    });
    if (uncaptured.length === 0) return null;

    let nearest: Position | null = null;
    let minDist = Infinity;
    for (const node of uncaptured) {
      const dist = Math.abs(pos.x - node.x) + Math.abs(pos.y - node.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }
    return nearest;
  }

  public findNearestEnemy(pos: Position, playerId: number, pieces: Piece[]): Piece | null {
    const enemies = pieces.filter(p => p.playerId !== playerId && p.isAlive());
    if (enemies.length === 0) return null;

    let nearest: Piece | null = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const dist = Math.abs(pos.x - enemy.position.x) + Math.abs(pos.y - enemy.position.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  public gridToPixel(pos: Position, offsetX: number = 0, offsetY: number = 0): { x: number; y: number } {
    return {
      x: offsetX + pos.x * this.cellSize + this.cellSize / 2,
      y: offsetY + pos.y * this.cellSize + this.cellSize / 2
    };
  }

  public pixelToGrid(px: number, py: number, offsetX: number = 0, offsetY: number = 0): Position {
    return {
      x: Math.floor((px - offsetX) / this.cellSize),
      y: Math.floor((py - offsetY) / this.cellSize)
    };
  }
}
