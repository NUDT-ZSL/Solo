import { v4 as uuidv4 } from 'uuid';

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'none';
export type CardRank = string;
export type GameType = 'landlord' | 'uno';

export interface Card {
  id: string;
  suit: CardSuit;
  rank: CardRank;
  color?: string;
  value?: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  hand: Card[];
  score: number;
  playCount: number;
}

export interface PlayRecord {
  id: string;
  playerId: string;
  cards: Card[];
  playType: string;
  timestamp: number;
  handCounts: Record<string, number>;
}

export interface GameSession {
  id: string;
  gameType: GameType;
  players: Player[];
  records: PlayRecord[];
  startTime: number;
  endTime?: number;
  winnerId?: string;
  currentPlayerIndex: number;
  config: GameConfig;
}

export interface GameConfig {
  playerCount: number;
  playerNames: string[];
}

const PLAYER_COLORS = ['#ff5252', '#4caf50', '#2196f3', '#ff9800'];
const SUIT_SYMBOLS: Record<CardSuit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  none: ''
};

const LANDLORD_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const LANDLORD_SUITS: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const UNO_COLORS = ['#f44336', '#4caf50', '#2196f3', '#ffeb3b'];
const UNO_RANKS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];

export function createDeck(gameType: GameType): Card[] {
  const deck: Card[] = [];

  if (gameType === 'landlord') {
    for (const suit of LANDLORD_SUITS) {
      for (let i = 0; i < LANDLORD_RANKS.length; i++) {
        deck.push({
          id: uuidv4(),
          suit,
          rank: LANDLORD_RANKS[i],
          value: i
        });
      }
    }
    deck.push({ id: uuidv4(), suit: 'none', rank: '小王', value: 13 });
    deck.push({ id: uuidv4(), suit: 'none', rank: '大王', value: 14 });
  } else {
    for (const color of UNO_COLORS) {
      deck.push({ id: uuidv4(), suit: 'none', rank: '0', color, value: 0 });
      for (const rank of UNO_RANKS.slice(1)) {
        deck.push({ id: uuidv4(), suit: 'none', rank, color, value: UNO_RANKS.indexOf(rank) });
        deck.push({ id: uuidv4(), suit: 'none', rank, color, value: UNO_RANKS.indexOf(rank) });
      }
    }
    for (let i = 0; i < 4; i++) {
      deck.push({ id: uuidv4(), suit: 'none', rank: 'Wild', color: '#9c27b0', value: 20 });
      deck.push({ id: uuidv4(), suit: 'none', rank: '+4', color: '#9c27b0', value: 21 });
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createGameSession(gameType: GameType, config: GameConfig): GameSession {
  const deck = createDeck(gameType);
  const players: Player[] = [];
  const cardsPerPlayer = gameType === 'landlord' ? 17 : 7;

  for (let i = 0; i < config.playerCount; i++) {
    const hand = deck.splice(0, cardsPerPlayer);
    players.push({
      id: uuidv4(),
      name: config.playerNames[i] || `玩家${i + 1}`,
      color: PLAYER_COLORS[i],
      hand: hand.sort((a, b) => (a.value || 0) - (b.value || 0)),
      score: 0,
      playCount: 0
    });
  }

  return {
    id: uuidv4(),
    gameType,
    players,
    records: [],
    startTime: Date.now(),
    currentPlayerIndex: 0,
    config
  };
}

export function getSuitSymbol(suit: CardSuit): string {
  return SUIT_SYMBOLS[suit];
}

export function getSuitColor(suit: CardSuit): string {
  if (suit === 'hearts' || suit === 'diamonds') return '#e53935';
  if (suit === 'none') return '#333';
  return '#212121';
}

export function getCardDisplay(card: Card): string {
  if (card.color) return card.rank;
  return `${getSuitSymbol(card.suit)}${card.rank}`;
}

export function determinePlayType(cards: Card[], gameType: GameType): string {
  if (cards.length === 0) return '不出';
  if (cards.length === 1) return '单张';
  
  if (gameType === 'landlord') {
    const values = cards.map(c => c.value || 0).sort((a, b) => a - b);
    const isConsecutive = values.every((v, i) => i === 0 || v === values[i - 1] + 1);
    const allSameValue = values.every(v => v === values[0]);

    if (cards.length === 2 && allSameValue) return '对子';
    if (cards.length === 3 && allSameValue) return '三张';
    if (cards.length === 4 && allSameValue) return '炸弹';
    if (cards.length === 3 && values[0] === 13 && values[1] === 14) return '王炸';
    if (cards.length >= 5 && isConsecutive) return '顺子';
    if (cards.length === 4 && values[0] === values[1] && values[2] === values[3] && values[0] !== values[2]) return '三带一';
  } else {
    if (cards.length === 1) return '单张';
  }

  return `${cards.length}张`;
}

export function validatePlay(cards: Card[], lastPlay: Card[] | null, gameType: GameType): boolean {
  if (cards.length === 0) return true;
  if (!lastPlay || lastPlay.length === 0) return true;

  if (gameType === 'landlord') {
    if (cards.length !== lastPlay.length && cards.length !== 4) {
      return false;
    }
    const lastMax = Math.max(...lastPlay.map(c => c.value || 0));
    const currentMax = Math.max(...cards.map(c => c.value || 0));
    
    if (cards.length === 4 && lastPlay.length !== 4) return true;
    
    if (cards.length === 2 && cards.some(c => c.value === 13) && cards.some(c => c.value === 14)) {
      return true;
    }
    
    return currentMax > lastMax;
  }

  return true;
}

export function checkWinner(players: Player[]): Player | null {
  for (const player of players) {
    if (player.hand.length === 0) {
      return player;
    }
  }
  return null;
}

export function calculateScore(player: Player, position: number, gameType: GameType): number {
  const baseScore = gameType === 'landlord' ? 100 : 50;
  const handPenalty = player.hand.length * 5;
  return Math.max(0, baseScore - handPenalty + (position === 0 ? 50 : 0));
}

export function getGameDuration(startTime: number, endTime?: number): string {
  const duration = (endTime || Date.now()) - startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}分${seconds}秒`;
}

export function calculateWinRate(records: PlayRecord[], playerId: string): number {
  const playerRecords = records.filter(r => r.playerId === playerId && r.cards.length > 0);
  if (playerRecords.length === 0) return 0;
  return Math.round((playerRecords.length / records.length) * 100);
}

export function getHandCounts(players: Player[]): Record<string, number> {
  const counts: Record<string, number> = {};
  players.forEach(p => {
    counts[p.id] = p.hand.length;
  });
  return counts;
}
