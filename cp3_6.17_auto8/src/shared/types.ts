export interface Card {
  id: string;
  name: string;
  attack: number;
  cost: number;
  description: string;
}

export interface Player {
  id: string;
  nickname: string;
  hand: Card[];
  hp: number;
  maxHp: number;
}

export interface GameState {
  gameId: string;
  players: [Player, Player];
  discardPile: Card[];
  currentTurnIndex: 0 | 1;
  turnCount: number;
  status: 'waiting' | 'playing' | 'finished';
  winnerId: string | null;
}

export type PlayerActionType = 'play_card' | 'ai_play_card';

export interface PlayerAction {
  type: PlayerActionType;
  playerId: string;
  cardId: string;
  sequence: number;
  timestamp: number;
}

export interface ServerAck {
  type: 'ack' | 'rollback';
  sequence: number;
  actionType: PlayerActionType;
  message?: string;
  cardId?: string;
}

export interface GameStateUpdate {
  type: 'state_update';
  state: GameState;
  lastPlayedCard?: {
    card: Card;
    playerId: string;
  };
}

export interface StatsUpdate {
  type: 'stats';
  avgLatency: number;
  rollbackCount: number;
  effectivePlayRate: number;
  currentLatency: number;
  queueSize: number;
}

export type ServerMessage = ServerAck | GameStateUpdate | StatsUpdate;
