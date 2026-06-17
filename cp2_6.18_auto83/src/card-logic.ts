import { v4 as uuidv4 } from 'uuid';
import {
  Card,
  GameType,
  GameState,
  GameConfig,
  Player,
  PlayRecord,
  Suit,
  CARD_SUITS,
  DOU_DIZHU_RANKS,
  UNO_COLORS,
  UNO_RANKS,
  PLAYER_COLORS,
  SUIT_SYMBOLS
} from './types';

export function createDeck(gameType: GameType): Card[] {
  const cards: Card[] = [];

  if (gameType === 'dou dizhu') {
    for (const suit of CARD_SUITS) {
      for (const rank of DOU_DIZHU_RANKS) {
        cards.push({
          id: uuidv4(),
          suit,
          rank,
          isFaceUp: false
        });
      }
    }
    cards.push({ id: uuidv4(), rank: 'S_JOKER', isFaceUp: false });
    cards.push({ id: uuidv4(), rank: 'B_JOKER', isFaceUp: false });
  } else if (gameType === 'uno') {
    for (const color of UNO_COLORS) {
      for (const rank of UNO_RANKS) {
        if (rank === 'Wild' || rank === 'WildDraw4') {
          if (color === UNO_COLORS[0]) {
            for (let i = 0; i < 4; i++) {
              cards.push({
                id: uuidv4(),
                rank,
                isFaceUp: false,
                color: '#9e9e9e'
              });
            }
          }
        } else if (rank === '0') {
          cards.push({
            id: uuidv4(),
            rank,
            isFaceUp: false,
            color
          });
        } else {
          cards.push({
            id: uuidv4(),
            rank,
            isFaceUp: false,
            color
          });
          cards.push({
            id: uuidv4(),
            rank,
            isFaceUp: false,
            color
          });
        }
      }
    }
  }

  return cards;
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(
  gameType: GameType,
  playerCount: number,
  playerNames: string[]
): { players: Player[]; remaining: Card[] } {
  const deck = shuffleDeck(createDeck(gameType));
  const players: Player[] = [];
  const positions: Player['position'][] = ['bottom', 'right', 'top', 'left'];

  let cardsPerPlayer = gameType === 'dou dizhu' ? 17 : 7;

  for (let i = 0; i < playerCount; i++) {
    const hand = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
    players.push({
      id: uuidv4(),
      name: playerNames[i] || `玩家${i + 1}`,
      hand,
      position: positions[i],
      color: PLAYER_COLORS[i],
      score: 0
    });
  }

  const remaining = deck.slice(playerCount * cardsPerPlayer);

  return { players, remaining };
}

export function createGame(config: GameConfig): GameState {
  const playerCount = config.playerNames.length;
  const { players, remaining } = dealCards(config.gameType, playerCount, config.playerNames);

  return {
    id: uuidv4(),
    gameType: config.gameType,
    players,
    currentPlayerIndex: 0,
    playHistory: [],
    tableCards: remaining,
    isGameOver: false,
    startTime: Date.now(),
    roundNumber: 1
  };
}

export function validatePlay(gameState: GameState, playerId: string, cards: Card[]): boolean {
  if (cards.length === 0) return false;

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;

  if (gameState.currentPlayerIndex !== gameState.players.findIndex(p => p.id === playerId)) {
    return false;
  }

  for (const card of cards) {
    const hasCard = player.hand.some(c => c.id === card.id);
    if (!hasCard) return false;
  }

  if (gameState.gameType === 'uno') {
    const lastPlay = gameState.playHistory[gameState.playHistory.length - 1];
    if (lastPlay && lastPlay.cards.length > 0) {
      const topCard = lastPlay.cards[lastPlay.cards.length - 1];
      for (const card of cards) {
        if (!canPlayUnoCard(card, topCard)) return false;
      }
    }
  }

  return true;
}

export function playCards(gameState: GameState, playerId: string, cards: Card[]): GameState {
  if (!validatePlay(gameState, playerId, cards)) {
    return gameState;
  }

  const newPlayers = gameState.players.map(player => {
    if (player.id === playerId) {
      const newHand = player.hand.filter(c => !cards.some(played => played.id === c.id));
      return { ...player, hand: newHand };
    }
    return player;
  });

  const cardType = identifyCardType(cards, gameState.gameType);

  const playRecord: PlayRecord = {
    id: uuidv4(),
    playerId,
    cards: cards.map(c => ({ ...c, isFaceUp: true })),
    cardType,
    timestamp: Date.now(),
    roundNumber: gameState.roundNumber
  };

  const currentPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
  const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;

  const playingPlayer = newPlayers.find(p => p.id === playerId);
  const isGameOver = playingPlayer ? playingPlayer.hand.length === 0 : false;

  const newState: GameState = {
    ...gameState,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    playHistory: [...gameState.playHistory, playRecord],
    tableCards: [...gameState.tableCards, ...cards.map(c => ({ ...c, isFaceUp: true }))],
    isGameOver,
    winnerId: isGameOver ? playerId : undefined,
    endTime: isGameOver ? Date.now() : undefined,
    roundNumber: nextPlayerIndex === 0 ? gameState.roundNumber + 1 : gameState.roundNumber
  };

  return newState;
}

export function identifyCardType(cards: Card[], gameType: GameType): string {
  if (gameType === 'dou dizhu') {
    if (cards.length === 1) return '单张';
    if (cards.length === 2 && cards[0].rank === cards[1].rank) return '对子';
    if (cards.length === 3) {
      const ranks = new Set(cards.map(c => c.rank));
      if (ranks.size === 1) return '三张';
    }
    if (cards.length === 4) {
      const ranks = new Set(cards.map(c => c.rank));
      if (ranks.size === 1) return '炸弹';
    }
    if (cards.length === 2 &&
      cards.some(c => c.rank === 'S_JOKER') &&
      cards.some(c => c.rank === 'B_JOKER')) {
      return '王炸';
    }
    return `${cards.length}张牌`;
  } else {
    if (cards.length === 1) {
      const card = cards[0];
      if (card.rank === 'Skip') return '跳过';
      if (card.rank === 'Reverse') return '反转';
      if (card.rank === 'Draw2') return '+2';
      if (card.rank === 'Wild') return '变色';
      if (card.rank === 'WildDraw4') return '+4';
      return '数字牌';
    }
    return `${cards.length}张牌`;
  }
}

export function getCardRankValue(rank: string, gameType: GameType): number {
  if (gameType === 'dou dizhu') {
    const order = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'S_JOKER', 'B_JOKER'];
    return order.indexOf(rank);
  }
  const unoOrder = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw2', 'Wild', 'WildDraw4'];
  return unoOrder.indexOf(rank);
}

