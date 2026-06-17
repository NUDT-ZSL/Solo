import { v4 as uuidv4 } from 'uuid';
import { Card, GameState, PlayerState, GameAction } from '../shared/types';

const CARD_TYPES: Array<'attack' | 'defense' | 'skill'> = ['attack', 'attack', 'defense', 'skill'];
const INITIAL_HAND_SIZE = 7;
const MAX_HP = 30;

export class GameStateManager {
  private gameState: GameState | null = null;
  
  createNewGame(player1Id: string, player1Name: string, player2Id: string, player2Name: string): GameState {
    const player1: PlayerState = {
      id: player1Id,
      name: player1Name,
      hand: this.generateHand(INITIAL_HAND_SIZE),
      hp: MAX_HP,
      maxHp: MAX_HP,
    };
    
    const player2: PlayerState = {
      id: player2Id,
      name: player2Name,
      hand: this.generateHand(INITIAL_HAND_SIZE),
      hp: MAX_HP,
      maxHp: MAX_HP,
    };
    
    this.gameState = {
      players: {
        [player1Id]: player1,
        [player2Id]: player2,
      },
      currentTurn: player1Id,
      discardPile: [],
      turnCount: 1,
      gameOver: false,
      winner: null,
    };
    
    return { ...this.gameState };
  }
  
  private generateHand(count: number): Card[] {
    const hand: Card[] = [];
    for (let i = 0; i < count; i++) {
      hand.push(this.generateCard());
    }
    return hand;
  }
  
  private generateCard(): Card {
    const type = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
    const value = Math.floor(Math.random() * 5) + 1;
    
    return {
      id: uuidv4(),
      value,
      type,
      name: this.getCardName(type, value),
    };
  }
  
  private getCardName(type: string, value: number): string {
    const names: Record<string, string[]> = {
      attack: ['打击', '重击', '猛击', '致命一击', '毁灭打击'],
      defense: ['格挡', '闪避', '护盾', '铁壁', '无敌'],
      skill: ['治疗', '抽牌', '强化', '削弱', '诅咒'],
    };
    const typeNames = names[type] || ['未知'];
    return typeNames[Math.min(value - 1, typeNames.length - 1)];
  }
  
  getState(): GameState | null {
    if (!this.gameState) return null;
    return JSON.parse(JSON.stringify(this.gameState));
  }
  
  validateAction(action: GameAction): { valid: boolean; reason?: string } {
    if (!this.gameState) {
      return { valid: false, reason: '游戏未开始' };
    }
    
    if (this.gameState.gameOver) {
      return { valid: false, reason: '游戏已结束' };
    }
    
    const player = this.gameState.players[action.playerId];
    if (!player) {
      return { valid: false, reason: '玩家不存在' };
    }
    
    if (action.type === 'play_card') {
      if (this.gameState.currentTurn !== action.playerId) {
        return { valid: false, reason: '不是你的回合' };
      }
      
      if (!action.cardId) {
        return { valid: false, reason: '缺少卡牌ID' };
      }
      
      const hasCard = player.hand.some(c => c.id === action.cardId);
      if (!hasCard) {
        return { valid: false, reason: '手牌中没有这张牌' };
      }
    }
    
    return { valid: true };
  }
  
  processAction(action: GameAction): GameState | null {
    if (!this.gameState) return null;
    
    const validation = this.validateAction(action);
    if (!validation.valid) {
      return null;
    }
    
    switch (action.type) {
      case 'play_card':
        this.processPlayCard(action);
        break;
      case 'end_turn':
        this.processEndTurn(action.playerId);
        break;
    }
    
    return JSON.parse(JSON.stringify(this.gameState));
  }
  
  private processPlayCard(action: GameAction): void {
    if (!this.gameState || !action.cardId) return;
    
    const player = this.gameState.players[action.playerId];
    const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
    
    if (cardIndex === -1) return;
    
    const card = player.hand.splice(cardIndex, 1)[0];
    this.gameState.discardPile.push(card);
    
    const opponent = this.getOpponent(action.playerId);
    if (opponent) {
      switch (card.type) {
        case 'attack':
          opponent.hp = Math.max(0, opponent.hp - card.value);
          break;
        case 'defense':
          player.hp = Math.min(player.maxHp, player.hp + card.value);
          break;
        case 'skill':
          opponent.hp = Math.max(0, opponent.hp - Math.floor(card.value / 2));
          player.hp = Math.min(player.maxHp, player.hp + Math.floor(card.value / 2));
          break;
      }
    }
    
    if (opponent && opponent.hp <= 0) {
      this.gameState.gameOver = true;
      this.gameState.winner = action.playerId;
    } else {
      this.switchTurn();
    }
  }
  
  private processEndTurn(playerId: string): void {
    if (!this.gameState) return;
    if (this.gameState.currentTurn !== playerId) return;
    
    this.switchTurn();
  }
  
  private switchTurn(): void {
    if (!this.gameState) return;
    
    const playerIds = Object.keys(this.gameState.players);
    const currentIndex = playerIds.indexOf(this.gameState.currentTurn);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.gameState.currentTurn = playerIds[nextIndex];
    
    if (nextIndex === 0) {
      this.gameState.turnCount++;
    }
    
    const nextPlayer = this.gameState.players[this.gameState.currentTurn];
    if (nextPlayer.hand.length < 5) {
      nextPlayer.hand.push(this.generateCard());
    }
  }
  
  private getOpponent(playerId: string): PlayerState | null {
    if (!this.gameState) return null;
    
    const opponentId = Object.keys(this.gameState.players).find(id => id !== playerId);
    if (!opponentId) return null;
    
    return this.gameState.players[opponentId];
  }
  
  generateAIAction(aiPlayerId: string): GameAction | null {
    if (!this.gameState) return null;
    if (this.gameState.currentTurn !== aiPlayerId) return null;
    if (this.gameState.gameOver) return null;
    
    const aiPlayer = this.gameState.players[aiPlayerId];
    if (!aiPlayer || aiPlayer.hand.length === 0) return null;
    
    const bestCard = this.chooseBestCard(aiPlayerId);
    if (!bestCard) return null;
    
    return {
      type: 'play_card',
      playerId: aiPlayerId,
      sequence: 0,
      timestamp: Date.now(),
      cardId: bestCard.id,
      card: bestCard,
    };
  }
  
  private chooseBestCard(aiPlayerId: string): Card | null {
    if (!this.gameState) return null;
    
    const aiPlayer = this.gameState.players[aiPlayerId];
    const opponent = this.getOpponent(aiPlayerId);
    
    if (!aiPlayer || !opponent || aiPlayer.hand.length === 0) {
      return null;
    }
    
    let bestCard: Card | null = null;
    let bestScore = -Infinity;
    
    for (const card of aiPlayer.hand) {
      const score = this.evaluateCard(card, aiPlayer, opponent);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }
    
    return bestCard;
  }
  
  private evaluateCard(card: Card, aiPlayer: PlayerState, opponent: PlayerState): number {
    let score = 0;
    
    switch (card.type) {
      case 'attack':
        score += card.value * 2;
        
        if (opponent.hp <= card.value) {
          score += 100;
        } else if (opponent.hp <= 10) {
          score += 30;
        }
        break;
        
      case 'defense':
        score += card.value;
        
        if (aiPlayer.hp <= 10) {
          score += 40;
        } else if (aiPlayer.hp <= 20) {
          score += 15;
        }
        break;
        
      case 'skill':
        score += card.value * 1.5;
        break;
    }
    
    score += Math.random() * 3;
    
    return score;
  }
  
  reset(): void {
    this.gameState = null;
  }
}
