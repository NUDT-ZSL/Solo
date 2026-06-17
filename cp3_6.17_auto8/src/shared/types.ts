export interface Card {
  id: string;
  value: number;
  type: 'attack' | 'defense' | 'skill';
  name: string;
}

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  hp: number;
  maxHp: number;
}

export interface GameState {
  players: Record<string, PlayerState>;
  currentTurn: string;
  discardPile: Card[];
  turnCount: number;
  gameOver: boolean;
  winner: string | null;
}

export interface GameAction {
  type: 'play_card' | 'draw_card' | 'end_turn';
  playerId: string;
  sequence: number;
  timestamp: number;
  cardId?: string;
  card?: Card;
}

export interface ServerMessage {
  type: 'ack' | 'rollback' | 'state_update' | 'game_start' | 'game_over';
  sequence?: number;
  state?: GameState;
  action?: GameAction;
  reason?: string;
  winner?: string;
}

export interface GameStats {
  totalLatency: number;
  latencySamples: number;
  rollbackCount: number;
  totalPlays: number;
  successfulPlays: number;
}
