export interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: number;
}

export interface Player {
  id: string;
  name: string;
  seat: number;
  chips: number;
  hand: Card[];
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isActive: boolean;
}

export interface ChipHistoryEntry {
  handNumber: number;
  players: { [playerId: string]: number };
}

export interface Room {
  id: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  communityCards: Card[];
  pot: number;
  currentBet: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  chipHistory: ChipHistoryEntry[];
  handNumber: number;
}

export type GameAction = 'fold' | 'call' | 'raise' | 'allin';

export interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

export interface WebSocketContextType {
  ws: WebSocket | null;
  sendMessage: (message: any) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}
