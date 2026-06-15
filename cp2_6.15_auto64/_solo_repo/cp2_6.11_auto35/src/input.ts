import { Game, HexCoord, pixelToAxial, Piece } from './core';

export type InputAction =
  | { type: 'selectPiece'; pieceId: string; piece: Piece }
  | { type: 'move'; pieceId: string; to: HexCoord }
  | { type: 'attack'; pieceId: string; target: HexCoord }
  | { type: 'cancel' }
  | { type: 'hover'; hex: HexCoord | null };

export class InputHandler {
  canvas: HTMLCanvasElement;
  game: Game;
  originX: number;
  originY: number;
  selectedPieceId: string | null = null;
  private listeners: ((action: InputAction) => void)[] = [];

  constructor(canvas: HTMLCanvasElement, game: Game, originX: number, originY: number) {
    this.canvas = canvas;
    this.game = game;
    this.originX = originX;
    this.originY = originY;
    this.attach();
  }

  onAction(fn: (action: InputAction) => void): void {
    this.listeners.push(fn);
  }

  private emit(action: InputAction): void {
    this.listeners.forEach(l => l(action));
  }

  private getCanvasCoords(ev: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (ev.clientX - rect.left) * scaleX,
      y: (ev.clientY - rect.top) * scaleY
    };
  }

  private handleClick = (ev: MouseEvent): void => {
    if (this.game.gameOver) return;

    const { x, y } = this.getCanvasCoords(ev);
    const hex = pixelToAxial(x, y, this.originX, this.originY);
    const cell = this.game.grid.getCell(hex);
    if (!cell) {
      this.selectedPieceId = null;
      this.emit({ type: 'cancel' });
      return;
    }

    if (this.selectedPieceId) {
      const piece = this.game.pieces.get(this.selectedPieceId);
      if (!piece) {
        this.selectedPieceId = null;
        this.emit({ type: 'cancel' });
        return;
      }

      if (cell.pieceId && cell.pieceId !== this.selectedPieceId) {
        const attackable = this.game.getAttackableHexes(piece);
        if (attackable.some(h => h.q === hex.q && h.r === hex.r)) {
          this.emit({ type: 'attack', pieceId: this.selectedPieceId, target: hex });
          return;
        }
      }

      if (!cell.pieceId) {
        const movable = this.game.getMovableHexes(piece);
        if (movable.some(h => h.q === hex.q && h.r === hex.r)) {
          this.emit({ type: 'move', pieceId: this.selectedPieceId, to: hex });
          return;
        }
      }
    }

    if (cell.pieceId) {
      const piece = this.game.pieces.get(cell.pieceId);
      if (piece && piece.faction === this.game.currentFaction) {
        this.selectedPieceId = piece.id;
        this.emit({ type: 'selectPiece', pieceId: piece.id, piece });
        return;
      }
    }

    this.selectedPieceId = null;
    this.emit({ type: 'cancel' });
  };

  private handleMouseMove = (ev: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(ev);
    const hex = pixelToAxial(x, y, this.originX, this.originY);
    const cell = this.game.grid.getCell(hex);
    this.emit({ type: 'hover', hex: cell ? hex : null });
  };

  attach(): void {
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
  }

  clearSelection(): void {
    this.selectedPieceId = null;
  }
}
