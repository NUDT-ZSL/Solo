import { v4 as uuidv4 } from 'uuid';
import type { Card, GameStateData, PlayerState } from '../shared/types';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = [
  { name: 'A', value: 14 },
  { name: '2', value: 2 },
  { name: '3', value: 3 },
  { name: '4', value: 4 },
  { name: '5', value: 5 },
  { name: '6', value: 6 },
  { name: '7', value: 7 },
  { name: '8', value: 8 },
  { name: '9', value: 9 },
  { name: '10', value: 10 },
  { name: 'J', value: 11 },
  { name: 'Q', value: 12 },
  { name: 'K', value: 13 },
];

export class GameStateManager {
  private state: GameStateData;
  private lastPlayedCard: Card | null = null;
  private lastPlayerId: string | null = null;

  constructor() {
    this.state = this.initializeState();
  }

  private initializeState(): GameStateData {
    const deck = this.createDeck();
    this.shuffleDeck(deck);

    const playerHand = deck.splice(0, 7);
    const aiHand = deck.splice(0, 7);

    return {
      players: {
        'local-player': {
          id: 'local-player',
          name: '本地玩家',
          hand: playerHand,
          health: 30,
          maxHealth: 30,
        },
        'ai-player': {
          id: 'ai-player',
          name: 'AI对手',
          hand: aiHand,
          health: 30,
          maxHealth: 30,
        },
      },
      discardPile: [],
      currentTurn: 'local-player',
      turnCount: 1,
      gameOver: false,
      winner: null,
    };
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const val of VALUES) {
        deck.push({
          id: uuidv4(),
          value: val.value,
          suit,
          name: val.name,
        });
      }
    }
    return deck;
  }

  private shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  public validatePlay(playerId: string, cardId: string): { valid: boolean; reason?: string } {
    if (this.state.gameOver) {
      return { valid: false, reason: '游戏已结束' };
    }

    if (this.state.currentTurn !== playerId) {
      return { valid: false, reason: '当前不是你的回合' };
    }

    const player = this.state.players[playerId];
    if (!player) {
      return { valid: false, reason: '玩家不存在' };
    }

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) {
      return { valid: false, reason: '卡牌不在手牌中' };
    }

    return { valid: true };
  }

  public applyPlay(playerId: string, cardId: string): GameStateData {
    const player = this.state.players[playerId];
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    const card = player.hand[cardIndex];

    player.hand.splice(cardIndex, 1);
    this.state.discardPile.push(card);

    const opponentId = Object.keys(this.state.players).find((id) => id !== playerId)!;
    const opponent = this.state.players[opponentId];

    if (this.lastPlayedCard && this.lastPlayerId !== playerId) {
      const diff = card.value - this.lastPlayedCard.value;
      if (diff > 0) {
        opponent.health = Math.max(0, opponent.health - diff * 2);
      } else if (diff < 0) {
        player.health = Math.max(0, player.health - Math.abs(diff));
      }
    } else if (!this.lastPlayedCard) {
      opponent.health = Math.max(0, opponent.health - Math.floor(card.value / 2));
    }

    this.lastPlayedCard = card;
    this.lastPlayerId = playerId;

    this.state.currentTurn = opponentId;
    if (this.state.currentTurn === 'local-player') {
      this.state.turnCount++;
    }

    if (player.hand.length === 0) {
      this.state.gameOver = true;
      this.state.winner = playerId;
    } else if (opponent.health <= 0) {
      this.state.gameOver = true;
      this.state.winner = playerId;
    } else if (player.health <= 0) {
      this.state.gameOver = true;
      this.state.winner = opponentId;
    }

    return this.getPublicState();
  }

  public getPublicState(): GameStateData {
    return JSON.parse(JSON.stringify(this.state));
  }

  public getState(): GameStateData {
    return this.state;
  }

  public reset(): void {
    this.state = this.initializeState();
    this.lastPlayedCard = null;
    this.lastPlayerId = null;
  }
}
