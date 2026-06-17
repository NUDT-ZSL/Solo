import type { Card, GameStateData, PlayerState } from '../shared/types';
import { NetworkManager } from './network';

export class CardGame {
  private network: NetworkManager;
  private playerId: string;
  private gameState: GameStateData | null = null;

  private handArea: HTMLElement;
  private playArea: HTMLElement;
  private playerHealthBar: HTMLElement;
  private aiHealthBar: HTMLElement;
  private playerHandCount: HTMLElement;
  private aiHandCount: HTMLElement;
  private turnIndicator: HTMLElement;
  private flashOverlay: HTMLElement;
  private discardCount: HTMLElement;
  private latencyValue: HTMLElement;
  private queueCount: HTMLElement;
  private aiStatus: HTMLElement;

  private draggingCard: HTMLElement | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private pendingRollbacks: Map<number, { card: Card; element: HTMLElement }> = new Map();

  constructor(network: NetworkManager, playerId: string) {
    this.network = network;
    this.playerId = playerId;

    this.handArea = document.getElementById('hand-area')!;
    this.playArea = document.getElementById('play-area')!;
    this.playerHealthBar = document.getElementById('player-health')!;
    this.aiHealthBar = document.getElementById('ai-health')!;
    this.playerHandCount = document.getElementById('player-hand-count')!;
    this.aiHandCount = document.getElementById('ai-hand-count')!;
    this.turnIndicator = document.getElementById('turn-indicator')!;
    this.flashOverlay = document.getElementById('flash-overlay')!;
    this.discardCount = document.getElementById('discard-count')!;
    this.latencyValue = document.getElementById('latency-value')!;
    this.queueCount = document.getElementById('queue-count')!;
    this.aiStatus = document.getElementById('ai-status')!;

    this.setupNetworkListeners();
    this.setupPlayAreaEvents();
    this.updateLatencyDisplay(network.getCurrentLatency());
    this.updateQueueDisplay(network.getQueueSize());
  }

  private setupNetworkListeners(): void {
    this.network.on({
      onAck: (sequence, state) => {
        this.pendingRollbacks.delete(sequence);
        if (state) {
          this.applyState(state);
        }
      },
      onRollback: (sequence, reason) => {
        this.handleRollback(sequence, reason);
      },
      onStateSync: (state) => {
        this.applyState(state);
      },
      onGameOver: (winner) => {
        this.handleGameOver(winner);
      },
      onQueueChange: (count) => {
        this.updateQueueDisplay(count);
      },
      onLatencyChange: (latency) => {
        this.updateLatencyDisplay(latency);
      },
    });
  }

