import { Card, GameState, GameAction } from '../shared/types';
import { NetworkManager } from './network';

export class CardGame {
  private network: NetworkManager;
  private gameState: GameState | null = null;
  private playerId: string;
  
  private handArea: HTMLElement;
  private playArea: HTMLElement;
  private aiHandArea: HTMLElement;
  
  private localHand: Card[] = [];
  private pendingPlayCards: Map<number, Card> = new Map();
  private cardElements: Map<string, HTMLElement> = new Map();
  
  private isDragging = false;
  private dragCard: HTMLElement | null = null;
  private dragCardId: string | null = null;
  private dragOffset = { x: 0, y: 0 };
  
  private playAnimationDuration = 200;
  private rollbackAnimationDuration = 400;
  
  private onPlayCallback: ((card: Card) => void) | null = null;
  
  constructor(network: NetworkManager) {
    this.network = network;
    this.playerId = network.getPlayerId();
    
    this.handArea = document.getElementById('hand-area')!;
    this.playArea = document.getElementById('play-area')!;
    this.aiHandArea = document.getElementById('ai-hand-area')!;
    
    this.setupNetworkCallbacks();
    this.setupGlobalDragListeners();
  }
  
  setOnPlayCallback(callback: (card: Card) => void): void {
    this.onPlayCallback = callback;
  }
  
  private setupNetworkCallbacks(): void {
    this.network.setOnActionAck((sequence) => {
      this.handleActionAck(sequence);
    });
    
    this.network.setOnActionRollback((sequence, reason) => {
      this.handleRollback(sequence, reason);
    });
    
    this.network.setOnGameStart((state) => {
      this.handleGameStart(state);
    });
    
    this.network.setOnStateUpdate((state) => {
      this.handleStateUpdate(state);
    });
  }
  
