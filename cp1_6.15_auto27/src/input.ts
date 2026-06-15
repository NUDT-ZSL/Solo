import { Card } from './card';
import { Player } from './player';
import { Renderer } from './renderer';

export type GameAction =
  | { type: 'dragStart'; card: Card }
  | { type: 'dragMove'; position: { x: number; y: number } }
  | { type: 'dragEnd'; position: { x: number; y: number } }
  | { type: 'selectCard'; card: Card }
  | { type: 'attackCard'; attacker: Card; target: Card }
  | { type: 'attackHero'; attacker: Card }
  | { type: 'clickTurnButton' }
  | { type: 'clickGameOver' }
  | { type: 'keyPress'; key: string };

export class InputHandler {
  private renderer: Renderer;
  private listeners: ((action: GameAction) => void)[] = [];
  private mousePos: { x: number; y: number };
  private isMouseDown: boolean;
  private dragStartPos: { x: number; y: number };
  private dragThreshold: number = 5;
  private hasDragged: boolean;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.mousePos = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.hasDragged = false;
    this.setupEventListeners();
  }

  addListener(callback: (action: GameAction) => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: (action: GameAction) => void): void {
    const idx = this.listeners.indexOf(callback);
    if (idx !== -1) {
      this.listeners.splice(idx, 1);
    }
  }

  private dispatch(action: GameAction): void {
    this.listeners.forEach((cb) => cb(action));
  }

  private setupEventListeners(): void {
    this.renderer.getCanvasRect();

    window.addEventListener('mousemove', (e) => {
      this.updateMousePos(e);
      if (this.isMouseDown) {
        const dx = this.mousePos.x - this.dragStartPos.x;
        const dy = this.mousePos.y - this.dragStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
          this.hasDragged = true;
        }
        if (this.hasDragged) {
          this.dispatch({ type: 'dragMove', position: { ...this.mousePos } });
        }
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isMouseDown = true;
      this.hasDragged = false;
      this.updateMousePos(e);
      this.dragStartPos = { ...this.mousePos };
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      const wasDragging = this.hasDragged;
      this.isMouseDown = false;
      this.hasDragged = false;
      this.updateMousePos(e);

      if (wasDragging) {
        this.dispatch({ type: 'dragEnd', position: { ...this.mousePos } });
      }
    });

    window.addEventListener('click', (e) => {
      this.updateMousePos(e);
      const rect = this.renderer.getCanvasRect();
      if (
        this.mousePos.x >= 0 &&
        this.mousePos.x <= rect.width &&
        this.mousePos.y >= 0 &&
        this.mousePos.y <= rect.height
      ) {
        if (this.hasDragged) {
          this.hasDragged = false;
          return;
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      this.dispatch({ type: 'keyPress', key: e.key });
    });
  }

  private updateMousePos(e: MouseEvent): void {
    const rect = this.renderer.getCanvasRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;
  }

  getMousePos(): { x: number; y: number } {
    return { ...this.mousePos };
  }

  findCardAtPosition(
    pos: { x: number; y: number },
    players: Player[],
    currentTurn: number
  ): Card | null {
    this.renderer.getLayout();
    const currentPlayer = players[currentTurn];
    const otherPlayer = players[1 - currentTurn];

    for (const card of currentPlayer.hand) {
      if (card.containsPoint(pos.x, pos.y)) {
        return card;
      }
    }

    const currentCards = currentPlayer.getAllBattlefieldCards();
    for (const card of currentCards) {
      if (card.containsPoint(pos.x, pos.y)) {
        return card;
      }
    }

    const otherCards = otherPlayer.getAllBattlefieldCards();
    for (const card of otherCards) {
      if (card.containsPoint(pos.x, pos.y)) {
        return card;
      }
    }

    return null;
  }

  findBattlefieldSlot(
    pos: { x: number; y: number },
    playerIndex: number
  ): { row: number; col: number } | null {
    const layout = this.renderer.getLayout();
    const cells = layout.battlefieldCells;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = cells[row][col];
        if (
          pos.x >= cell.x &&
          pos.x <= cell.x + cell.width &&
          pos.y >= cell.y &&
          pos.y <= cell.y + cell.height
        ) {
          if (playerIndex === 0 && col < 2) {
            return { row, col };
          } else if (playerIndex === 1 && col >= 1) {
            return { row, col };
          }
        }
      }
    }
    return null;
  }

  isInBattlefield(pos: { x: number; y: number }): boolean {
    const layout = this.renderer.getLayout();
    const area = layout.battlefieldArea;
    return (
      pos.x >= area.x &&
      pos.x <= area.x + area.width &&
      pos.y >= area.y &&
      pos.y <= area.y + area.height
    );
  }

  isOnTurnButton(pos: { x: number; y: number }): boolean {
    const layout = this.renderer.getLayout();
    const btn = layout.turnButtonPos;
    const dx = pos.x - btn.x;
    const dy = pos.y - btn.y;
    return Math.sqrt(dx * dx + dy * dy) <= btn.radius;
  }

  isOnHero(pos: { x: number; y: number }, playerIndex: number): boolean {
    const layout = this.renderer.getLayout();
    const heroPos = playerIndex === 0 ? layout.player1HeroPos : layout.player2HeroPos;
    const dx = pos.x - heroPos.x;
    const dy = pos.y - heroPos.y;
    return Math.sqrt(dx * dx + dy * dy) <= 55;
  }
}
