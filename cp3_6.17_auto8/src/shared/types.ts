export interface Card {
  id: string;
  value: number;
  suit: string;
  name: string;
}

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  health: number;
  maxHealth: number;
}

export interface GameStateData {
  players: Record<string, PlayerState>;
  discardPile: Card[];
  currentTurn: string;
  turnCount: number;
  gameOver: boolean;
  winner: string | null;
}

export interface GameAction {
  type: 'PLAY_CARD' | 'SYNC_STATE' | 'ACK' | 'ROLLBACK' | 'GAME_OVER' | 'HELLO';
  sequence: number;
  playerId: string;
  timestamp: number;
  payload?: {
    cardId?: string;
    card?: Card;
    state?: GameStateData;
    reason?: string;
  };
}

export interface PendingAction {
  action: GameAction;
  cardSnapshot?: Card;
  handSnapshot?: Card[];
  sentAt: number;
  resolved: boolean;
}

export interface GameStats {
  totalPlays: number;
  rollbackCount: number;
  totalLatency: number;
  latencySamples: number;
}
