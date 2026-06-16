import { v4 as uuidv4 } from 'uuid';
import { Card, Player, GameState } from '../shared/types';

const CARD_NAMES = ['烈焰斩', '冰霜箭', '雷电术', '暗影刺', '圣光术', '破甲击', '旋风斩', '毒雾', '治疗术', '护盾'];
const CARD_TYPES: Card['type'][] = ['attack', 'attack', 'attack', 'attack', 'skill', 'attack', 'attack', 'skill', 'defense', 'defense'];

function createCard(index: number): Card {
  return {
    id: uuidv4(),
    name: CARD_NAMES[index % CARD_NAMES.length],
    attack: Math.floor(Math.random() * 5) + 3,
    type: CARD_TYPES[index % CARD_TYPES.length]
  };
}

function createPlayer(id: string, name: string, cardCount: number): Player {
  const hand: Card[] = [];
  for (let i = 0; i < cardCount; i++) {
    hand.push(createCard(i));
  }
  return {
    id,
    name,
    hp: 30,
    maxHp: 30,
    hand
  };
}

export class GameStateManager {
  private state: GameState;
  private readonly PLAYER_ID = 'player';
  private readonly AI_ID = 'ai';

  constructor() {
    this.state = this.initializeGame();
  }

  private initializeGame(): GameState {
    return {
      players: {
        [this.PLAYER_ID]: createPlayer(this.PLAYER_ID, '玩家', 7),
        [this.AI_ID]: createPlayer(this.AI_ID, 'AI对手', 7)
      },
      currentPlayerId: this.PLAYER_ID,
      discardPile: [],
      turnCount: 1,
      gameOver: false
    };
  }

  getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  validatePlay(playerId: string, cardId: string): { valid: boolean; reason?: string } {
    if (this.state.gameOver) {
      return { valid: false, reason: '游戏已结束' };
    }
    if (this.state.currentPlayerId !== playerId) {
      return { valid: false, reason: '不是当前玩家回合' };
    }
    const player = this.state.players[playerId];
    if (!player) {
      return { valid: false, reason: '玩家不存在' };
    }
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { valid: false, reason: '卡牌不存在' };
    }
    return { valid: true };
  }

  playCard(playerId: string, cardId: string): GameState {
    const player = this.state.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    const card = player.hand[cardIndex];
    
    player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(card);
    this.state.lastPlayedCard = card;

    if (card.type === 'attack') {
      const opponentId = playerId === this.PLAYER_ID ? this.AI_ID : this.PLAYER_ID;
      const opponent = this.state.players[opponentId];
      opponent.hp = Math.max(0, opponent.hp - card.attack);
      
      if (opponent.hp <= 0) {
        this.state.gameOver = true;
        this.state.winner = playerId;
      }
    }

    if (!this.state.gameOver) {
      this.state.currentPlayerId = this.state.currentPlayerId === this.PLAYER_ID ? this.AI_ID : this.PLAYER_ID;
      if (this.state.currentPlayerId === this.PLAYER_ID) {
        this.state.turnCount++;
      }
    }

    return this.getState();
  }

  getAIBestCard(): Card | null {
    const ai = this.state.players[this.AI_ID];
    if (!ai || ai.hand.length === 0) return null;

    const player = this.state.players[this.PLAYER_ID];
    let bestCard = ai.hand[0];
    let bestScore = -Infinity;

    for (const card of ai.hand) {
      let score = 0;
      if (card.type === 'attack') {
        score = card.attack * 2;
        if (card.attack >= player.hp) {
          score += 100;
        }
      } else if (card.type === 'defense') {
        score = ai.hp < ai.maxHp * 0.3 ? 8 : 3;
      } else {
        score = 5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestCard;
  }

  getPlayerId(): string {
    return this.PLAYER_ID;
  }

  getAIId(): string {
    return this.AI_ID;
  }

  reset(): GameState {
    this.state = this.initializeGame();
    return this.getState();
  }
}
