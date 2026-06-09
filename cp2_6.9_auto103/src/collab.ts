import type { Stroke } from './evaluator';

export interface Player {
  id: string;
  nickname: string;
  score: number;
  strokeCount: number;
}

export interface RoomState {
  roomCode: string;
  players: Player[];
  currentPlayerIndex: number;
  strokes: Stroke[];
  maxPlayers: number;
  gameStarted: boolean;
}

type ServerMessage =
  | { type: 'ROOM_CREATED'; roomCode: string; playerId: string; state: RoomState }
  | { type: 'ROOM_JOINED'; roomCode: string; playerId: string; state: RoomState }
  | { type: 'PLAYER_JOINED'; state: RoomState }
  | { type: 'PLAYER_LEFT'; state: RoomState }
  | { type: 'GAME_STARTED'; state: RoomState }
  | { type: 'STROKE_BROADCAST'; stroke: Stroke; score: number; playerId: string; nextPlayerId: string; state: RoomState }
  | { type: 'TURN_SKIPPED'; playerId: string; nextPlayerId: string; state: RoomState }
  | { type: 'NARRATIVE'; text: string; playerId: string }
  | { type: 'ERROR'; message: string };

type ClientMessage =
  | { type: 'CREATE_ROOM'; nickname: string }
  | { type: 'JOIN_ROOM'; roomCode: string; nickname: string }
  | { type: 'START_GAME' }
  | { type: 'STROKE_SUBMITTED'; strokeType: Stroke['type']; color: string; width: number; points: Stroke['points']; score: number }
  | { type: 'SKIP_TURN' }
  | { type: 'NARRATIVE_MESSAGE'; text: string }
  | { type: 'LEAVE_ROOM' };

export interface CollabCallbacks {
  onRoomJoined: (info: { roomCode: string; playerId: string; state: RoomState }) => void;
  onStateUpdate: (state: RoomState) => void;
  onStrokeReceived: (data: { stroke: Stroke; score: number; playerId: string; nextPlayerId: string }) => void;
  onTurnSkipped: (data: { playerId: string; nextPlayerId: string }) => void;
  onNarrative: (data: { text: string; playerId: string }) => void;
  onError: (message: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

export class CollaborationManager {
  private ws: WebSocket | null = null;
  private callbacks: CollabCallbacks;
  private url: string;

  constructor(callbacks: CollabCallbacks) {
    this.callbacks = callbacks;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${proto}//${location.host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }

      this.ws.onopen = () => {
        this.callbacks.onConnected();
        resolve();
      };

      this.ws.onerror = (err) => {
        reject(err);
      };

      this.ws.onclose = () => {
        this.callbacks.onDisconnected();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          this.handleMessage(msg);
        } catch {
          // ignore parse errors
        }
      };
    });
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
        this.callbacks.onRoomJoined({
          roomCode: msg.roomCode,
          playerId: msg.playerId,
          state: msg.state,
        });
        break;
      case 'PLAYER_JOINED':
      case 'PLAYER_LEFT':
      case 'GAME_STARTED':
        this.callbacks.onStateUpdate(msg.state);
        break;
      case 'STROKE_BROADCAST':
        this.callbacks.onStrokeReceived({
          stroke: msg.stroke,
          score: msg.score,
          playerId: msg.playerId,
          nextPlayerId: msg.nextPlayerId,
        });
        this.callbacks.onStateUpdate(msg.state);
        break;
      case 'TURN_SKIPPED':
        this.callbacks.onTurnSkipped({
          playerId: msg.playerId,
          nextPlayerId: msg.nextPlayerId,
        });
        this.callbacks.onStateUpdate(msg.state);
        break;
      case 'NARRATIVE':
        this.callbacks.onNarrative({ text: msg.text, playerId: msg.playerId });
        break;
      case 'ERROR':
        this.callbacks.onError(msg.message);
        break;
    }
  }

  private send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  createRoom(nickname: string): void {
    this.send({ type: 'CREATE_ROOM', nickname });
  }

  joinRoom(roomCode: string, nickname: string): void {
    this.send({ type: 'JOIN_ROOM', roomCode, nickname });
  }

  startGame(): void {
    this.send({ type: 'START_GAME' });
  }

  submitStroke(
    strokeType: Stroke['type'],
    color: string,
    width: number,
    points: Stroke['points'],
    score: number
  ): void {
    this.send({ type: 'STROKE_SUBMITTED', strokeType, color, width, points, score });
  }

  skipTurn(): void {
    this.send({ type: 'SKIP_TURN' });
  }

  sendNarrative(text: string): void {
    this.send({ type: 'NARRATIVE_MESSAGE', text });
  }

  leaveRoom(): void {
    this.send({ type: 'LEAVE_ROOM' });
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
