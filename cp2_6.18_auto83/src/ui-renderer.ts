import {
  Card,
  Player,
  GameState,
  PlayRecord,
  Suit,
  SUIT_SYMBOLS,
  SUIT_COLORS
} from './types';

const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export interface RenderConfig {
  canvasWidth: number;
  canvasHeight: number;
  cardWidth: number;
  cardHeight: number;
  isSmallMode: boolean;
}

export interface AnimatedCard {
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  isFaceUp: boolean;
}

export class UIRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private animations: AnimatedCard[] = [];
  private selectedCardIds: Set<string> = new Set();
  private animationFrameId: number | null = null;
  private onRenderCallback?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.config = this.calculateConfig();
  }

  private calculateConfig(): RenderConfig {
    const windowWidth = window.innerWidth;
    const isSmallMode = windowWidth < 1000;
    const scale = isSmallMode ? 0.8 : 1;

    let canvasWidth = Math.min(Math.max(windowWidth * 0.9, 1000), 1600);
    let canvasHeight = Math.min(window.innerHeight * 0.8, 900);

    if (isSmallMode) {
      canvasWidth = Math.max(canvasWidth, 800);
    }

    return {
      canvasWidth,
      canvasHeight,
      cardWidth: 70 * scale,
      cardHeight: 100 * scale,
      isSmallMode
    };
  }

  public resize(): void {
    this.config = this.calculateConfig();
    this.canvas.width = this.config.canvasWidth;
    this.canvas.height = this.config.canvasHeight;
  }

  public setSelectedCards(cardIds: string[]): void {
    this.selectedCardIds = new Set(cardIds);
  }

  public addCardAnimation(card: Card, fromX: number, fromY: number, toX: number, toY: number): void {
    this.animations.push({
      card,
      fromX,
      fromY,
      toX,
      toY,
      startTime: performance.now(),
      duration: 300,
      isFaceUp: true
    });
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public render(gameState: GameState): void {
    const { canvasWidth, canvasHeight } = this.config;

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    this.drawTableBackground();

    this.drawPlayerAreas(gameState.players);

    this.drawTableCards(gameState.tableCards.slice(-10));

    this.updateAnimations();
    this.drawAnimations();

    this.drawHandSizeBars(gameState.players);

    if (this.onRenderCallback) {
      this.onRenderCallback();
    }
  }

  private drawTableBackground(): void {
    const { canvasWidth, canvasHeight } = this.config;
    const gradient = this.ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#283593');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const tableX = canvasWidth * 0.15;
    const tableY = canvasHeight * 0.2;
    const tableWidth = canvasWidth * 0.7;
    const tableHeight = canvasHeight * 0.6;

    this.ctx.fillStyle = '#cfd8dc';
    this.ctx.beginPath();
    this.ctx.roundRect(tableX, tableY, tableWidth, tableHeight, 20);
    this.ctx.fill();

    this.ctx.strokeStyle = '#90a4ae';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  private drawPlayerAreas(players: Player[]): void {
    for (const player of players) {
      const position = this.getPlayerAreaPosition(player.position);
      this.drawPlayerHand(player, position.x, position.y, position.angle || 0);
      this.drawPlayerName(player, position.labelX, position.labelY);
    }
  }

  private getPlayerAreaPosition(position: Player['position']): {
    x: number;
    y: number;
    labelX: number;
    labelY: number;
    angle?: number;
  } {
    const { canvasWidth, canvasHeight } = this.config;

    switch (position) {
      case 'bottom':
        return {
          x: canvasWidth / 2,
          y: canvasHeight - 80,
          labelX: canvasWidth / 2,
          labelY: canvasHeight - 15
        };
      case 'top':
        return {
          x: canvasWidth / 2,
          y: 80,
          labelX: canvasWidth / 2,
          labelY: 15
        };
      case 'left':
        return {
          x: 80,
          y: canvasHeight / 2,
          labelX: 20,
          labelY: canvasHeight / 2,
          angle: -90
        };
      case 'right':
        return {
          x: canvasWidth - 80,
          y: canvasHeight / 2,
          labelX: canvasWidth - 20,
          labelY: canvasHeight / 2,
          angle: 90
        };
    }
  }

  private drawPlayerHand(player: Player, centerX: number, centerY: number, angle: number): void {
    const { cardWidth, cardHeight } = this.config;
    const hand = player.hand;
    const isHorizontal = angle === 0 || angle === 180;

    const overlap = cardWidth * 0.6;
    const totalWidth = (hand.length - 1) * overlap + cardWidth;
    const startX = centerX - totalWidth / 2;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      let x, y;

      if (isHorizontal) {
        x = startX + i * overlap;
        y = centerY - cardHeight / 2;
        if (this.selectedCardIds.has(card.id)) {
          y -= 20;
        }
      } else {
        x = centerX - cardHeight / 2;
        y = startX + i * overlap;
      }

      const isSelected = this.selectedCardIds.has(card.id);
      this.drawCard(card, x, y, isSelected, player.position === 'bottom');
    }
  }

  private drawCard(card: Card, x: number, y: number, isSelected: boolean, isFaceUp: boolean): void {
    const { cardWidth, cardHeight } = this.config;
    const ctx = this.ctx;

    ctx.save();

    if (isSelected) {
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 10;
    }

    const radius = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, radius);

    if (isFaceUp || card.isFaceUp) {
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#ffd54f' : '#bdbdbd';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      this.drawCardFace(card, x, y);
    } else {
      const gradient = ctx.createLinearGradient(x, y, x + cardWidth, y + cardHeight);
      gradient.addColorStop(0, '#42a5f5');
      gradient.addColorStop(1, '#1e88e5');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#1565c0';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, cardWidth - 10, cardHeight - 10, 4);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCardFace(card: Card, x: number, y: number): void {
    const { cardWidth, cardHeight } = this.config;
    const ctx = this.ctx;

    ctx.save();

    if (card.color) {
      ctx.fillStyle = card.color;
    } else if (card.suit) {
      ctx.fillStyle = SUIT_COLORS[card.suit];
    } else {
      ctx.fillStyle = '#212121';
    }

    const fontSize = cardWidth * 0.35;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayRank = this.getDisplayRank(card.rank);

    ctx.fillText(displayRank, x + cardWidth / 2, y + cardHeight * 0.35);

    if (card.suit) {
      const suitFontSize = cardWidth * 0.5;
      ctx.font = `${suitFontSize}px Arial`;
      ctx.fillText(SUIT_SYMBOLS[card.suit], x + cardWidth / 2, y + cardHeight * 0.65);
    }

    ctx.restore();
  }

  private getDisplayRank(rank: string): string {
    if (rank === 'S_JOKER') return '小';
    if (rank === 'B_JOKER') return '大';
    return rank;
  }

  private drawPlayerName(player: Player, x: number, y: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(x - 30, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.name, x + 10, y);

    ctx.restore();
  }

  private drawTableCards(cards: Card[]): void {
    const { canvasWidth, canvasHeight, cardWidth, cardHeight } = this.config;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const overlap = cardWidth * 0.3;
    const totalWidth = cards.length * overlap + cardWidth;
    const startX = centerX - totalWidth / 2;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const x = startX + i * overlap;
      const y = centerY - cardHeight / 2;
      this.drawCard(card, x, y, false, true);
    }
  }

  private drawHandSizeBars(players: Player[]): void {
    const { canvasWidth, canvasHeight } = this.config;
    const maxHandSize = 20;

    const barWidth = 20;
    const barMaxHeight = 60;
    const x = canvasWidth - 50;
    const y = canvasHeight - 100;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const handSize = player.hand.length;
      const barHeight = (handSize / maxHandSize) * barMaxHeight;

      const barX = x - i * (barWidth + 10);
      const barY = y - barHeight;

      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.ctx.roundRect(barX, barY, barWidth, barHeight, 4);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${handSize}`, barX + barWidth / 2, barY - 5);
    }
  }

  private updateAnimations(): void {
    const now = performance.now();
    this.animations = this.animations.filter(anim => {
      return now - anim.startTime < anim.duration;
    });
  }

  private drawAnimations(): void {
    const now = performance.now();

    for (const anim of this.animations) {
      const progress = Math.min((now - anim.startTime) / anim.duration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      const currentX = anim.fromX + (anim.toX - anim.fromX) * easedProgress;
      const currentY = anim.fromY + (anim.toY - anim.fromY) * easedProgress;

      const alpha = progress < 0.3 ? progress / 0.3 : 1;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.drawCard(anim.card, currentX, currentY, false, anim.isFaceUp);
      this.ctx.restore();
    }
  }

  public getCardAtPosition(x: number, y: number, players: Player[]): { card: Card; player: Player } | null {
    const bottomPlayer = players.find(p => p.position === 'bottom');
    if (!bottomPlayer) return null;

    const { cardWidth, cardHeight } = this.config;
    const hand = bottomPlayer.hand;

    const centerX = this.config.canvasWidth / 2;
    const centerY = this.config.canvasHeight - 80;

    const overlap = cardWidth * 0.6;
    const totalWidth = (hand.length - 1) * overlap + cardWidth;
    const startX = centerX - totalWidth / 2;

    for (let i = hand.length - 1; i >= 0; i--) {
      const card = hand[i];
      let cardY = centerY - cardHeight / 2;
      if (this.selectedCardIds.has(card.id)) {
        cardY -= 20;
      }
      const cardX = startX + i * overlap;

      if (x >= cardX && x <= cardX + cardWidth && y >= cardY && y <= cardY + cardHeight) {
        return { card, player: bottomPlayer };
      }
    }

    return null;
  }

  public getConfig(): RenderConfig {
    return this.config;
  }

  public setOnRenderCallback(callback: () => void): void {
    this.onRenderCallback = callback;
  }

  public startAnimationLoop(gameState: GameState): void {
    const renderLoop = () => {
      this.render(gameState);
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };
    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  public stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
