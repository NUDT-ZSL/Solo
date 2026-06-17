import { Card, GameStateData, GameStats, PlayerState } from '../shared/types';
import { NetworkManager, NetworkCallback } from './network';
import { AIPlayer } from './aiPlayer';

const CARD_WIDTH = 60;
const CARD_HEIGHT = 90;
const CARD_GAP = 10;

type DraggingCard = {
  card: Card;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type AnimatingCard = {
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  type: 'play' | 'rollback' | 'ai-play';
  sequence?: number;
};

export class CardGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private network: NetworkManager;
  private aiPlayer: AIPlayer;
  private localPlayerId: string;
  private aiPlayerId: string;
  private gameState: GameStateData | null = null;

  private dragging: DraggingCard | null = null;
  private animations: AnimatingCard[] = [];
  private hoverCardId: string | null = null;
  private flashing: { color: string; startTime: number; duration: number } | null = null;

  private playArea = { x: 0, y: 0, width: 240, height: 120 };
  private handArea = { x: 0, y: 0, width: 0, height: 0 };

  private pendingRollbacks: Map<number, Card> = new Map();
  private onGameOverCallback: ((stats: GameStats) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, localPlayerId: string, aiPlayerId: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.localPlayerId = localPlayerId;
    this.aiPlayerId = aiPlayerId;

    const callbacks: NetworkCallback = {
      onStateUpdate: this.handleStateUpdate.bind(this),
      onAck: this.handleAck.bind(this),
      onRollback: this.handleRollback.bind(this),
      onGameOver: this.handleGameOver.bind(this),
      onQueueChange: this.handleQueueChange.bind(this),
      onLatencyChange: this.handleLatencyChange.bind(this),
    };

    this.network = new NetworkManager(callbacks);
    this.aiPlayer = new AIPlayer(aiPlayerId, localPlayerId, this.aiPlayCard.bind(this));

    this.setupEventListeners();
    this.resize();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCardId = null;
      this.dragging = null;
    });
  }

  private resize(): void {
    this.playArea = {
      x: (this.canvas.width - 240) / 2,
      y: this.canvas.height - 200,
      width: 240,
      height: 120,
    };
    this.handArea = {
      x: 20,
      y: this.canvas.height - 110,
      width: this.canvas.width - 40,
      height: 100,
    };
  }

  async connect(): Promise<void> {
    await this.network.connect();
    this.gameLoop();
  }

  setOnGameOver(callback: (stats: GameStats) => void): void {
    this.onGameOverCallback = callback;
  }

  getNetwork(): NetworkManager {
    return this.network;
  }

  private handleStateUpdate(state: GameStateData): void {
    this.gameState = state;
    this.aiPlayer.updateState(state);
  }

  private handleAck(sequence: number, state: GameStateData): void {
    this.gameState = state;
    this.aiPlayer.updateState(state);
    this.animations = this.animations.filter(a => a.sequence !== sequence || a.type !== 'play');
  }

  private handleRollback(sequence: number, state: GameStateData, _reason?: string): void {
    this.gameState = state;
    this.aiPlayer.updateState(state);
    this.flashing = { color: '#ff5252', startTime: performance.now(), duration: 300 };

    const rolledCard = this.pendingRollbacks.get(sequence);
    if (rolledCard && this.gameState) {
      const player = this.gameState.players[this.localPlayerId];
      const cardIndex = player.hand.findIndex(c => c.id === rolledCard.id);
      if (cardIndex >= 0) {
        const targetX = this.getCardX(cardIndex, player.hand.length);
        const targetY = this.handArea.y + 5;

        this.animations.push({
          card: rolledCard,
          fromX: this.playArea.x + this.playArea.width / 2 - CARD_WIDTH / 2,
          fromY: this.playArea.y + this.playArea.height / 2 - CARD_HEIGHT / 2,
          toX: targetX,
          toY: targetY,
          startTime: performance.now(),
          duration: 400,
          type: 'rollback',
          sequence,
        });
      }
    }
    this.pendingRollbacks.delete(sequence);
  }

  private handleGameOver(state: GameStateData, stats: GameStats): void {
    this.gameState = state;
    if (this.onGameOverCallback) {
      this.onGameOverCallback(stats);
    }
  }

  private handleQueueChange(_queueSize: number): void {}

  private handleLatencyChange(_latency: number): void {}

  private onMouseDown(e: MouseEvent): void {
    if (!this.gameState) return;
    if (this.gameState.currentTurn !== this.localPlayerId) return;
    if (this.gameState.gameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const player = this.gameState.players[this.localPlayerId];
    for (let i = player.hand.length - 1; i >= 0; i--) {
      const card = player.hand[i];
      const cx = this.getCardX(i, player.hand.length);
      const cy = this.handArea.y + 5;
      if (x >= cx && x <= cx + CARD_WIDTH && y >= cy && y <= cy + CARD_HEIGHT) {
        this.dragging = {
          card,
          startX: cx,
          startY: cy,
          currentX: x - CARD_WIDTH / 2,
          currentY: y - CARD_HEIGHT / 2,
        };
        break;
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.dragging) {
      this.dragging.currentX = x - CARD_WIDTH / 2;
      this.dragging.currentY = y - CARD_HEIGHT / 2;
      return;
    }

    this.hoverCardId = null;
    if (this.gameState) {
      const player = this.gameState.players[this.localPlayerId];
      for (let i = player.hand.length - 1; i >= 0; i--) {
        const card = player.hand[i];
        const cx = this.getCardX(i, player.hand.length);
        const cy = this.handArea.y + 5;
        if (x >= cx && x <= cx + CARD_WIDTH && y >= cy && y <= cy + CARD_HEIGHT) {
          this.hoverCardId = card.id;
          break;
        }
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.dragging || !this.gameState) {
      this.dragging = null;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const inPlayArea =
      x >= this.playArea.x &&
      x <= this.playArea.x + this.playArea.width &&
      y >= this.playArea.y &&
      y <= this.playArea.y + this.playArea.height;

    if (inPlayArea) {
      this.playCard(this.dragging.card);
    }

    this.dragging = null;
  }

  private getCardX(index: number, total: number): number {
    const totalWidth = total * CARD_WIDTH + (total - 1) * CARD_GAP;
    const startX = this.handArea.x + (this.handArea.width - totalWidth) / 2;
    return startX + index * (CARD_WIDTH + CARD_GAP);
  }

  private playCard(card: Card): void {
    if (!this.gameState) return;

    const sequence = this.network.sendPlayCard(this.localPlayerId, card.id);
    this.pendingRollbacks.set(sequence, card);

    const player = this.gameState.players[this.localPlayerId];
    const cardIndex = player.hand.findIndex(c => c.id === card.id);

    player.hand.splice(cardIndex, 1);

    const startX = this.getCardX(cardIndex, player.hand.length + 1);
    const startY = this.handArea.y + 5;

    this.animations.push({
      card,
      fromX: startX,
      fromY: startY,
      toX: this.playArea.x + this.playArea.width / 2 - CARD_WIDTH / 2,
      toY: this.playArea.y + this.playArea.height / 2 - CARD_HEIGHT / 2,
      startTime: performance.now(),
      duration: 200,
      type: 'play',
      sequence,
    });

    this.flashing = { color: '#448aff', startTime: performance.now(), duration: 150 };
  }

  private aiPlayCard(cardId: string): void {
    if (!this.gameState) return;

    const aiState = this.gameState.players[this.aiPlayerId];
    const card = aiState.hand.find(c => c.id === cardId);
    if (!card) return;

    const startX = this.canvas.width / 2 - CARD_WIDTH / 2;
    const startY = 20;

    this.animations.push({
      card,
      fromX: startX,
      fromY: startY,
      toX: this.playArea.x + this.playArea.width / 2 - CARD_WIDTH / 2,
      toY: this.playArea.y + this.playArea.height / 2 - CARD_HEIGHT / 2,
      startTime: performance.now(),
      duration: 200,
      type: 'ai-play',
    });

    this.flashing = { color: '#448aff', startTime: performance.now(), duration: 150 };
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private gameLoop(): void {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    const now = performance.now();
    this.animations = this.animations.filter(a => now - a.startTime < a.duration);
    if (this.flashing && now - this.flashing.startTime > this.flashing.duration) {
      this.flashing = null;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.renderPlayArea();
    this.renderHand();
    this.renderAnimations();
    this.renderDragging();
    this.renderFlash();
    this.renderTurnIndicator();
  }

  private renderPlayArea(): void {
    const ctx = this.ctx;
    const pa = this.playArea;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(pa.x, pa.y, pa.width, pa.height, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private renderHand(): void {
    if (!this.gameState) return;
    const player = this.gameState.players[this.localPlayerId];

    for (let i = 0; i < player.hand.length; i++) {
      const card = player.hand[i];
      const x = this.getCardX(i, player.hand.length);
      const y = this.handArea.y + 5;
      const isHover = this.hoverCardId === card.id;
      const isDragging = this.dragging?.card.id === card.id;

      if (!isDragging) {
        this.drawCard(card, x, y, isHover);
      }
    }
  }

  private drawCard(card: Card, x: number, y: number, highlighted: boolean = false): void {
    const ctx = this.ctx;
    const scale = highlighted ? 1.1 : 1;
    const w = CARD_WIDTH * scale;
    const h = CARD_HEIGHT * scale;
    const dx = x - (w - CARD_WIDTH) / 2;
    const dy = y - (h - CARD_HEIGHT) / 2;

    ctx.save();
    if (highlighted) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#1a237e';
    ctx.beginPath();
    ctx.roundRect(dx, dy, w, h, 8);
    ctx.fill();

    if (highlighted) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.name, dx + w / 2, dy + 20);

    ctx.font = 'bold 24px sans-serif';
    const val = card.type === 'attack' ? card.attack : card.type === 'heal' ? `+${Math.abs(card.attack)}` : '🛡';
    ctx.fillText(String(val), dx + w / 2, dy + h / 2 + 8);

    ctx.font = '8px sans-serif';
    const typeLabel = card.type === 'attack' ? '攻击' : card.type === 'heal' ? '治疗' : '防御';
    ctx.fillText(typeLabel, dx + w / 2, dy + h - 10);

    ctx.restore();
  }

  private renderAnimations(): void {
    const now = performance.now();
    for (const anim of this.animations) {
      const t = Math.min(1, (now - anim.startTime) / anim.duration);
      const eased = anim.type === 'rollback' ? t : this.easeOut(t);
      const x = anim.fromX + (anim.toX - anim.fromX) * eased;
      const y = anim.fromY + (anim.toY - anim.fromY) * eased;
      const alpha = anim.type === 'rollback' ? t : 1;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.drawCard(anim.card, x, y, false);
      this.ctx.restore();
    }
  }

  private renderDragging(): void {
    if (!this.dragging) return;
    this.drawCard(this.dragging.card, this.dragging.currentX, this.dragging.currentY, true);
  }

  private renderFlash(): void {
    if (!this.flashing) return;
    const now = performance.now();
    const t = 1 - (now - this.flashing.startTime) / this.flashing.duration;
    this.ctx.save();
    this.ctx.fillStyle = this.flashing.color;
    this.ctx.globalAlpha = t * 0.3;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  private renderTurnIndicator(): void {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const now = performance.now();
    const pulse = 1 + Math.sin(now / 300) * 0.1;

    const text = this.gameState.currentTurn === this.localPlayerId ? '你的回合' : 'AI回合';
    ctx.save();
    ctx.font = `bold ${Math.round(16 * pulse)}px sans-serif`;
    ctx.fillStyle = this.gameState.currentTurn === this.localPlayerId ? '#66bb6a' : '#ff7043';
    ctx.textAlign = 'center';
    ctx.fillText(text, this.canvas.width / 2, 30);
    ctx.restore();
  }

  getState(): GameStateData | null {
    return this.gameState;
  }

  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  getAIPlayerId(): string {
    return this.aiPlayerId;
  }
}