export function isWildCard(card: Card): boolean {
  return card.rank === 'Wild' || card.rank === 'WildDraw4';
}

export function isActionCard(card: Card): boolean {
  return card.rank === 'Skip' || card.rank === 'Reverse' || card.rank === 'Draw2';
}

export function canPlayUnoCard(newCard: Card, topCard: Card): boolean {
  if (isWildCard(newCard)) return true;

  if (isWildCard(topCard)) return true;

  if (newCard.color && topCard.color && newCard.color === topCard.color) return true;

  if (newCard.rank === topCard.rank) return true;

  if (isActionCard(newCard) && isActionCard(topCard) && newCard.rank === topCard.rank) return true;

  return false;
}

export function compareCards(cardA: Card, cardB: Card, gameType: GameType): number {
  if (gameType === 'dou dizhu') {
    const valueA = getCardRankValue(cardA.rank, gameType);
    const valueB = getCardRankValue(cardB.rank, gameType);
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  }

  const wildA = isWildCard(cardA);
  const wildB = isWildCard(cardB);
  if (wildA && wildB) {
    const valueA = getCardRankValue(cardA.rank, gameType);
    const valueB = getCardRankValue(cardB.rank, gameType);
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  }
  if (wildA) return 1;
  if (wildB) return -1;

  const actionA = isActionCard(cardA);
  const actionB = isActionCard(cardB);
  if (actionA && !actionB) return 1;
  if (!actionA && actionB) return -1;

  const valueA = getCardRankValue(cardA.rank, gameType);
  const valueB = getCardRankValue(cardB.rank, gameType);
  if (valueA < valueB) return -1;
  if (valueA > valueB) return 1;

  if (cardA.color && cardB.color) {
    if (cardA.color < cardB.color) return -1;
    if (cardA.color > cardB.color) return 1;
  }

  return 0;
}

export function calculateScores(gameState: GameState): Record<string, number> {
  const scores: Record<string, number> = {};

  if (gameState.gameType === 'dou dizhu') {
    for (const player of gameState.players) {
      scores[player.id] = player.hand.length;
    }
  } else {
    for (const player of gameState.players) {
      let score = 0;
      for (const card of player.hand) {
        if (card.rank === 'Wild' || card.rank === 'WildDraw4') {
          score += 50;
        } else if (card.rank === 'Skip' || card.rank === 'Reverse' || card.rank === 'Draw2') {
          score += 20;
        } else {
          score += parseInt(card.rank) || 0;
        }
      }
      scores[player.id] = score;
    }
  }

  return scores;
}

export function getGameDuration(gameState: GameState): number {
  const endTime = gameState.endTime || Date.now();
  return endTime - gameState.startTime;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs}秒`;
}

export function getPlayCountByPlayer(gameState: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const player of gameState.players) {
    counts[player.id] = 0;
  }
  for (const record of gameState.playHistory) {
    counts[record.playerId] = (counts[record.playerId] || 0) + 1;
  }
  return counts;
}

export function getHandSizeHistory(gameState: GameState): Record<string, number[]> {
  const history: Record<string, number[]> = {};
  const initialHandSize = gameState.gameType === 'dou dizhu' ? 17 : 7;

  for (const player of gameState.players) {
    history[player.id] = [initialHandSize];
  }

  for (const record of gameState.playHistory) {
    const currentSizes: Record<string, number> = {};
    for (const playerId of Object.keys(history)) {
      currentSizes[playerId] = history[playerId][history[playerId].length - 1];
    }
    currentSizes[record.playerId] -= record.cards.length;

    for (const playerId of Object.keys(currentSizes)) {
      history[playerId].push(currentSizes[playerId]);
    }
  }

  return history;
}
