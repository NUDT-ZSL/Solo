import { v4 as uuidv4 } from 'uuid';
import { Card, PlayerState, GameStateData, ClientAction } from '../shared/types';

const CARD_TEMPLATES: Omit<Card, 'id'>[] = [
  { name: '火球术', attack: 3, type: 'attack' },
  { name: '闪电链', attack: 2, type: 'attack' },
  { name: '重击', attack: 4, type: 'attack' },
  { name: '快斩', attack: 1, type: 'attack' },
  { name: '穿刺', attack: 2, type: 'attack' },
  { name: '铁壁', attack: 0, type: 'defense' },
  { name: '护盾', attack: 0, type: 'defense' },
  { name: '治疗术', attack: -2, type: 'heal' },
  { name: '回血', attack: -1, type: 'heal' },
  { name: '烈焰风暴', attack: 5, type: 'attack' },
];

function createCard(): Card {
  const template = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
  return { ...template, id: uuidv4() };
}

function createPlayer(id: string, nickname: string, isAI: boolean): PlayerState {
  const hand: Card[] = [];
  for (let i = 0; i < 7; i++) {
    hand.push(createCard());
  }
  return {
    id,
    nickname,
    hp: 20,
    maxHp: 20,
    hand,
    isAI,
  };
}

export class GameState {
  private state: GameStateData;

  constructor(localPlayerId: string, aiPlayerId: string) {
    const localPlayer = createPlayer(localPlayerId, '玩家', false);
    const aiPlayer = createPlayer(aiPlayerId, 'AI对手', true);

    this.state = {
      players: {
        [localPlayerId]: localPlayer,
        [aiPlayerId]: aiPlayer,
      },
      discardPile: [],
      currentTurn: localPlayerId,
      turnCount: 1,
      gameOver: false,
      winner: null,
    };
  }

  getState(): GameStateData {
    return JSON.parse(JSON.stringify(this.state));
  }

  validateAction(action: ClientAction): { valid: boolean; reason?: string } {
    if (this.state.gameOver) {
      return { valid: false, reason: '游戏已结束' };
    }
    if (action.playerId !== this.state.currentTurn) {
      return { valid: false, reason: '当前不是你的回合' };
    }
    const player = this.state.players[action.playerId];
    if (!player) {
      return { valid: false, reason: '玩家不存在' };
    }
    const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
    if (cardIndex === -1) {
      return { valid: false, reason: '手牌中没有这张牌' };
    }
    return { valid: true };
  }

  applyAction(action: ClientAction): GameStateData {
    const player = this.state.players[action.playerId];
    const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
    if (cardIndex === -1) return this.getState();

    const card = player.hand[cardIndex];
    player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(card);

    const opponentId = Object.keys(this.state.players).find(id => id !== action.playerId);
    if (opponentId) {
      const opponent = this.state.players[opponentId];
      if (card.type === 'attack' && card.attack > 0) {
        opponent.hp = Math.max(0, opponent.hp - card.attack);
      } else if (card.type === 'heal') {
        player.hp = Math.min(player.maxHp, player.hp + Math.abs(card.attack));
      }
    }

    if (this.state.players[opponentId!].hp <= 0) {
      this.state.gameOver = true;
      this.state.winner = action.playerId;
    } else if (player.hp <= 0) {
      this.state.gameOver = true;
      this.state.winner = opponentId!;
    }

    if (!this.state.gameOver) {
      this.state.currentTurn = opponentId!;
      if (this.state.currentTurn === Object.keys(this.state.players)[0]) {
        this.state.turnCount++;
      }
    }

    return this.getState();
  }

  generateAIAction(aiPlayerId: string): ClientAction | null {
    if (this.state.gameOver || this.state.currentTurn !== aiPlayerId) {
      return null;
    }
    const aiPlayer = this.state.players[aiPlayerId];
    if (aiPlayer.hand.length === 0) return null;

    const opponentId = Object.keys(this.state.players).find(id => id !== aiPlayerId)!;
    const opponent = this.state.players[opponentId];

    let bestCard: Card | null = null;
    let bestScore = -Infinity;

    for (const card of aiPlayer.hand) {
      let score = 0;
      if (card.type === 'attack') {
        score = card.attack * 2;
        if (opponent.hp <= card.attack) score += 10;
      } else if (card.type === 'heal') {
        const missingHp = aiPlayer.maxHp - aiPlayer.hp;
        score = Math.min(missingHp, Math.abs(card.attack)) * 1.5;
      } else if (card.type === 'defense') {
        score = opponent.hand.length * 0.3;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    if (!bestCard) return null;

    return {
      type: 'PLAY_CARD',
      playerId: aiPlayerId,
      cardId: bestCard.id,
      sequence: -1,
      timestamp: Date.now(),
    };
  }
}
