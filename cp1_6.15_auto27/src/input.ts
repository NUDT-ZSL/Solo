import { Card } from './card';
import { Player } from './player';
import { Renderer } from './renderer';

export interface DragState {
  card: Card;
  offsetX: number;
  offsetY: number;
  mouseX: number;
  mouseY: number;
}

export class InputHandler {
  private renderer: Renderer;
  private mousePos: { x: number; y: number };
  private isMouseDown: boolean;
  private dragStartPos: { x: number; y: number };
  private dragThreshold: number = 5;
  private hasDragged: boolean;
  dragState: DragState | null;

  onDragEnd: ((pos: { x: number; y: number }, card: Card) => void) | null;
  onClickCard: ((card: Card, pos: { x: number; y: number }) => void) | null;
  onClickEmpty: ((pos: { x: number; y: number }) => void) | null;
  onTurnButton: (() => void) | null;
  onGameOverClick: (() => void) | null;
  onKeyPress: ((key: string) => void) | null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.mousePos = { x: 0, y: 0 };
    this.isMouseDown = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.hasDragged = false;
    this.dragState = null;
    this.onDragEnd = null;
    this.onClickCard = null;
    this.onClickEmpty = null;
    this.onTurnButton = null;
    this.onGameOverClick = null;
    this.onKeyPress = null;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', (e) => {
      this.updateMousePos(e);
      if (this.isMouseDown && !this.dragState) {
        const dx = this.mousePos.x - this.dragStartPos.x;
        const dy = this.mousePos.y - this.dragStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
          this.hasDragged = true;
        }
      }
      if (this.dragState) {
        this.dragState.mouseX = this.mousePos.x;
        this.dragState.mouseY = this.mousePos.y;
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
      this.updateMousePos(e);

      if (this.dragState) {
        const card = this.dragState.card;
        const pos = { ...this.mousePos };
        this.dragState = null;
        if (this.onDragEnd) {
          this.onDragEnd(pos, card);
        }
      }

      this.isMouseDown = false;
      this.hasDragged = false;
    });

    window.addEventListener('click', () => {
      if (this.hasDragged) {
        this.hasDragged = false;
        return;
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.onKeyPress) {
        this.onKeyPress(e.key);
      }
    });
  }

  handleMouseDown(players: Player[], currentTurn: number, isGameOver: boolean): void {
    const mousePos = { ...this.mousePos };

    if (isGameOver) {
      if (this.onGameOverClick) this.onGameOverClick();
      return;
    }

    if (this.isOnTurnButton(mousePos)) {
      if (this.onTurnButton) this.onTurnButton();
      return;
    }

    const card = this.findCardAtPosition(mousePos, players, currentTurn);

    if (card && card.owner === currentTurn && card.state === 'inHand') {
      this.dragState = {
        card,
        offsetX: card.position.x + card.position.width / 2 - mousePos.x,
        offsetY: card.position.y + card.position.height / 2 - mousePos.y,
        mouseX: mousePos.x,
        mouseY: mousePos.y,
      };
      return;
    }

    if (card) {
      if (this.onClickCard) this.onClickCard(card, mousePos);
    } else {
      if (this.onClickEmpty) this.onClickEmpty(mousePos);
    }
  }

  private updateMousePos(e: MouseEvent): void {
    const rect = this.renderer.getCanvasRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;
  }

  getMousePos(): { x: number; y: number } {
    return { ...this.mousePos };
  }

  private findCardAtPosition(
    pos: { x: number; y: number },
    players: Player[],
    currentTurn: number
  ): Card | null {
    const currentPlayer = players[currentTurn];
    const otherPlayer = players[1 - currentTurn];

    for (const card of currentPlayer.hand) {
      if (card.containsPoint(pos.x, pos.y)) return card;
    }
    for (const card of currentPlayer.getAllBattlefieldCards()) {
      if (card.containsPoint(pos.x, pos.y)) return card;
    }
    for (const card of otherPlayer.getAllBattlefieldCards()) {
      if (card.containsPoint(pos.x, pos.y)) return card;
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
          pos.x >= cell.x && pos.x <= cell.x + cell.width &&
          pos.y >= cell.y && pos.y <= cell.y + cell.height
        ) {
          if (playerIndex === 0 && col < 2) return { row, col };
          else if (playerIndex === 1 && col >= 1) return { row, col };
        }
      }
    }
    return null;
  }

  isInBattlefield(pos: { x: number; y: number }): boolean {
    const layout = this.renderer.getLayout();
    const area = layout.battlefieldArea;
    return (
      pos.x >= area.x && pos.x <= area.x + area.width &&
      pos.y >= area.y && pos.y <= area.y + area.height
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
