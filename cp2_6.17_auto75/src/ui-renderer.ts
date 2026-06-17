import type { Card, Player, PlayRecord, GameSession, GameType } from './card-logic';
import { getSuitSymbol, getSuitColor, getCardDisplay } from './card-logic';

export interface CardPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  card: Card;
  playerIndex: number;
  isSelected: boolean;
  animY?: number;
  animOpacity?: number;
}

export interface RenderState {
  selectedCards: Set<string>;
  tableCards: Card[];
  tableCardsOpacity: number;
  handCounts: Record<string, number>;
  currentPlayerIndex: number;
  isReplayMode: boolean;
}

const CARD_WIDTH = 60;
const CARD_HEIGHT = 84;
const CARD_GAP = 8;
const CARD_CORNER_RADIUS = 6;
const SELECTED_OFFSET = 20;
const MIN_CANVAS_WIDTH = 1000;
const MAX_CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 600;

export class UIRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameType: GameType = 'landlord';
  private cardPositions: CardPosition[] = [];
  private animationId: number = 0;
  private scale: number = 1;
  private canvasWidth: number = 1200;
  private onCardClick: ((card: Card, playerIndex: number) => void) | null = null;
  private tableCardsAnim: { cards: Card[]; progress: number; targetX: number; targetY: number } | null = null;
  private renderState: RenderState = {
    selectedCards: new Set(),
    tableCards: [],
    tableCardsOpacity: 1,
    handCounts: {},
    currentPlayerIndex: 0,
    isReplayMode: false
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
    this.bindEvents();
  }

  private setupCanvas(): void {
    const containerWidth = Math.min(
      Math.max(window.innerWidth - 360, MIN_CANVAS_WIDTH),
      MAX_CANVAS_WIDTH
    );
    this.canvasWidth = containerWidth;
    this.scale = containerWidth < MIN_CANVAS_WIDTH + 100 ? 0.8 : 1;
    
    this.canvas.width = containerWidth;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.width = `${containerWidth}px`;
    this.canvas.style.height = `${CANVAS_HEIGHT}px`;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.setupCanvas();
  }

  private handleClick(e: MouseEvent): void {
    if (this.renderState.isReplayMode) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = this.cardPositions.length - 1; i >= 0; i--) {
      const pos = this.cardPositions[i];
      const cardY = pos.isSelected ? pos.y - SELECTED_OFFSET * this.scale : pos.y;
      
      if (
        x >= pos.x &&
        x <= pos.x + pos.width &&
        y >= cardY &&
        y <= cardY + pos.height &&
        pos.playerIndex === this.renderState.currentPlayerIndex
      ) {
        this.onCardClick?.(pos.card, pos.playerIndex);
        return;
      }
    }
  }

  public setOnCardClick(callback: (card: Card, playerIndex: number) => void): void {
    this.onCardClick = callback;
  }

  public setGameType(gameType: GameType): void {
    this.gameType = gameType;
  }

  public setReplayMode(isReplay: boolean): void {
    this.renderState.isReplayMode = isReplay;
  }

  public updateState(state: Partial<RenderState>): void {
    this.renderState = { ...this.renderState, ...state };
  }

  public getSelectedCards(): Card[] {
    return this.cardPositions
      .filter(p => p.isSelected && p.playerIndex === this.renderState.currentPlayerIndex)
      .map(p => p.card);
  }

  public clearSelection(): void {
    this.renderState.selectedCards.clear();
    this.cardPositions.forEach(p => {
      if (p.playerIndex === this.renderState.currentPlayerIndex) {
        p.isSelected = false;
      }
    });
  }

  public render(players: Player[], records: PlayRecord[]): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.drawTable();
    this.calculateCardPositions(players);
    this.drawPlayerHands(players);
    this.drawTableCards(records);
    this.drawPlayerLabels(players);
    this.drawBarChart(players);
  }

  public startAnimationLoop(callback?: () => void): void {
    const animate = () => {
      callback?.();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  public stopAnimationLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  public animatePlayCards(cards: Card[], playerIndex: number, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const tableCenterX = this.canvasWidth / 2;
      const tableCenterY = CANVAS_HEIGHT / 2;

      const startPositions = cards.map(card => {
        const pos = this.cardPositions.find(p => p.card.id === card.id);
        return pos ? { x: pos.x, y: pos.y } : { x: tableCenterX, y: tableCenterY };
      });

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeOutCubic(progress);

        this.renderState.tableCards = cards.map((card, i) => {
          const start = startPositions[i];
          const offsetX = (i - (cards.length - 1) / 2) * (CARD_WIDTH * this.scale * 0.8);
          return {
            ...card,
            id: card.id,
            suit: card.suit,
            rank: card.rank
          } as Card;
        });
        this.renderState.tableCardsOpacity = eased;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#283593');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalAlpha = 0.03;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const r = Math.random() * 30 + 10;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawTable(): void {
    const tableWidth = this.canvasWidth * 0.6;
    const tableHeight = 200;
    const tableX = (this.canvasWidth - tableWidth) / 2;
    const tableY = (CANVAS_HEIGHT - tableHeight) / 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.roundRect(tableX + 4, tableY + 6, tableWidth, tableHeight, 20);
    this.ctx.fill();

    const tableGradient = this.ctx.createLinearGradient(tableX, tableY, tableX, tableY + tableHeight);
    tableGradient.addColorStop(0, '#d7e0e4');
    tableGradient.addColorStop(1, '#cfd8dc');
    this.ctx.fillStyle = tableGradient;
    this.ctx.beginPath();
    this.roundRect(tableX, tableY, tableWidth, tableHeight, 20);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private calculateCardPositions(players: Player[]): void {
    this.cardPositions = [];
    const cardW = CARD_WIDTH * this.scale;
    const cardH = CARD_HEIGHT * this.scale;
    const gap = CARD_GAP * this.scale;

    players.forEach((player, playerIndex) => {
      const hand = player.hand;
      const totalWidth = hand.length * cardW + (hand.length - 1) * gap * 0.5;
      
      let startX: number, startY: number;

      if (playerIndex === 0) {
        startX = (this.canvasWidth - totalWidth) / 2;
        startY = CANVAS_HEIGHT - cardH - 30;
      } else if (playerIndex === 1) {
        startX = 30;
        startY = (CANVAS_HEIGHT - cardH) / 2;
      } else if (playerIndex === 2) {
        startX = this.canvasWidth - cardW - 30;
        startY = (CANVAS_HEIGHT - cardH) / 2;
      } else {
        startX = (this.canvasWidth - totalWidth) / 2;
        startY = 30;
      }

      hand.forEach((card, cardIndex) => {
        const isSelected = this.renderState.selectedCards.has(card.id);
        this.cardPositions.push({
          x: startX + cardIndex * gap * 0.6,
          y: startY,
          width: cardW,
          height: cardH,
          card,
          playerIndex,
          isSelected
        });
      });
    });
  }

  private drawPlayerHands(players: Player[]): void {
    this.cardPositions.forEach(pos => {
      const isCurrentPlayer = pos.playerIndex === this.renderState.currentPlayerIndex && !this.renderState.isReplayMode;
      const showFace = pos.playerIndex === 0 || this.renderState.isReplayMode;
      const offsetY = pos.isSelected ? -SELECTED_OFFSET * this.scale : 0;

      this.ctx.save();
      this.ctx.translate(pos.x, pos.y + offsetY);

      if (showFace) {
        this.drawCardFront(pos.card, pos.width, pos.height, pos.isSelected);
      } else {
        this.drawCardBack(pos.width, pos.height);
      }

      this.ctx.restore();
    });
  }

  private drawCardFront(card: Card, width: number, height: number, isSelected: boolean): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.roundRect(0, 0, width, height, CARD_CORNER_RADIUS * this.scale);
    this.ctx.fill();

    if (isSelected) {
      this.ctx.strokeStyle = '#ffd54f';
      this.ctx.lineWidth = 3 * this.scale;
      this.ctx.stroke();
    } else {
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    const textColor = card.color || getSuitColor(card.suit);
    this.ctx.fillStyle = textColor;
    this.ctx.font = `bold ${14 * this.scale}px Arial`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(card.rank, 5 * this.scale, 4 * this.scale);

    const symbol = getSuitSymbol(card.suit);
    if (symbol) {
      this.ctx.font = `${18 * this.scale}px Arial`;
      this.ctx.fillText(symbol, 5 * this.scale, 18 * this.scale);
    } else if (card.color) {
      this.ctx.fillStyle = card.color;
      this.ctx.beginPath();
      this.ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.save();
    this.ctx.translate(width, height);
    this.ctx.rotate(Math.PI);
    this.ctx.fillStyle = textColor;
    this.ctx.font = `bold ${14 * this.scale}px Arial`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(card.rank, 5 * this.scale, 4 * this.scale);
    if (symbol) {
      this.ctx.font = `${18 * this.scale}px Arial`;
      this.ctx.fillText(symbol, 5 * this.scale, 18 * this.scale);
    }
    this.ctx.restore();

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetY = 2;
  }

  private drawCardBack(width: number, height: number): void {
    this.ctx.fillStyle = '#42a5f5';
    this.ctx.beginPath();
    this.roundRect(0, 0, width, height, CARD_CORNER_RADIUS * this.scale);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    const padding = 6 * this.scale;
    this.ctx.beginPath();
    this.roundRect(padding, padding, width - padding * 2, height - padding * 2, 3 * this.scale);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.font = `bold ${16 * this.scale}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('♠♥', width / 2, height / 2);
  }

  private drawTableCards(records: PlayRecord[]): void {
    if (records.length === 0) return;

    const lastRecord = records[records.length - 1];
    if (!lastRecord || lastRecord.cards.length === 0) return;

    const cards = lastRecord.cards;
    const cardW = CARD_WIDTH * this.scale;
    const cardH = CARD_HEIGHT * this.scale;
    const totalWidth = cards.length * cardW * 0.8;
    const startX = (this.canvasWidth - totalWidth) / 2;
    const startY = (CANVAS_HEIGHT - cardH) / 2;

    cards.forEach((card, i) => {
      const x = startX + i * cardW * 0.8;
      
      this.ctx.save();
      this.ctx.globalAlpha = this.renderState.tableCardsOpacity;
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.roundRect(x, startY, cardW, cardH, CARD_CORNER_RADIUS * this.scale);
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      const textColor = card.color || getSuitColor(card.suit);
      this.ctx.fillStyle = textColor;
      this.ctx.font = `bold ${12 * this.scale}px Arial`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(card.rank, 4 * this.scale, 3 * this.scale);

      const symbol = getSuitSymbol(card.suit);
      if (symbol) {
        this.ctx.font = `${14 * this.scale}px Arial`;
        this.ctx.fillText(symbol, 4 * this.scale, 16 * this.scale);
      }

      this.ctx.restore();
    });
  }

  private drawPlayerLabels(players: Player[]): void {
    players.forEach((player, index) => {
      let x: number, y: number;
      const isCurrent = index === this.renderState.currentPlayerIndex;

      if (index === 0) {
        x = this.canvasWidth / 2;
        y = CANVAS_HEIGHT - 10;
      } else if (index === 1) {
        x = 80;
        y = CANVAS_HEIGHT / 2 - 50;
      } else if (index === 2) {
        x = this.canvasWidth - 80;
        y = CANVAS_HEIGHT / 2 - 50;
      } else {
        x = this.canvasWidth / 2;
        y = 20;
      }

      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.ctx.arc(x - 30, y, 5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `${isCurrent ? 'bold ' : ''}13px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(player.name, x, y);

      if (isCurrent && !this.renderState.isReplayMode) {
        this.ctx.fillStyle = '#ffd54f';
        this.ctx.font = '11px Arial';
        this.ctx.fillText('出牌中', x, y + 16);
      }

      const handCount = player.hand.length;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = '11px Arial';
      this.ctx.fillText(`${handCount}张`, x, y + (isCurrent ? 32 : 16));
    });
  }

  private drawBarChart(players: Player[]): void {
    const barWidth = 20;
    const maxHeight = 80;
    const chartX = 20;
    const chartY = 20;
    const maxHand = Math.max(...players.map(p => p.hand.length), 1);

    players.forEach((player, index) => {
      const x = chartX + index * (barWidth + 8);
      const height = (player.hand.length / maxHand) * maxHeight;
      const y = chartY + maxHeight - height;

      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.roundRect(x, y, barWidth, height, 3);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(player.name, x + barWidth / 2, chartY + maxHeight + 14);
    });
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  public toggleCardSelection(cardId: string): void {
    if (this.renderState.selectedCards.has(cardId)) {
      this.renderState.selectedCards.delete(cardId);
      const pos = this.cardPositions.find(p => p.card.id === cardId);
      if (pos) pos.isSelected = false;
    } else {
      this.renderState.selectedCards.add(cardId);
      const pos = this.cardPositions.find(p => p.card.id === cardId);
      if (pos) pos.isSelected = true;
    }
  }

  public destroy(): void {
    this.stopAnimationLoop();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
