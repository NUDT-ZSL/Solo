import { Card, GameState } from '../shared/types';
import { NetworkManager } from './network';
import { CardGame } from './cardGame';

export class AIPlayer {
  private network: NetworkManager;
  private cardGame: CardGame;
  private playerId: string;
  private aiPlayerId: string | null = null;
  
  private isAITurn: boolean = false;
  private aiDelayMin: number = 100;
  private aiDelayMax: number = 300;
  
  constructor(network: NetworkManager, cardGame: CardGame) {
    this.network = network;
    this.cardGame = cardGame;
    this.playerId = network.getPlayerId();
    
    this.setupCallbacks();
  }
  
  private setupCallbacks(): void {
    this.network.setOnStateUpdate((state: GameState) => {
      this.handleStateUpdate(state);
    });
    
    this.network.setOnGameStart((state: GameState) => {
      this.handleStateUpdate(state);
    });
  }
  
  private handleStateUpdate(state: GameState): void {
    const aiPlayer = Object.values(state.players).find(p => p.id !== this.playerId);
    if (aiPlayer) {
      this.aiPlayerId = aiPlayer.id;
    }
    
    const wasAITurn = this.isAITurn;
    this.isAITurn = state.currentTurn !== this.playerId && !state.gameOver;
    
    if (this.isAITurn && !wasAITurn) {
      this.scheduleAIPlay(state);
    }
  }
  
  private scheduleAIPlay(state: GameState): void {
    const aiPlayer = Object.values(state.players).find(p => p.id !== this.playerId);
    if (!aiPlayer || aiPlayer.hand.length === 0) return;
    
    const delay = this.getRandomDelay();
    
    setTimeout(() => {
      if (this.isAITurn && this.aiPlayerId) {
        const bestCard = this.calculateBestPlay(state);
        if (bestCard) {
          this.cardGame.animateAIPlayCard(bestCard);
        }
      }
    }, delay);
  }
  
  private calculateBestPlay(state: GameState): Card | null {
    const aiPlayer = Object.values(state.players).find(p => p.id !== this.playerId);
    const localPlayer = state.players[this.playerId];
    
    if (!aiPlayer || !localPlayer || aiPlayer.hand.length === 0) {
      return null;
    }
    
    const hand = aiPlayer.hand;
    
    let bestCard: Card | null = null;
    let bestScore = -Infinity;
    
    for (const card of hand) {
      const score = this.evaluateCard(card, state, aiPlayer, localPlayer);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }
    
    return bestCard;
  }
  
  private evaluateCard(card: Card, state: GameState, aiPlayer: any, opponent: any): number {
    let score = 0;
    
    switch (card.type) {
      case 'attack':
        score += card.value * 2;
        
        if (opponent.hp <= card.value * 2) {
          score += 50;
        }
        
        if (opponent.hp <= 10) {
          score += 20;
        }
        break;
        
      case 'defense':
        score += card.value;
        
        if (aiPlayer.hp <= 10) {
          score += 30;
        }
        
        if (opponent.hand.length > aiPlayer.hand.length) {
          score += 10;
        }
        break;
        
      case 'skill':
        score += card.value * 1.5;
        
        score += state.discardPile.length * 0.5;
        break;
        
      default:
        score += card.value;
    }
    
    score += Math.random() * 5;
    
    return score;
  }
  
  private getRandomDelay(): number {
    return Math.floor(Math.random() * (this.aiDelayMax - this.aiDelayMin + 1)) + this.aiDelayMin;
  }
  
  setDelayRange(min: number, max: number): void {
    this.aiDelayMin = min;
    this.aiDelayMax = max;
  }
}
