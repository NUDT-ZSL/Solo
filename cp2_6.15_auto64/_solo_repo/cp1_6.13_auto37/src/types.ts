export type TowerType = 'fire' | 'ice' | 'electric';
export type PlayerId = 1 | 2;
export type Owner = PlayerId | null;

export interface HexCoord {
  q: number;
  r: number;
}

export interface Tower {
  type: TowerType;
  level: 1 | 2 | 3;
  owner: PlayerId;
  cooldown: number;
  slowed: boolean;
  lastActionTurn: number;
}

export interface HexCell {
  coord: HexCoord;
  owner: Owner;
  tower: Tower | null;
  isHighlighted: boolean;
  isPlaceable: boolean;
  animation: CellAnimation | null;
}

export interface CellAnimation {
  type: 'place' | 'upgrade' | 'chain' | 'click' | 'invalid';
  startTime: number;
  duration: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  energy: number;
}

export interface GameState {
  map: HexCell[];
  players: Player[];
  currentPlayer: PlayerId;
  turn: number;
  phase: 'waiting' | 'playing' | 'ended';
  winner: PlayerId | 'draw' | null;
  roomId: string;
  chainReactions: ChainReactionEvent[];
}

export interface ChainReactionEvent {
  coord: HexCoord;
  startTime: number;
}

export type ActionType = 'place' | 'upgrade' | 'skip';

export interface PlaceAction {
  type: 'place';
  coord: HexCoord;
  towerType: TowerType;
  playerId: PlayerId;
}

export interface UpgradeAction {
  type: 'upgrade';
  coord: HexCoord;
  playerId: PlayerId;
}

export interface SkipAction {
  type: 'skip';
  playerId: PlayerId;
}

export type GameAction = PlaceAction | UpgradeAction | SkipAction;

export interface MatchRequest {
  type: 'match';
  playerName: string;
}

export interface ActionMessage {
  type: 'action';
  action: GameAction;
  roomId: string;
  playerId: PlayerId;
}

export interface StateUpdateMessage {
  type: 'state';
  state: GameState;
}

export interface MatchFoundMessage {
  type: 'matchFound';
  roomId: string;
  playerId: PlayerId;
  opponentName: string;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: number;
}

export type ClientMessage = MatchRequest | ActionMessage | HeartbeatMessage;
export type ServerMessage = StateUpdateMessage | MatchFoundMessage | HeartbeatMessage;

export interface RenderConfig {
  hexSize: number;
  canvasWidth: number;
  canvasHeight: number;
  offsetX: number;
  offsetY: number;
}
