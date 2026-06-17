import { Card, GameState, PlayerAction, NetworkStats } from '../types';
import { networkClient } from './network';

class CardGame {
  private gameState: GameState | null = null;
  private playerId = 'player1';
  private handContainer: HTMLElement | null = null;
  private draggingCard: HTMLElement | null = null;
  private dragOffset = { x: 0, y: 0 };
  private pendingCardAnimations: Map<string, HTMLElement> = new Map();

  init(containerId: string): void {
    this.handContainer = document.getElementById(containerId);
    if (!this.handContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    networkClient.onStateUpdate = (state) => this.handleStateUpdate(state);
    networkClient.onRollback = (action, reason) => this.handleRollback(action, reason);
    networkClient.onStatsUpdate = (stats) => this.handleStatsUpdate(stats);

    this.setupDragEvents();
  }

  private setupDragEvents(): void {
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  private handleMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.classList.contains('card') && this.handContainer?.contains(target)) {
      this.draggingCard = target;
      const rect = target.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      target.style.position = 'fixed';
      target.style.zIndex = '1000';
      this.updateCardPosition(target, e);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.draggingCard) {
      this.updateCardPosition(this.draggingCard, e);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.draggingCard) {
      const cardId = this.draggingCard.dataset.cardId;
      const dropZone = document.querySelector('.drop-zone') as HTMLElement;
      
      if (dropZone && cardId) {
        const dropRect = dropZone.getBoundingClientRect();
        const cardRect = this.draggingCard.getBoundingClientRect();
        
        if (this.isOverlapping(cardRect, dropRect)) {
          this.playCard(cardId);
        } else {
          this.resetCardPosition(this.draggingCard);
        }
      } else {
        this.resetCardPosition(this.draggingCard);
      }
      
      this.draggingCard = null;
    }
  }

  private updateCardPosition(card: HTMLElement, e: MouseEvent): void {
    card.style.left = `${e.clientX - this.dragOffset.x}px`;
    card.style.top = `${e.clientY - this.dragOffset.y}px`;
  }

  private resetCardPosition(card: HTMLElement): void {
    card.style.position = '';
    card.style.left = '';
    card.style.top = '';
    card.style.zIndex = '';
  }

  private isOverlapping(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  renderHand(): void {
    if (!this.handContainer || !this.gameState) return;
    
    this.handContainer.innerHTML = '';
    
    this.gameState.playerHand.forEach((card) => {
      const cardElement = this.createCardElement(card);
      this.handContainer?.appendChild(cardElement);
    });
  }

  private createCardElement(card: Card): HTMLElement {
    const element = document.createElement('div');
    element.className = 'card';
    element.dataset.cardId = card.id;
    element.textContent = `${card.value} of ${card.suit}`;
    element.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
    return element;
  }

  playCard(cardId: string): void {
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
    if (!cardElement || !this.gameState) return;

    const card = this.gameState.playerHand.find((c) => c.id === cardId);
    if (!card) return;

    this.animatePlayCard(cardElement);
    this.pendingCardAnimations.set(cardId, cardElement);

    networkClient.sendAction({
      type: 'play',
      cardId,
      playerId: this.playerId,
    });
  }

  private animatePlayCard(cardElement: HTMLElement): void {
    cardElement.style.transform = 'translateY(-100px) scale(1.1)';
    cardElement.style.opacity = '0';
    setTimeout(() => {
      if (cardElement.parentNode) {
        cardElement.parentNode.removeChild(cardElement);
      }
    }, 200);
  }

  rollbackCard(action: PlayerAction): void {
    const cardElement = this.pendingCardAnimations.get(action.cardId);
    if (cardElement) {
      this.animateRollbackCard(cardElement);
      this.pendingCardAnimations.delete(action.cardId);
    }
    this.renderHand();
  }

  private animateRollbackCard(cardElement: HTMLElement): void {
    cardElement.style.transition = 'opacity 0.4s ease-in, transform 0.4s ease-in';
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'scale(0.5)';
    
    if (this.handContainer && !this.handContainer.contains(cardElement)) {
      this.handContainer.appendChild(cardElement);
    }
    
    requestAnimationFrame(() => {
      cardElement.style.opacity = '1';
      cardElement.style.transform = 'scale(1)';
    });
  }

  private handleStateUpdate(state: GameState): void {
    this.gameState = state;
    this.pendingCardAnimations.clear();
    this.updateUI();
  }

  private handleRollback(action: PlayerAction, reason: string): void {
    console.warn(`Rollback: ${reason}`, action);
    this.rollbackCard(action);
  }

  private handleStatsUpdate(stats: NetworkStats): void {
    const statsElement = document.getElementById('network-stats');
    if (statsElement) {
      statsElement.textContent = `Latency: ${stats.avgLatency.toFixed(0)}ms | Rollbacks: ${stats.rollbackCount} | Success: ${(stats.successRate * 100).toFixed(1)}%`;
    }
  }

  updateUI(): void {
    if (!this.gameState) return;

    this.renderHand();

    const playerHealthElement = document.getElementById('player-health');
    const aiHealthElement = document.getElementById('ai-health');
    const turnIndicatorElement = document.getElementById('turn-indicator');
    const turnCountElement = document.getElementById('turn-count');

    if (playerHealthElement) {
      playerHealthElement.textContent = `Player: ${this.gameState.playerHealth}`;
    }
    if (aiHealthElement) {
      aiHealthElement.textContent = `AI: ${this.gameState.aiHealth}`;
    }
    if (turnIndicatorElement) {
      turnIndicatorElement.textContent = `Current Turn: ${this.gameState.currentTurn}`;
    }
    if (turnCountElement) {
      turnCountElement.textContent = `Turn: ${this.gameState.turnCount}`;
    }
  }
}

export const cardGame = new CardGame();