  private setupPlayAreaEvents(): void {
    this.playArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.playArea.classList.add('drag-over');
    });

    this.playArea.addEventListener('dragleave', () => {
      this.playArea.classList.remove('drag-over');
    });

    this.playArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.playArea.classList.remove('drag-over');
    });
  }

  public renderHand(cards: Card[]): void {
    this.handArea.innerHTML = '';
    cards.forEach((card) => {
      const cardEl = this.createCardElement(card);
      this.handArea.appendChild(cardEl);
    });
    this.playerHandCount.textContent = `手牌: ${cards.length}`;
  }

  private createCardElement(card: Card): HTMLElement {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.cardId = card.id;
    cardEl.draggable = true;

    const valueEl = document.createElement('div');
    valueEl.className = 'card-value';
    valueEl.textContent = card.name;

    const suitEl = document.createElement('div');
    suitEl.className = 'card-suit';
    suitEl.textContent = card.suit;

    cardEl.appendChild(valueEl);
    cardEl.appendChild(suitEl);

    cardEl.addEventListener('mousedown', (e) => this.startDrag(e, card, cardEl));

    return cardEl;
  }

  private startDrag(e: MouseEvent, card: Card, cardEl: HTMLElement): void {
    if (!this.gameState || this.gameState.currentTurn !== this.playerId || this.gameState.gameOver) {
      return;
    }

    e.preventDefault();

    const rect = cardEl.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;
    this.draggingCard = cardEl;

    cardEl.classList.add('dragging');
    cardEl.style.left = `${e.clientX - this.dragOffsetX}px`;
    cardEl.style.top = `${e.clientY - this.dragOffsetY}px`;
    document.body.appendChild(cardEl);

    const onMove = (ev: MouseEvent) => {
      if (this.draggingCard) {
        this.draggingCard.style.left = `${ev.clientX - this.dragOffsetX}px`;
        this.draggingCard.style.top = `${ev.clientY - this.dragOffsetY}px`;
      }
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      if (this.draggingCard) {
        const playRect = this.playArea.getBoundingClientRect();
        const cardRect = this.draggingCard.getBoundingClientRect();
        const isInPlayArea =
          cardRect.left < playRect.right &&
          cardRect.right > playRect.left &&
          cardRect.top < playRect.bottom &&
          cardRect.bottom > playRect.top;

        if (isInPlayArea) {
          this.playCard(card, this.draggingCard);
        } else {
          this.cancelDrag(this.draggingCard);
        }
        this.draggingCard = null;
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private playCard(card: Card, cardEl: HTMLElement): void {
    if (!this.gameState) return;

    const playerState = this.gameState.players[this.playerId];
    const handSnapshot = [...playerState.hand];
    const cardSnapshot = { ...card };

    const sequence = this.network.sendPlayCard(card.id, {
      card: cardSnapshot,
      hand: handSnapshot,
    });

    if (sequence === -1) {
      this.cancelDrag(cardEl);
      return;
    }

    this.pendingRollbacks.set(sequence, { card, element: cardEl });

    cardEl.classList.remove('dragging');
    cardEl.style.position = '';
    cardEl.style.left = '';
    cardEl.style.top = '';
    this.handArea.appendChild(cardEl);
    cardEl.classList.add('playing');

    this.triggerPlayFlash();

    const currentHand = playerState.hand.filter((c) => c.id !== card.id);
    this.gameState.players[this.playerId].hand = currentHand;
    this.renderHand(currentHand);
  }

  private cancelDrag(cardEl: HTMLElement): void {
    cardEl.classList.remove('dragging');
    cardEl.style.position = '';
    cardEl.style.left = '';
    cardEl.style.top = '';
    this.handArea.appendChild(cardEl);
  }

  private handleRollback(sequence: number, reason: string): void {
    const pending = this.pendingRollbacks.get(sequence);
    console.log('Rollback:', reason);

    if (pending && this.gameState) {
      const playerState = this.gameState.players[this.playerId];
      if (!playerState.hand.find((c) => c.id === pending.card.id)) {
        playerState.hand.push(pending.card);
        this.renderHand(playerState.hand);
      }
      this.pendingRollbacks.delete(sequence);
    }

    this.triggerRollbackFlash();
  }

  private triggerPlayFlash(): void {
    this.flashOverlay.classList.remove('play-flash', 'rollback-flash');
    void this.flashOverlay.offsetWidth;
    this.flashOverlay.classList.add('play-flash');
    setTimeout(() => {
      this.flashOverlay.classList.remove('play-flash');
    }, 200);
  }

  private triggerRollbackFlash(): void {
    this.flashOverlay.classList.remove('play-flash', 'rollback-flash');
    void this.flashOverlay.offsetWidth;
    this.flashOverlay.classList.add('rollback-flash');
    setTimeout(() => {
      this.flashOverlay.classList.remove('rollback-flash');
    }, 350);
  }

  public applyState(state: GameStateData): void {
    this.gameState = state;

    const playerState = state.players[this.playerId];
    if (playerState) {
      const pendingCardIds = new Set<string>();
      this.pendingRollbacks.forEach((p) => pendingCardIds.add(p.card.id));

      const displayHand = playerState.hand.filter((c) => !pendingCardIds.has(c.id));
      this.renderHand(displayHand);
      this.updateHealthBar(this.playerHealthBar, playerState.health, playerState.maxHealth);
    }

    const aiState = state.players['ai-player'];
    if (aiState) {
      this.aiHandCount.textContent = `手牌: ${aiState.hand.length}`;
      this.updateHealthBar(this.aiHealthBar, aiState.health, aiState.maxHealth);
      this.aiStatus.textContent = state.currentTurn === 'ai-player' ? '思考中...' : '等待中';
    }

    this.discardCount.textContent = String(state.discardPile.length);
    this.updateTurnIndicator(state.currentTurn);

    if (state.gameOver) {
      this.handleGameOver(state.winner || '');
    }
  }

  private updateHealthBar(element: HTMLElement, health: number, maxHealth: number): void {
    const percent = (health / maxHealth) * 100;
    element.style.width = `${percent}%`;

    if (percent > 50) {
      element.style.background = '#66bb6a';
    } else if (percent > 25) {
      element.style.background = '#ffa726';
    } else {
      element.style.background = '#ef5350';
    }
  }

  private updateTurnIndicator(currentTurn: string): void {
    const name = currentTurn === this.playerId ? '本地玩家' : 'AI对手';
    this.turnIndicator.textContent = `回合: ${name}`;
  }

  private updateLatencyDisplay(latency: number): void {
    this.latencyValue.textContent = `${latency}ms`;

    if (latency < 100) {
      this.latencyValue.style.color = '#66bb6a';
    } else if (latency < 200) {
      this.latencyValue.style.color = '#ffca28';
    } else {
      this.latencyValue.style.color = '#ef5350';
    }
  }

  private updateQueueDisplay(count: number): void {
    this.queueCount.textContent = `队列: ${count}`;
  }

  private handleGameOver(winner: string): void {
    const stats = this.network.getStats();
    const avgLatency = stats.latencySamples > 0 ? Math.round(stats.totalLatency / stats.latencySamples) : 0;
    const effectivePlays = stats.totalPlays - stats.rollbackCount;
    const playRate = stats.totalPlays > 0 ? Math.round((effectivePlays / stats.totalPlays) * 100) : 0;

    const resultText = winner === this.playerId ? '🎉 你赢了!' : '😔 AI获胜';
    document.getElementById('game-result')!.textContent = resultText;
    document.getElementById('avg-latency')!.textContent = `${avgLatency}ms`;
    document.getElementById('rollback-count')!.textContent = String(stats.rollbackCount);
    document.getElementById('play-rate')!.textContent = `${playRate}%`;
    document.getElementById('stats-panel')!.style.display = 'block';

    document.getElementById('restart-btn')!.addEventListener('click', () => {
      window.location.reload();
    });
  }

  public showAICardPlay(card: Card): void {
    const aiPlayEl = document.createElement('div');
    aiPlayEl.className = 'card';
    aiPlayEl.style.position = 'absolute';
    aiPlayEl.style.top = '120px';
    aiPlayEl.style.right = '60px';
    aiPlayEl.style.opacity = '0';
    aiPlayEl.style.transform = 'scale(0.8)';
    aiPlayEl.style.transition = 'all 0.2s ease-out';
    aiPlayEl.innerHTML = `
      <div class="card-value">${card.name}</div>
      <div class="card-suit">${card.suit}</div>
    `;
    document.getElementById('game-table')!.appendChild(aiPlayEl);

    requestAnimationFrame(() => {
      aiPlayEl.style.opacity = '1';
      aiPlayEl.style.transform = 'translateY(180px) translateX(-300px) scale(1.2)';
    });

    setTimeout(() => {
      aiPlayEl.remove();
    }, 800);
  }
}
