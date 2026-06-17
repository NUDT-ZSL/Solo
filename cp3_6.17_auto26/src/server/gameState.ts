import { v4 as uuidv4 } from 'uuid';

export interface Card {
  id: string;
  name: string;
  attack: number;
  cost: number;
}

export interface PlayerState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  hand: Card[];
}

export interface GameStateData {
  players: Record<string, PlayerState>;
  currentTurn: string;
  turnCount: number;
  discardPile: Card[];
  gameOver: boolean;
  winner: string | null;
}

export interface GameAction {
  type: 'PLAY_CARD';
  playerId: string;
  cardId: string;
  sequence: number;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const CARD_TEMPLATES = [
  { name: '火球术', attack: 4, cost: 2 },
  { name: '闪电链', attack: 3, cost: 1 },
  { name: '重击', attack: 5, cost: 3 },
  { name: '毒刃', attack: 2, cost: 1 },
  { name: '龙息', attack: 7, cost: 4 },
  { name: '冰箭', attack: 3, cost: 2 },
  { name: '暗影打击', attack: 6, cost: 3 },
  { name: '圣光', attack: 2, cost: 1 },
];

function createCard(): Card {
  const template = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
  return {
    id: uuidv4(),
    name: template.name,
    attack: template.attack,
    cost: template.cost,
  };
}

function createDeck(count: number): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < count; i++) {
    deck.push(createCard());
  }
  return deck;
}

export class GameStateManager {
  private state: GameStateData;
  private readonly INITIAL_HAND_SIZE = 7;
  private readonly INITIAL_HP = 30;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameStateData {
    return {
      players: {
        player_local: {
          id: 'player_local',
          name: '玩家1',
          hp: this.INITIAL_HP,
          maxHp: this.INITIAL_HP,
          hand: createDeck(this.INITIAL_HAND_SIZE),
        },
        player_ai: {
          id: 'player_ai',
          name: 'AI玩家',
          hp: this.INITIAL_HP,
          maxHp: this.INITIAL_HP,
          hand: createDeck(this.INITIAL_HAND_SIZE),
        },
      },
      currentTurn: 'player_local',
      turnCount: 1,
      discardPile: [],
      gameOver: false,
      winner: null,
    };
  }

  getState(): GameStateData {
    return JSON.parse(JSON.stringify(this.state));
  }

  validateAction(action: GameAction): ValidationResult {
    if (this.state.gameOver) {
      return { valid: false, reason: '游戏已结束' };
    }

    if (action.playerId !== this.state.currentTurn) {
      return { valid: false, reason: `当前不是${action.playerId}的回合` };
    }

    const player = this.state.players[action.playerId];
    if (!player) {
      return { valid: false, reason: '玩家不存在' };
    }

    if (action.type === 'PLAY_CARD') {
      const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
      if (cardIndex === -1) {
        return { valid: false, reason: '卡牌不存在于手牌中' };
      }
      return { valid: true };
    }

    return { valid: false, reason: '未知操作类型' };
  }

  applyAction(action: GameAction): { state: GameStateData; playedCard: Card } | null {
    if (action.type !== 'PLAY_CARD') return null;

    const player = this.state.players[action.playerId];
    const opponentId = Object.keys(this.state.players).find(id => id !== action.playerId);
    if (!player || !opponentId) return null;

    const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
    if (cardIndex === -1) return null;

    const [playedCard] = player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(playedCard);

    const opponent = this.state.players[opponentId];
    opponent.hp = Math.max(0, opponent.hp - playedCard.attack);

    if (opponent.hp <= 0) {
      this.state.gameOver = true;
      this.state.winner = action.playerId;
    } else {
      this.state.currentTurn = opponentId;
      this.state.turnCount++;
    }

    return {
      state: this.getState(),
      playedCard,
    };
  }

  reset(): void {
    this.state = this.createInitialState();
  }
}
