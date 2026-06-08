import { GameEngine, Piece, Player, GravityEvent, DestroyEvent, GameEvent } from './GameEngine';
import { BoardRenderer } from './BoardRenderer';

export interface PlayerState {
  currentPlayer: Player;
  turn: number;
  bluePieceCount: number;
  orangePieceCount: number;
  blueRemaining: number;
  orangeRemaining: number;
  selectedPiece: Piece | null;
  isGameOver: boolean;
  winner: Player | null;
}

export class PlayerManager {
  private engine: GameEngine;
  private renderer: BoardRenderer;
  private onStateChange: ((state: PlayerState) => void) | null = null;
  private selectedPieceId: number | null = null;
  private gravityAnimating: boolean = false;

  constructor(engine: GameEngine, renderer: BoardRenderer) {
    this.engine = engine;
    this.renderer = renderer;

    this.engine.onEvent(this.handleGameEvent.bind(this));

    this.renderer.setOnPieceClick(this.handleCellClick.bind(this));
  }

  setOnStateChange(cb: (state: PlayerState) => void) {
    this.onStateChange = cb;
  }

  private handleGameEvent(event: GameEvent) {
    if (event.type === 'gravity') {
      const events = event.data as GravityEvent[];
      this.gravityAnimating = true;
      this.renderer.addGravityAnimations(events);
      setTimeout(() => {
        this.gravityAnimating = false;
        this.emitState();
      }, 600);
    }

    if (event.type === 'destroy') {
      const de = event.data as DestroyEvent;
      this.renderer.addExplosion(de.row, de.col, de.player);
      if (this.selectedPieceId === de.pieceId) {
        this.selectedPieceId = null;
      }
    }

    if (event.type === 'place') {
      const pe = event.data as { piece: Piece };
      this.renderer.addPlaceAnimation(pe.piece.id, pe.piece.row, pe.piece.col);
    }

    if (event.type === 'win') {
      // game over handled through state
    }

    this.emitState();
  }

  private handleCellClick(row: number, col: number) {
    if (this.gravityAnimating) return;
    if (this.engine.phase === 'gameOver') return;

    const existingPiece = this.engine.getPieceAt(row, col);
    if (existingPiece) {
      if (this.selectedPieceId === existingPiece.id) {
        this.selectedPieceId = null;
      } else {
        this.selectedPieceId = existingPiece.id;
      }
      this.emitState();
      return;
    }

    if (this.engine.canPlace(row, col)) {
      this.selectedPieceId = null;
      const piece = this.engine.placePiece(row, col);
      if (piece) {
        this.engine.endTurn();
        this.renderer.triggerTurnFlash(this.engine.currentPlayer);
      }
    }
  }

  endTurn() {
    if (this.engine.phase === 'gameOver') return;
    if (this.gravityAnimating) return;
    this.engine.endTurn();
    this.renderer.triggerTurnFlash(this.engine.currentPlayer);
    this.emitState();
  }

  resetGame() {
    this.engine.reset();
    this.selectedPieceId = null;
    this.gravityAnimating = false;
    this.emitState();
  }

  getSelectedPieceId(): number | null {
    return this.selectedPieceId;
  }

  private emitState() {
    if (!this.onStateChange) return;

    const selectedPiece = this.selectedPieceId
      ? this.engine.pieces.get(this.selectedPieceId) || null
      : null;

    this.onStateChange({
      currentPlayer: this.engine.currentPlayer,
      turn: this.engine.turn,
      bluePieceCount: this.engine.getPlayerPieceCount('blue'),
      orangePieceCount: this.engine.getPlayerPieceCount('orange'),
      blueRemaining: this.engine.getRemainingPlacements('blue'),
      orangeRemaining: this.engine.getRemainingPlacements('orange'),
      selectedPiece,
      isGameOver: this.engine.phase === 'gameOver',
      winner: this.engine.winner,
    });
  }

  getState(): PlayerState {
    const selectedPiece = this.selectedPieceId
      ? this.engine.pieces.get(this.selectedPieceId) || null
      : null;

    return {
      currentPlayer: this.engine.currentPlayer,
      turn: this.engine.turn,
      bluePieceCount: this.engine.getPlayerPieceCount('blue'),
      orangePieceCount: this.engine.getPlayerPieceCount('orange'),
      blueRemaining: this.engine.getRemainingPlacements('blue'),
      orangeRemaining: this.engine.getRemainingPlacements('orange'),
      selectedPiece,
      isGameOver: this.engine.phase === 'gameOver',
      winner: this.engine.winner,
    };
  }
}
