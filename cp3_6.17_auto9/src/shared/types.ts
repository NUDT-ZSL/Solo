export interface Card {
  id: string;
  name: string;
  attack: number;
  type: 'attack' | 'defense' | 'heal';
}

export interface PlayerState {
  id: string;
  nickname: string;
  hp: number;
  maxHp: number;
  hand: Card[];
  isAI: boolean;
}

export interface GameStateData {
  players: Record<string, PlayerState>;
  discardPile: Card[];
  currentTurn: string;
  turnCount: number;
  gameOver: boolean;
  winner: string | null;
}

export interface ClientAction {
  type: 'PLAY_CARD';
  playerId: string;
  cardId: string;
  sequence: number;
  timestamp: number;
}

export interface ServerMessage {
  type: 'ACK' | 'ROLLBACK' | 'STATE_UPDATE' | 'GAME_OVER';
  sequence?: number;
  state?: GameStateData;
  reason?: string;
  stats?: GameStats;
}

export interface GameStats {
  avgLatency: number;
  rollbackCount: number;
  validPlays: number;
  totalPlays: number;
}

export interface QueuedMessage {
  action: ClientAction;
  receivedAt: number;
}
