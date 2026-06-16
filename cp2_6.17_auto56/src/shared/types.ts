export type CardType = 'attack' | 'defense' | 'skill';

export interface Card {
  id: string;
  name: string;
  attack: number;
  type: CardType;
}

export interface Player {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  hand: Card[];
}

export interface GameState {
  players: Record<string, Player>;
  currentPlayerId: string;
  discardPile: Card[];
  turnCount: number;
  lastPlayedCard?: Card;
  gameOver: boolean;
  winner?: string;
}

export interface QueuedOperation {
  sequence: number;
  timestamp: number;
  playerId: string;
  cardId: string;
  originalIndex: number;
  type: 'local' | 'remote';
}

export type ClientMessageType = 'PLAY_CARD' | 'AI_PLAY';
export type ServerMessageType = 'ACK' | 'STATE_UPDATE' | 'GAME_OVER';

export interface ClientMessage {
  type: ClientMessageType;
  sequence: number;
  timestamp: number;
  playerId: string;
  cardId: string;
}

export interface ServerAck {
  type: 'ACK';
  sequence: number;
  status: 'success' | 'rollback';
  reason?: string;
  gameState: GameState;
}

export interface ServerState {
  type: 'STATE_UPDATE';
  gameState: GameState;
}

export interface ServerGameOver {
  type: 'GAME_OVER';
  winner: string;
  stats: {
    avgLatency: number;
    rollbackCount: number;
    validPlayRate: number;
  };
  gameState: GameState;
}

export type ServerMessage = ServerAck | ServerState | ServerGameOver;

export interface NetworkStats {
  currentLatency: number;
  queueSize: number;
  avgLatency: number;
  rollbackCount: number;
  totalPlays: number;
  validPlays: number;
}
