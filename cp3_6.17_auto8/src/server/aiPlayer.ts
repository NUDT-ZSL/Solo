import { GameAction } from '../shared/types';
import { GameStateManager } from './gameState';

export class AIPlayerServer {
  private gameStateManager: GameStateManager;
  private aiPlayerId: string;
  private isEnabled: boolean = false;
  
  private minDelay: number = 800;
  private maxDelay: number = 2000;
  
  private onActionReady: ((action: GameAction) => void) | null = null;
  private actionTimer: NodeJS.Timeout | null = null;
  
  constructor(gameStateManager: GameStateManager, aiPlayerId: string) {
    this.gameStateManager = gameStateManager;
    this.aiPlayerId = aiPlayerId;
  }
  
  setOnActionReady(callback: (action: GameAction) => void): void {
    this.onActionReady = callback;
  }
  
  enable(): void {
    this.isEnabled = true;
    this.checkTurn();
  }
  
  disable(): void {
    this.isEnabled = false;
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
  }
  
  setDelayRange(min: number, max: number): void {
    this.minDelay = min;
    this.maxDelay = max;
  }
  
  checkTurn(): void {
    if (!this.isEnabled) return;
    
    const state = this.gameStateManager.getState();
    if (!state) return;
    
    if (state.gameOver) {
      this.disable();
      return;
    }
    
    if (state.currentTurn === this.aiPlayerId) {
      this.scheduleAction();
    }
  }
  
  private scheduleAction(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
    }
    
    const delay = this.getRandomDelay();
    
    this.actionTimer = setTimeout(() => {
      this.executeAction();
    }, delay);
  }
  
  private getRandomDelay(): number {
    return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
  }
  
  private executeAction(): void {
    if (!this.isEnabled) return;
    
    const state = this.gameStateManager.getState();
    if (!state || state.gameOver) return;
    
    if (state.currentTurn !== this.aiPlayerId) return;
    
    const aiAction = this.gameStateManager.generateAIAction(this.aiPlayerId);
    if (aiAction && this.onActionReady) {
      aiAction.sequence = this.generateSequence();
      aiAction.timestamp = Date.now();
      this.onActionReady(aiAction);
    }
    
    this.checkTurn();
  }
  
  private sequenceCounter: number = 0;
  
  private generateSequence(): number {
    return ++this.sequenceCounter;
  }
  
  getPlayerId(): string {
    return this.aiPlayerId;
  }
  
  reset(): void {
    this.disable();
    this.sequenceCounter = 0;
  }
}
