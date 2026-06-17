import { NetworkManager, Card, GameState } from './network';

interface CardPosition {
  x: number;
  y: number;
}

interface PlayedCardAnimation {
  card: Card;
  element: HTMLElement;
  fromPosition: CardPosition;
  sequence: number;
  isLocal: boolean;
}

export class CardGame {
  private network: NetworkManager;
  private hand: Card[] = [];
  private gameState: GameState | null = null;
  private cardElements: Map<string, HTMLElement> = new Map();
  private playedCards: Map<number, PlayedCardAnimation> = new Map();
  
  private handArea: HTMLElement | null = null;
  private playArea: HTMLElement | null = null;
  private aiHandArea: HTMLElement | null = null;
  
  private draggedCard: {
    card: Card;
    element: HTMLElement;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null = null;
  
  private isDragging: boolean = false;
  private dragOverPlayArea: boolean = false;
  
  private onGameOver: ((winner: string) => void) | null = null;

  constructor(network: NetworkManager) {
    this.network = network;
    this.setupNetworkCallbacks();
  }

  private setupNetworkCallbacks() {
    this.network.setOnGameStart((state) => {
      this.handleGameStart(state);
    });
    
    this.network.setOnStateUpdate((state, playedCard, damage, fromAi) => {
      this.handleStateUpdate(state, playedCard, damage, fromAi);
    });
    
    this.network.setOnAck((sequence, payload) => {
      this.handleAck(sequence, payload);
    });
    
    this.network.setOnRollback((sequence, state, reason) => {
      this.handleRollback(sequence, state, reason);
    });
  }

  init() {
    this.handArea = document.getElementById('hand-area');
    this.playArea = document.getElementById('play-area');
    this.aiHandArea = document.getElementById('ai-hand-area');
    
    if (!this.handArea || !this.playArea || !this.aiHandArea) {
      console.error('找不到游戏区域元素');
      return;
    }
    
    this.setupDragAndDrop();
    this.setupRestartButton();
  }

  private setupDragAndDrop() {
    if (!this.handArea || !this.playArea) return;
    
    this.playArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.isDragging && !this.dragOverPlayArea) {
        this.dragOverPlayArea = true;
        this.playArea?.classList.add('drag-over');
      }
    });
    
    this.playArea.addEventListener('dragleave', () => {
      if (this.dragOverPlayArea) {
        this.dragOverPlayArea = false;
        this.playArea?.classList.remove('drag-over');
      }
    });
    
    this.playArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dragOverPlayArea = false;
      this.playArea?.classList.remove('drag-over');
      
      if (this.draggedCard) {
        this.handleCardPlay(this.draggedCard.card);
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.draggedCard) {
        const x = e.clientX - this.draggedCard.offsetX;
        const y = e.clientY - this.draggedCard.offsetY;
        
        this.draggedCard.element.style.position = 'fixed';
        this.draggedCard.element.style.left = `${x}px`;
        this.draggedCard.element.style.top = `${y}px`;
        this.draggedCard.element.style.zIndex = '1000';
        this.draggedCard.element.style.pointerEvents = 'none';
        
        if (this.playArea) {
          const playRect = this.playArea.getBoundingClientRect();
          const isOver = e.clientX >= playRect.left && e.clientX <= playRect.right &&
                         e.clientY >= playRect.top && e.clientY <= playRect.bottom;
          
          if (isOver !== this.dragOverPlayArea) {
            this.dragOverPlayArea = isOver;
            if (isOver) {
              this.playArea.classList.add('drag-over');
            } else {
              this.playArea.classList.remove('drag-over');
            }
          }
        }
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isDragging && this.draggedCard) {
        if (this.dragOverPlayArea) {
          this.handleCardPlay(this.draggedCard.card);
        } else {
          this.resetDraggedCard();
        }
      }
    });
  }

  private setupRestartButton() {
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', async () => {
        try {
          const state = await this.network.restartGame();
          this.handleGameStart(state);
          const gameOverPanel = document.getElementById('game-over-panel');
          if (gameOverPanel) {
            gameOverPanel.style.display = 'none';
          }
        } catch (error) {
          console.error('重启游戏失败:', error);
        }
      });
    }
  }

  private handleGameStart(state: GameState) {
    this.gameState = state;
    this.hand = [...state.yourHand];
    this.renderHand();
    this.renderAiHand(state.opponentHandSize);
    this.updateUI(state);
    this.clearPlayArea();
  }

  private handleStateUpdate(state: GameState, playedCard?: Card, damage?: number, fromAi?: boolean) {
    this.gameState = state;
    
    if (fromAi && playedCard) {
      this.animateAiPlayCard(playedCard, damage || 0);
    }
    
    this.hand = [...state.yourHand];
    this.renderHand();
    this.renderAiHand(state.opponentHandSize);
    this.updateUI(state);
    
    if (state.isGameOver && state.winner) {
      setTimeout(() => {
        this.showGameOver(state.winner!);
      }, 1000);
    }
  }

  private handleAck(sequence: number, payload?: any) {
    const playedCard = this.playedCards.get(sequence);
    if (playedCard) {
      this.flashPlayArea('blue');
    }
  }

  private handleRollback(sequence: number, state: GameState, reason?: string) {
    console.log(`回滚操作 #${sequence}: ${reason}`);
    
    const playedCard = this.playedCards.get(sequence);
    if (playedCard) {
      this.rollbackCardAnimation(playedCard);
      this.playedCards.delete(sequence);
    }
    
    this.flashPlayArea('red');
    
    this.gameState = state;
    this.hand = [...state.yourHand];
    
    setTimeout(() => {
      this.renderHand();
      this.updateUI(state);
    }, 400);
  }

  private handleCardPlay(card: Card) {
    if (!this.gameState || this.gameState.isGameOver) return;
    if (this.gameState.currentTurn !== 'player') return;
    
    if (!this.handArea || !this.playArea) return;
    
    const cardEl = this.cardElements.get(card.id);
    if (!cardEl) return;
    
    const cardRect = cardEl.getBoundingClientRect();
    const playRect = this.playArea.getBoundingClientRect();
    
    const fromPosition: CardPosition = {
      x: cardRect.left,
      y: cardRect.top,
    };
    
    cardEl.classList.add('card-playing');
    this.removeCardFromHand(card.id);
    
    const playedCardEl = this.createPlayedCardElement(card);
    this.playArea.appendChild(playedCardEl);
    
    const sequence = this.network.playCard(card);
    
    this.playedCards.set(sequence, {
      card,
      element: playedCardEl,
      fromPosition,
      sequence,
      isLocal: true,
    });
    
    this.animateCardToPlayArea(playedCardEl, fromPosition);
    
    if (this.draggedCard) {
      this.draggedCard.element.remove();
      this.draggedCard = null;
      this.isDragging = false;
    }
    
    this.updateUI(this.gameState!);
  }

  private animateCardToPlayArea(element: HTMLElement, from: CardPosition) {
    if (!this.playArea) return;
    
    const playRect = this.playArea.getBoundingClientRect();
    const targetX = playRect.left + playRect.width / 2 - 30;
    const targetY = playRect.top + playRect.height / 2 - 45;
    
    element.style.position = 'fixed';
    element.style.left = `${from.x}px`;
    element.style.top = `${from.y}px`;
    element.style.transition = 'none';
    element.style.opacity = '1';
    
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.2s ease-out';
      element.style.left = `${targetX}px`;
      element.style.top = `${targetY}px`;
    });
  }

  private rollbackCardAnimation(playedCard: PlayedCardAnimation) {
    const element = playedCard.element;
    
    element.style.transition = 'all 0.4s ease-in';
    element.style.left = `${playedCard.fromPosition.x}px`;
    element.style.top = `${playedCard.fromPosition.y}px`;
    element.style.opacity = '0';
    
    setTimeout(() => {
      element.remove();
    }, 400);
  }

  private animateAiPlayCard(card: Card, damage: number) {
    if (!this.playArea || !this.aiHandArea) return;
    
    const aiHandRect = this.aiHandArea.getBoundingClientRect();
    const playRect = this.playArea.getBoundingClientRect();
    
    const fromX = aiHandRect.left + aiHandRect.width / 2 - 25;
    const fromY = aiHandRect.top + aiHandRect.height / 2 - 37;
    
    const playedCardEl = this.createPlayedCardElement(card);
    document.body.appendChild(playedCardEl);
    
    playedCardEl.style.position = 'fixed';
    playedCardEl.style.left = `${fromX}px`;
    playedCardEl.style.top = `${fromY}px`;
    playedCardEl.style.transition = 'none';
    playedCardEl.style.opacity = '1';
    playedCardEl.style.zIndex = '100';
    
    const targetX = playRect.left + playRect.width / 2 - 30;
    const targetY = playRect.top + playRect.height / 2 - 45;
    
    requestAnimationFrame(() => {
      playedCardEl.style.transition = 'all 0.2s ease-out';
      playedCardEl.style.left = `${targetX}px`;
      playedCardEl.style.top = `${targetY}px`;
    });
    
    setTimeout(() => {
      this.flashPlayArea('blue');
    }, 200);
    
    setTimeout(() => {
      playedCardEl.remove();
    }, 1500);
  }

  private createPlayedCardElement(card: Card): HTMLElement {
    const el = document.createElement('div');
    el.className = 'played-card';
    el.innerHTML = `
      <div class="card-value">${card.value}</div>
      <div class="card-suit">${card.suit}</div>
    `;
    return el;
  }

  private clearPlayArea() {
    if (this.playArea) {
      const cards = this.playArea.querySelectorAll('.played-card');
      cards.forEach((card) => card.remove());
    }
    this.playedCards.clear();
  }

  private flashPlayArea(color: 'blue' | 'red') {
    if (!this.playArea) return;
    
    const flashClass = color === 'blue' ? 'flash-blue' : 'flash-red';
    this.playArea.classList.add(flashClass);
    
    setTimeout(() => {
      this.playArea?.classList.remove(flashClass);
    }, color === 'blue' ? 150 : 300);
  }

  private renderHand() {
    if (!this.handArea) return;
    
    this.handArea.innerHTML = '';
    this.cardElements.clear();
    
    for (const card of this.hand) {
      const cardEl = this.createCardElement(card);
      this.handArea.appendChild(cardEl);
      this.cardElements.set(card.id, cardEl);
    }
    
    const handCountEl = document.getElementById('player-hand-count');
    if (handCountEl) {
      handCountEl.textContent = this.hand.length.toString();
    }
  }

  private createCardElement(card: Card): HTMLElement {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.cardId = card.id;
    el.innerHTML = `
      <div class="card-value">${card.value}</div>
      <div class="card-suit">${card.suit}</div>
    `;
    
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDrag(card, el, e);
    });
    
    return el;
  }

  private startDrag(card: Card, element: HTMLElement, e: MouseEvent) {
    if (!this.gameState || this.gameState.currentTurn !== 'player') return;
    if (this.gameState.isGameOver) return;
    
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${e.clientX - 30}px`;
    clone.style.top = `${e.clientY - 45}px`;
    clone.style.zIndex = '1000';
    clone.classList.add('dragging');
    document.body.appendChild(clone);
    
    element.style.opacity = '0.3';
    
    this.draggedCard = {
      card,
      element: clone,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 30,
      offsetY: 45,
    };
    
    this.isDragging = true;
  }

  private resetDraggedCard() {
    if (this.draggedCard) {
      this.draggedCard.element.remove();
      
      const originalCard = this.cardElements.get(this.draggedCard.card.id);
      if (originalCard) {
        originalCard.style.opacity = '1';
      }
      
      this.draggedCard = null;
      this.isDragging = false;
      this.dragOverPlayArea = false;
      this.playArea?.classList.remove('drag-over');
    }
  }

  private removeCardFromHand(cardId: string) {
    const index = this.hand.findIndex((c) => c.id === cardId);
    if (index !== -1) {
      this.hand.splice(index, 1);
    }
    
    const cardEl = this.cardElements.get(cardId);
    if (cardEl) {
      cardEl.remove();
      this.cardElements.delete(cardId);
    }
    
    const handCountEl = document.getElementById('player-hand-count');
    if (handCountEl) {
      handCountEl.textContent = this.hand.length.toString();
    }
  }

  private renderAiHand(count: number) {
    if (!this.aiHandArea) return;
    
    this.aiHandArea.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
      const cardEl = document.createElement('div');
      cardEl.className = 'ai-card';
      cardEl.textContent = '?';
      this.aiHandArea.appendChild(cardEl);
    }
  }

  private updateUI(state: GameState) {
    const playerHealthEl = document.getElementById('player-health');
    const playerHealthBar = document.getElementById('player-health-bar');
    
    if (playerHealthEl) {
      playerHealthEl.textContent = state.yourHealth.toString();
    }
    
    if (playerHealthBar) {
      const healthPercent = (state.yourHealth / state.yourMaxHealth) * 100;
      playerHealthBar.style.width = `${healthPercent}%`;
      
      playerHealthBar.classList.remove('medium', 'low');
      if (healthPercent <= 30) {
        playerHealthBar.classList.add('low');
      } else if (healthPercent <= 50) {
        playerHealthBar.classList.add('medium');
      }
    }
    
    const aiHealthEl = document.getElementById('ai-health');
    const aiHealthBar = document.getElementById('ai-health-bar');
    
    if (aiHealthEl) {
      aiHealthEl.textContent = state.opponentHealth.toString();
    }
    
    if (aiHealthBar) {
      const healthPercent = (state.opponentHealth / state.opponentMaxHealth) * 100;
      aiHealthBar.style.width = `${healthPercent}%`;
      
      aiHealthBar.classList.remove('medium', 'low');
      if (healthPercent <= 30) {
        aiHealthBar.classList.add('low');
      } else if (healthPercent <= 50) {
        aiHealthBar.classList.add('medium');
      }
    }
    
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
      if (state.currentTurn === 'player') {
        turnIndicator.textContent = '你的回合';
        turnIndicator.className = 'player-turn';
      } else {
        turnIndicator.textContent = 'AI回合';
        turnIndicator.className = 'ai-turn';
      }
    }
    
    const discardCount = document.getElementById('discard-count');
    if (discardCount) {
      discardCount.textContent = `${state.discardPileSize}张`;
    }
    
    const aiStatus = document.getElementById('ai-status');
    if (aiStatus) {
      aiStatus.textContent = state.currentTurn === 'ai' ? '思考中...' : '等待中';
    }
  }

  private showGameOver(winner: string) {
    const gameOverPanel = document.getElementById('game-over-panel');
    const gameOverTitle = document.getElementById('game-over-title');
    const avgLatencyEl = document.getElementById('avg-latency');
    const rollbackCountEl = document.getElementById('rollback-count');
    const validPlayRateEl = document.getElementById('valid-play-rate');
    
    if (!gameOverPanel || !gameOverTitle) return;
    
    gameOverTitle.textContent = winner === 'player' ? '🎉 你赢了！' : '😢 你输了';
    gameOverTitle.className = winner === 'player' ? 'winner' : 'loser';
    
    const stats = this.network.getStats();
    
    if (avgLatencyEl) {
      avgLatencyEl.textContent = `${stats.avgLatency} ms`;
    }
    
    if (rollbackCountEl) {
      rollbackCountEl.textContent = stats.rollbackCount.toString();
    }
    
    if (validPlayRateEl) {
      const rate = stats.totalPlays > 0 
        ? Math.round((stats.validPlays / stats.totalPlays) * 100) 
        : 0;
      validPlayRateEl.textContent = `${rate}%`;
    }
    
    gameOverPanel.style.display = 'block';
  }

  setOnGameOver(callback: (winner: string) => void) {
    this.onGameOver = callback;
  }

  getHand(): Card[] {
    return [...this.hand];
  }

  getGameState(): GameState | null {
    return this.gameState;
  }
}
