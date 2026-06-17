import { v4 as uuidv4 } from 'uuid';

export interface Card {
  id: string;
  value: number;
  suit: string;
  attack: number;
}

export interface PlayerState {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  hand: Card[];
}

export interface GameStateData {
  gameId: string;
  players: {
    player: PlayerState;
    ai: PlayerState;
  };
  discardPile: Card[];
  currentTurn: 'player' | 'ai';
  turnCount: number;
  isGameOver: boolean;
  winner: string | null;
  lastPlayedCard: Card | null;
}

export const SUITS = ['♠', '♥', '♦', '♣'];
const INITIAL_HEALTH = 30;
const INITIAL_HAND_SIZE = 7;

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let value = 1; value <= 10; value++) {
    for (const suit of SUITS) {
      deck.push({
        id: uuidv4(),
        value,
        suit,
        attack: value,
      });
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createInitialGameState(): GameStateData {
  const deck = createDeck();
  
  const playerHand = deck.slice(0, INITIAL_HAND_SIZE);
  const aiHand = deck.slice(INITIAL_HAND_SIZE, INITIAL_HAND_SIZE * 2);
  const remainingDeck = deck.slice(INITIAL_HAND_SIZE * 2);
  
  return {
    gameId: uuidv4(),
    players: {
      player: {
        id: 'player',
        name: '玩家',
        health: INITIAL_HEALTH,
        maxHealth: INITIAL_HEALTH,
        hand: playerHand,
      },
      ai: {
        id: 'ai',
        name: '电脑',
        health: INITIAL_HEALTH,
        maxHealth: INITIAL_HEALTH,
        hand: aiHand,
      },
    },
    discardPile: [],
    currentTurn: 'player',
    turnCount: 1,
    isGameOver: false,
    winner: null,
    lastPlayedCard: null,
  };
}

export function validatePlay(
  state: GameStateData,
  playerId: string,
  cardId: string
): { valid: boolean; reason?: string } {
  if (state.isGameOver) {
    return { valid: false, reason: '游戏已结束' };
  }

  if (state.currentTurn !== playerId) {
    return { valid: false, reason: `当前回合不属于${playerId}` };
  }

  const player = state.players[playerId as keyof typeof state.players];
  if (!player) {
    return { valid: false, reason: '玩家不存在' };
  }

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { valid: false, reason: '手牌中没有这张牌' };
  }

  return { valid: true };
}

export function playCard(
  state: GameStateData,
  playerId: string,
  cardId: string
): { state: GameStateData; playedCard: Card | null; damage: number; valid: boolean; reason?: string } {
  const validation = validatePlay(state, playerId, cardId);
  if (!validation.valid) {
    return { state, playedCard: null, damage: 0, valid: false, reason: validation.reason };
  }

  const newState = JSON.parse(JSON.stringify(state)) as GameStateData;
  const player = newState.players[playerId as keyof typeof newState.players];
  const opponentId = playerId === 'player' ? 'ai' : 'player';
  const opponent = newState.players[opponentId as keyof typeof newState.players];

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  const playedCard = player.hand.splice(cardIndex, 1)[0];

  const damage = playedCard.attack;
  opponent.health = Math.max(0, opponent.health - damage);

  newState.discardPile.push(playedCard);
  newState.lastPlayedCard = playedCard;

  if (opponent.health <= 0) {
    newState.isGameOver = true;
    newState.winner = playerId;
  } else {
    newState.currentTurn = opponentId;
    newState.turnCount++;
  }

  return { state: newState, playedCard, damage, valid: true };
}

export function aiChooseCard(state: GameStateData): Card | null {
  const aiHand = state.players.ai.hand;
  if (aiHand.length === 0) return null;

  let bestCard = aiHand[0];
  let bestScore = -Infinity;

  for (const card of aiHand) {
    let score = card.attack;

    if (state.players.player.health <= card.attack) {
      score += 100;
    }

    if (state.players.ai.health < state.players.ai.maxHealth * 0.3) {
      score += card.attack * 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  return bestCard;
}

export function getPublicState(state: GameStateData, playerId: string): any {
  return {
    gameId: state.gameId,
    currentTurn: state.currentTurn,
    turnCount: state.turnCount,
    isGameOver: state.isGameOver,
    winner: state.winner,
    lastPlayedCard: state.lastPlayedCard,
    discardPileSize: state.discardPile.length,
    yourHealth: state.players[playerId as keyof typeof state.players].health,
    yourMaxHealth: state.players[playerId as keyof typeof state.players].maxHealth,
    yourHand: state.players[playerId as keyof typeof state.players].hand,
    opponentHealth: state.players[playerId === 'player' ? 'ai' : 'player'].health,
    opponentMaxHealth: state.players[playerId === 'player' ? 'ai' : 'player'].maxHealth,
    opponentHandSize: state.players[playerId === 'player' ? 'ai' : 'player'].hand.length,
  };
}
