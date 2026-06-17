export type Card = {
  id: string;
  value: number;
  suit: string;
};

export type Player = {
  id: string;
  hand: Card[];
  health: number;
};

export type GameState = {
  players: Record<string, Player>;
  discardPile: Card[];
  turnCount: number;
  currentPlayerId: string;
  gamePhase: 'waiting' | 'playing' | 'ended';
  winnerId?: string;
};

export type PlayerAction = {
  type: 'play' | 'discard';
  playerId: string;
  cardId: string;
  timestamp: number;
  sequence: number;
};

const createDeck = (): Card[] => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  let id = 0;
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push({ id: `card-${id++}`, value, suit });
    }
  }
  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

let state: GameState;

export const initGame = (playerIds: string[]): GameState => {
  const deck = shuffleDeck(createDeck());
  const players: Record<string, Player> = {};
  const cardsPerPlayer = 5;

  for (let i = 0; i < playerIds.length; i++) {
    const playerId = playerIds[i];
    players[playerId] = {
      id: playerId,
      hand: deck.splice(0, cardsPerPlayer),
      health: 3,
    };
  }

  state = {
    players,
    discardPile: [],
    turnCount: 1,
    currentPlayerId: playerIds[0],
    gamePhase: 'playing',
  };

  return state;
};

export const validateAction = (action: PlayerAction): boolean => {
  if (state.gamePhase !== 'playing') return false;
  if (action.playerId !== state.currentPlayerId) return false;

  const player = state.players[action.playerId];
  if (!player) return false;

  const cardExists = player.hand.some((card) => card.id === action.cardId);
  return cardExists;
};

export const applyAction = (action: PlayerAction): GameState => {
  const player = state.players[action.playerId];
  const cardIndex = player.hand.findIndex((card) => card.id === action.cardId);

  if (cardIndex === -1) return state;

  const [playedCard] = player.hand.splice(cardIndex, 1);
  state.discardPile.push(playedCard);

  const playerIds = Object.keys(state.players);
  const currentIndex = playerIds.indexOf(state.currentPlayerId);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  state.currentPlayerId = playerIds[nextIndex];

  if (nextIndex === 0) {
    state.turnCount++;
  }

  const opponentId = playerIds.find((id) => id !== action.playerId);
  if (opponentId && playedCard.value > 10) {
    state.players[opponentId].health--;
    if (state.players[opponentId].health <= 0) {
      state.gamePhase = 'ended';
      state.winnerId = action.playerId;
    }
  }

  if (player.hand.length === 0) {
    state.gamePhase = 'ended';
    state.winnerId = action.playerId;
  }

  return { ...state };
};

export const generateAIPlay = (aiPlayerId: string): PlayerAction | null => {
  const aiPlayer = state.players[aiPlayerId];
  if (!aiPlayer || aiPlayer.hand.length === 0) return null;
  if (state.currentPlayerId !== aiPlayerId) return null;

  const sortedHand = [...aiPlayer.hand].sort((a, b) => b.value - a.value);
  const selectedCard = sortedHand[0];

  return {
    type: 'play',
    playerId: aiPlayerId,
    cardId: selectedCard.id,
    timestamp: Date.now(),
    sequence: 0,
  };
};

export const getState = (): GameState => {
  return { ...state };
};
