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
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private isManualClose: boolean = false;
  private playerName: string = '';
  private isDestroyed: boolean = false;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(playerName: string): void {
    if (this.isDestroyed) {
      this.isDestroyed = false;
    }
    
    this.playerName = playerName;
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    
    this.cleanupAllTimers();
    this.cleanupWebSocket();
    
    this.establishConnection();
  }

  private cleanupAllTimers(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanupWebSocket(): void {
    if (this.ws !== null) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch (_e) {
      }
      this.ws = null;
    }
  }

  private establishConnection(): void {
    if (this.isDestroyed || this.isManualClose) return;
    
    try {
      this.cleanupWebSocket();
      
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
    if (this.isDestroyed || this.isManualClose) return;
    
    console.log('WebSocket connected');
    
    this.reconnectAttempts = 0;
    
    this.startHeartbeat();
    
    if (this.callbacks.onConnect) {
      try {
        this.callbacks.onConnect();
      } catch (_e) {
      }
    }
    
    this.sendMatchRequest();
  }

  private handleMessage(event: MessageEvent): void {
    if (this.isDestroyed) return;
    
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
    if (this.isDestroyed) return;
    
    console.log('WebSocket closed:', event.code, event.reason);
    
    this.stopHeartbeat();
    
    if (this.callbacks.onDisconnect && !this.isManualClose) {
      try {
        this.callbacks.onDisconnect();
      } catch (_e) {
      }
    }
    
    this.cleanupWebSocket();
    
    if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event | Error): void {
    if (this.isDestroyed) return;
    
    console.error('WebSocket error:', error);
    
    this.stopHeartbeat();
    
    if (this.callbacks.onError) {
      try {
        this.callbacks.onError(error instanceof Error ? error : new Error('WebSocket error'));
      } catch (_e) {
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.isManualClose) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    
    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.establishConnection();
    }, RECONNECT_DELAY);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    if (this.isDestroyed) return;
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isDestroyed) {
        this.stopHeartbeat();
        return;
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          const heartbeat = {
            type: 'heartbeat',
            timestamp: Date.now(),
          };
          this.ws.send(JSON.stringify(heartbeat));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          this.stopHeartbeat();
        }
      } else if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.stopHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
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
    if (this.isDestroyed) return;
    
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
    this.isDestroyed = true;
    
    this.cleanupAllTimers();
    this.cleanupWebSocket();
    
    this.reconnectAttempts = 0;
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && !this.isDestroyed;
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