  private setupGlobalDragListeners(): void {
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        const touch = e.touches[0];
        this.updateDragPosition(touch.clientX, touch.clientY);
      }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
      if (this.isDragging) {
        this.onMouseUp(e as any);
      }
    });
  }
  
  private handleGameStart(state: GameState): void {
    this.gameState = state;
    const playerState = state.players[this.playerId];
    if (playerState) {
      this.localHand = [...playerState.hand];
      this.renderHand();
    }
    this.renderAIHand(state);
    this.updateUI();
  }
  
  private handleStateUpdate(state: GameState): void {
    this.gameState = state;
    this.updateUI();
    
    const playerState = state.players[this.playerId];
    if (playerState) {
      const serverHandIds = new Set(playerState.hand.map(c => c.id));
      const localHandIds = new Set(this.localHand.map(c => c.id));
      
      if (this.pendingPlayCards.size === 0) {
        this.localHand = [...playerState.hand];
        this.renderHand();
      }
    }
    
    this.renderAIHand(state);
  }
  
  private handleActionAck(sequence: number): void {
    this.pendingPlayCards.delete(sequence);
    this.flashPlayArea('blue');
  }
  
  private handleRollback(sequence: number, reason: string): void {
    console.log('[CardGame] Rollback:', sequence, reason);
    
    const card = this.pendingPlayCards.get(sequence);
    if (card) {
      this.pendingPlayCards.delete(sequence);
      this.localHand.push(card);
      this.renderHand(true);
      this.flashPlayArea('red');
    }
  }
  
  playCard(card: Card): number {
    const cardIndex = this.localHand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) return -1;
    
    this.localHand.splice(cardIndex, 1);
    
    const sequence = this.network.sendAction('play_card', { cardId: card.id, card });
    this.pendingPlayCards.set(sequence, card);
    
    this.renderHand();
    this.animateCardToPlayArea(card, sequence);
    
    if (this.onPlayCallback) {
      this.onPlayCallback(card);
    }
    
    return sequence;
  }
  
  private animateCardToPlayArea(card: Card, sequence: number): void {
    const cardEl = this.createCardElement(card);
    cardEl.classList.add('playing');
    
    const handRect = this.handArea.getBoundingClientRect();
    const playRect = this.playArea.getBoundingClientRect();
    const containerRect = document.getElementById('game-container')!.getBoundingClientRect();
    
    const startX = handRect.left - containerRect.left + handRect.width / 2 - 30;
    const startY = handRect.top - containerRect.top;
    const endX = playRect.left - containerRect.left + playRect.width / 2 - 30;
    const endY = playRect.top - containerRect.top + playRect.height / 2 - 45;
    
    cardEl.style.left = startX + 'px';
    cardEl.style.top = startY + 'px';
    
    document.getElementById('game-container')!.appendChild(cardEl);
    
    requestAnimationFrame(() => {
      cardEl.style.transition = `left ${this.playAnimationDuration}ms ease-out, top ${this.playAnimationDuration}ms ease-out`;
      cardEl.style.left = endX + 'px';
      cardEl.style.top = endY + 'px';
    });
    
    setTimeout(() => {
      cardEl.remove();
    }, this.playAnimationDuration + 100);
  }
  
  private renderHand(isRollback: boolean = false): void {
    this.handArea.innerHTML = '';
    this.cardElements.clear();
    
    this.localHand.forEach((card) => {
      const cardEl = this.createCardElement(card);
      
      if (isRollback) {
        cardEl.classList.add('rollback');
      }
      
      cardEl.addEventListener('mousedown', (e) => this.onCardMouseDown(e, card, cardEl));
      cardEl.addEventListener('touchstart', (e) => this.onCardTouchStart(e, card, cardEl), { passive: false });
      
      this.handArea.appendChild(cardEl);
      this.cardElements.set(card.id, cardEl);
    });
    
    this.updateHandCount();
  }
  
  private createCardElement(card: Card): HTMLElement {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.cardId = card.id;
    
    const valueEl = document.createElement('div');
    valueEl.className = 'card-value';
    valueEl.textContent = card.value.toString();
    
    const typeEl = document.createElement('div');
    typeEl.className = 'card-type';
    typeEl.textContent = this.getCardTypeName(card.type);
    
    cardEl.appendChild(valueEl);
    cardEl.appendChild(typeEl);
    
    return cardEl;
  }
  
  private getCardTypeName(type: string): string {
    switch (type) {
      case 'attack': return '攻击';
      case 'defense': return '防御';
      case 'skill': return '技能';
      default: return type;
    }
  }
  
  private onCardMouseDown(e: MouseEvent, card: Card, cardEl: HTMLElement): void {
    e.preventDefault();
    this.startDrag(card, cardEl, e.clientX, e.clientY);
  }
  
  private onCardTouchStart(e: TouchEvent, card: Card, cardEl: HTMLElement): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.startDrag(card, cardEl, touch.clientX, touch.clientY);
    }
  }
  
  private startDrag(card: Card, cardEl: HTMLElement, clientX: number, clientY: number): void {
    if (!this.canPlay()) return;
    
    this.isDragging = true;
    this.dragCard = cardEl;
    this.dragCardId = card.id;
    
    const rect = cardEl.getBoundingClientRect();
    this.dragOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    
    cardEl.classList.add('dragging');
    
    const containerRect = document.getElementById('game-container')!.getBoundingClientRect();
    cardEl.style.position = 'absolute';
    cardEl.style.left = (rect.left - containerRect.left) + 'px';
    cardEl.style.top = (rect.top - containerRect.top) + 'px';
    cardEl.style.zIndex = '100';
    cardEl.style.width = '60px';
    cardEl.style.height = '90px';
    
    document.getElementById('game-container')!.appendChild(cardEl);
    
    this.updateDragPosition(clientX, clientY);
  }
  
  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.updateDragPosition(e.clientX, e.clientY);
    }
  }
  
  private updateDragPosition(clientX: number, clientY: number): void {
    if (!this.dragCard) return;
    
    const containerRect = document.getElementById('game-container')!.getBoundingClientRect();
    
    const x = clientX - containerRect.left - this.dragOffset.x;
    const y = clientY - containerRect.top - this.dragOffset.y;
    
    this.dragCard.style.left = x + 'px';
    this.dragCard.style.top = y + 'px';
  }
  
  private onMouseUp(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging || !this.dragCard || !this.dragCardId) {
      this.isDragging = false;
      return;
    }
    
    const playRect = this.playArea.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const isInPlayArea = 
      clientX >= playRect.left &&
      clientX <= playRect.right &&
      clientY >= playRect.top &&
      clientY <= playRect.bottom;
    
    if (isInPlayArea) {
      const card = this.localHand.find(c => c.id === this.dragCardId);
      if (card) {
        this.playCard(card);
      }
    } else {
      this.dragCard.classList.remove('dragging');
      this.dragCard.style.position = '';
      this.dragCard.style.left = '';
      this.dragCard.style.top = '';
      this.dragCard.style.zIndex = '';
      this.handArea.appendChild(this.dragCard);
    }
    
    this.isDragging = false;
    this.dragCard = null;
    this.dragCardId = null;
  }
  
  private canPlay(): boolean {
    if (!this.gameState) return false;
    return this.gameState.currentTurn === this.playerId && !this.gameState.gameOver;
  }
  
  private flashPlayArea(color: 'blue' | 'red'): void {
    const className = color === 'blue' ? 'flash-blue' : 'flash-red';
    this.playArea.classList.remove('flash-blue', 'flash-red');
    
    void this.playArea.offsetWidth;
    
    this.playArea.classList.add(className);
    
    const duration = color === 'blue' ? 150 : 300;
    setTimeout(() => {
      this.playArea.classList.remove(className);
    }, duration);
  }
  
  private renderAIHand(state: GameState): void {
    this.aiHandArea.innerHTML = '';
    
    const aiPlayer = Object.values(state.players).find(p => p.id !== this.playerId);
    if (!aiPlayer) return;
    
    const cardCount = aiPlayer.hand.length;
    for (let i = 0; i < cardCount; i++) {
      const cardEl = document.createElement('div');
      cardEl.className = 'ai-card';
      cardEl.textContent = '?';
      this.aiHandArea.appendChild(cardEl);
    }
    
    document.getElementById('ai-hand-count')!.textContent = cardCount.toString();
  }
  
  animateAIPlayCard(card: Card): void {
    const cardEl = document.createElement('div');
    cardEl.className = 'card ai-playing';
    
    const valueEl = document.createElement('div');
    valueEl.className = 'card-value';
    valueEl.textContent = card.value.toString();
    
    const typeEl = document.createElement('div');
    typeEl.className = 'card-type';
    typeEl.textContent = this.getCardTypeName(card.type);
    
    cardEl.appendChild(valueEl);
    cardEl.appendChild(typeEl);
    
    const aiHandRect = this.aiHandArea.getBoundingClientRect();
    const playRect = this.playArea.getBoundingClientRect();
    const containerRect = document.getElementById('game-container')!.getBoundingClientRect();
    
    const startX = aiHandRect.left - containerRect.left + aiHandRect.width / 2 - 30;
    const startY = aiHandRect.top - containerRect.top;
    const endX = playRect.left - containerRect.left + playRect.width / 2 - 30;
    const endY = playRect.top - containerRect.top + playRect.height / 2 - 45;
    
    cardEl.style.position = 'absolute';
    cardEl.style.left = startX + 'px';
    cardEl.style.top = startY + 'px';
    cardEl.style.zIndex = '50';
    
    document.getElementById('game-container')!.appendChild(cardEl);
    
    requestAnimationFrame(() => {
      cardEl.style.transition = `left ${this.playAnimationDuration}ms ease-out, top ${this.playAnimationDuration}ms ease-out`;
      cardEl.style.left = endX + 'px';
      cardEl.style.top = endY + 'px';
    });
    
    this.flashPlayArea('blue');
    
    setTimeout(() => {
      cardEl.remove();
    }, this.playAnimationDuration + 100);
  }
  
  private updateUI(): void {
    if (!this.gameState) return;
    
    const playerState = this.gameState.players[this.playerId];
    const aiPlayer = Object.values(this.gameState.players).find(p => p.id !== this.playerId);
    
    if (playerState) {
      document.getElementById('player-hp')!.textContent = playerState.hp.toString();
      this.updateHealthBar('player-health-bar', playerState.hp, playerState.maxHp);
    }
    
    if (aiPlayer) {
      document.getElementById('ai-hp')!.textContent = aiPlayer.hp.toString();
      this.updateHealthBar('ai-health-bar', aiPlayer.hp, aiPlayer.maxHp);
      
      const aiStatus = document.getElementById('ai-status')!;
      if (this.gameState.currentTurn === aiPlayer.id) {
        aiStatus.textContent = '思考中...';
      } else {
        aiStatus.textContent = '等待中...';
      }
    }
    
    const turnIndicator = document.getElementById('turn-indicator')!;
    if (this.gameState.currentTurn === this.playerId) {
      turnIndicator.textContent = '你的回合';
      turnIndicator.style.color = '#66bb6a';
    } else if (aiPlayer) {
      turnIndicator.textContent = 'AI回合';
      turnIndicator.style.color = '#ef5350';
    }
    
    document.getElementById('discard-count')!.textContent = this.gameState.discardPile.length.toString();
  }
  
  private updateHealthBar(elementId: string, currentHp: number, maxHp: number): void {
    const healthBar = document.getElementById(elementId)!;
    const percentage = (currentHp / maxHp) * 100;
    healthBar.style.width = percentage + '%';
    
    healthBar.classList.remove('full', 'half', 'low');
    if (percentage > 50) {
      healthBar.classList.add('full');
    } else if (percentage > 25) {
      healthBar.classList.add('half');
    } else {
      healthBar.classList.add('low');
    }
  }
  
  private updateHandCount(): void {
    document.getElementById('player-hand-count')!.textContent = this.localHand.length.toString();
  }
  
  getLocalHand(): Card[] {
    return [...this.localHand];
  }
  
  getGameState(): GameState | null {
    return this.gameState;
  }
}
