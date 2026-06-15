import {
  Action,
  CellType,
  Hint,
  MazeState,
  MessageType,
  Player,
  WebSocketMessage,
} from '@shared/types';

export type WSMessageHandler = (message: WebSocketMessage) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string;
  private handlers: Set<WSMessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManualClose = false;
  private messageQueue: string[] = [];

  constructor(roomId: string) {
    this.roomId = roomId;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    this.url = `${protocol}//${host}:${port}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.isManualClose = false;

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handlers.forEach((handler) => handler(message));
          } catch {
            // ignore invalid messages
          }
        };

        this.ws.onerror = (error) => {
          reject(error);
        };

        this.ws.onclose = () => {
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // reconnect failed, will try again
      });
    }, delay);
  }

  private flushQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) this.ws.send(msg);
    }
  }

  send(type: MessageType, data: unknown): void {
    const message: WebSocketMessage = {
      type,
      roomId: this.roomId,
      data,
    };
    const raw = JSON.stringify(message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.messageQueue.push(raw);
    }
  }

  join(playerName: string, color: string, playerId?: string): void {
    this.send('join', { playerName, color, playerId });
  }

  movePlayer(newX: number, newY: number): void {
    this.send('player_move', { newX, newY });
  }

  toggleObstacle(x: number, y: number): void {
    this.send('toggle_obstacle', { x, y });
  }

  addHint(x: number, y: number, text: string): void {
    this.send('add_hint', { x, y, text });
  }

  renamePlayer(name: string): void {
    this.send('rename_player', { name });
  }

  onMessage(handler: WSMessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  close(): void {
    this.isManualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.messageQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getRoomId(): string {
    return this.roomId;
  }
}

export interface MazeUpdateCallbacks {
  onStateSync: (state: MazeState & { selfPlayerId: string }) => void;
  onPlayerJoin: (player: Player) => void;
  onPlayerLeave: (playerId: string) => void;
  onPlayerMove: (data: { playerId: string; newX: number; newY: number; oldX: number; oldY: number }) => void;
  onToggleObstacle: (data: { x: number; y: number; cellType: CellType }) => void;
  onAddHint: (hint: Hint) => void;
  onRenamePlayer: (data: { playerId: string; name: string }) => void;
}

export function setupMessageHandlers(
  manager: WebSocketManager,
  callbacks: MazeUpdateCallbacks
): () => void {
  return manager.onMessage((message) => {
    switch (message.type) {
      case 'state_sync':
        callbacks.onStateSync(message.data as MazeState & { selfPlayerId: string });
        break;
      case 'join':
        callbacks.onPlayerJoin(message.data as Player);
        break;
      case 'leave':
        callbacks.onPlayerLeave((message.data as { playerId: string }).playerId);
        break;
      case 'player_move':
        callbacks.onPlayerMove(
          message.data as { playerId: string; newX: number; newY: number; oldX: number; oldY: number }
        );
        break;
      case 'toggle_obstacle':
        callbacks.onToggleObstacle(message.data as { x: number; y: number; cellType: CellType });
        break;
      case 'add_hint':
        callbacks.onAddHint(message.data as Hint);
        break;
      case 'rename_player':
        callbacks.onRenamePlayer(message.data as { playerId: string; name: string });
        break;
      default:
        break;
    }
  });
}

export function applyActionToState(state: MazeState, action: Action): MazeState {
  const newState = {
    ...state,
    grid: state.grid.map((row) => [...row]),
    players: state.players.map((p) => ({ ...p })),
    hints: [...state.hints],
  };

  switch (action.type) {
    case 'move': {
      const player = newState.players.find((p) => p.id === action.playerId);
      if (player && action.payload.newX !== undefined && action.payload.newY !== undefined) {
        player.x = action.payload.newX;
        player.y = action.payload.newY;
      }
      break;
    }
    case 'toggle_obstacle': {
      if (
        action.payload.x !== undefined &&
        action.payload.y !== undefined &&
        action.payload.cellType
      ) {
        if (
          action.payload.y >= 0 &&
          action.payload.y < newState.height &&
          action.payload.x >= 0 &&
          action.payload.x < newState.width
        ) {
          newState.grid[action.payload.y][action.payload.x] = action.payload.cellType;
        }
      }
      break;
    }
    case 'add_hint': {
      if (
        action.payload.x !== undefined &&
        action.payload.y !== undefined &&
        action.payload.text
      ) {
        newState.hints.push({
          id: action.id,
          x: action.payload.x,
          y: action.payload.y,
          text: action.payload.text,
          createdAt: action.timestamp,
          duration: 5000,
        });
      }
      break;
    }
    default:
      break;
  }

  return newState;
}
