export type GameType = 'dou dizhu' | 'uno';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type CardRank = string;

export interface Card {
  id: string;
  suit?: Suit;
  rank: CardRank;
  isFaceUp: boolean;
  color?: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  position: 'bottom' | 'left' | 'right' | 'top';
  color: string;
  score: number;
}

export interface PlayRecord {
  id: string;
  playerId: string;
  cards: Card[];
  cardType?: string;
  timestamp: number;
  roundNumber: number;
}

export interface GameState {
  id: string;
  gameType: GameType;
  players: Player[];
  currentPlayerIndex: number;
  playHistory: PlayRecord[];
  tableCards: Card[];
  isGameOver: boolean;
  winnerId?: string;
  startTime: number;
  endTime?: number;
  roundNumber: number;
}

export interface GameConfig {
  gameType: GameType;
  playerNames: string[];
}

export interface ReplayState {
  gameId: string;
  currentStep: number;
  totalSteps: number;
  speed: number;
  isPlaying: boolean;
}

export const PLAYER_COLORS = ['#ff5252', '#448aff', '#69f0ae', '#ffab40'];

export const CARD_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#d32f2f',
  diamonds: '#d32f2f',
  clubs: '#212121',
  spades: '#212121'
};

export const DOU_DIZHU_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

export const UNO_COLORS = ['#ff5252', '#448aff', '#69f0ae', '#ffab40'];
export const UNO_RANKS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw2', 'Wild', 'WildDraw4'];
