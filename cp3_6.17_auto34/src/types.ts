export interface Card {
  id: string;
  value: number;
  suit: string;
}

export interface GameState {
  playerHand: Card[];
  aiHand: Card[];
  discardPile: Card[];
  playerHealth: number;
  aiHealth: number;
  currentTurn: 'player' | 'ai';
  turnCount: number;
}

export interface PlayerAction {
  type: 'play' | 'discard';
  cardId: string;
  playerId: string;
  sequence: number;
  timestamp: number;
}

export interface ServerMessage {
  type: 'confirm' | 'rollback' | 'state';
  sequence: number;
  state?: GameState;
  action?: PlayerAction;
  rollbackReason?: string;
}

export interface NetworkStats {
  avgLatency: number;
  rollbackCount: number;
  totalActions: number;
  successRate: number;
}
