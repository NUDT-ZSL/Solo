import { GameState, GameAction, ClientMessage, ServerMessage, MatchFoundMessage } from './types';

const WS_URL = 'ws://localhost:4000';
const HEARTBEAT_INTERVAL = 3000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface NetworkCallbacks {
  onMatchFound: (data: MatchFoundMessage) => void;
  onStateUpdate: (state: GameState) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export class GameNetwork {
  private ws: WebSocket | null = null;
  private callbacks: NetworkCallbacks;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManualClose: boolean = false;
  private playerName: string = '';

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(playerName: string): void {
    this.playerName = playerName;
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this.establishConnection();
  }

  private establishConnection(): void {
    try {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    
    if (this.callbacks.onConnect) {
      this.callbacks.onConnect();
    }
    
    this.startHeartbeat();
    this.sendMatchRequest();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: ServerMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'matchFound':
          this.callbacks.onMatchFound(message);
          break;
        case 'state':
          this.callbacks.onStateUpdate(message.state);
          break;
        case 'heartbeat':
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.stopHeartbeat();
    
    if (this.callbacks.onDisconnect) {
      this.callbacks.onDisconnect();
    }
    
    if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event | Error): void {
    console.error('WebSocket error:', error);
    if (this.callbacks.onError) {
      this.callbacks.onError(error instanceof Error ? error : new Error('WebSocket error'));
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.establishConnection();
    }, RECONNECT_DELAY);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeat = {
          type: 'heartbeat',
          timestamp: Date.now(),
        };
        this.ws.send(JSON.stringify(heartbeat));
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendMatchRequest(): void {
    const message: ClientMessage = {
      type: 'match',
      playerName: this.playerName,
    };
    this.send(message);
  }

  public sendAction(action: GameAction, roomId: string, playerId: 1 | 2): void {
    const message: ClientMessage = {
      type: 'action',
      action,
      roomId,
      playerId,
    };
    this.send(message);
  }

  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }

  public disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  public getMaxReconnectAttempts(): number {
    return MAX_RECONNECT_ATTEMPTS;
  }
}

export function createNetwork(callbacks: NetworkCallbacks): GameNetwork {
  return new GameNetwork(callbacks);
}
