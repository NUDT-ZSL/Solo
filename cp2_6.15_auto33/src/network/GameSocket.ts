import type { GameState, ServerMessage, ClientMessage, UnitType, PlayerId, Unit, Tower } from '../shared/types';

type GameStateCallback = (state: GameState) => void;
type GameOverCallback = (winner: PlayerId | 'draw') => void;

const HEARTBEAT_INTERVAL = 10000;
const HEARTBEAT_TIMEOUT = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

interface StateDelta {
  tick: number;
  units?: ({ id: string } & Partial<Unit>)[];
  towers?: ({ id: string } & Partial<Tower>)[];
  removedUnits?: string[];
  removedTowers?: string[];
  particles?: any[];
  crystal?: Partial<any>;
  bases?: { red?: Partial<any>; blue?: Partial<any> };
  scores?: { red?: number; blue?: number };
  timeRemaining?: number;
  status?: string;
  winner?: PlayerId | 'draw' | null;
}

export class GameSocketClient {
  private ws: WebSocket | null = null;
  private gameState: GameState | null = null;
  private stateListeners: Set<GameStateCallback> = new Set();
  private gameOverListeners: Set<GameOverCallback> = new Set();
  private reconnectAttempts = 0;
  private serverUrl: string = '';
  private gameId: string = '';
  private playerName: string = '';
  private playerId: PlayerId | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private lastServerTick: number = 0;
  private isReconnecting: boolean = false;

  connect(url: string): Promise<void> {
    const params = new URLSearchParams();
    if (this.gameId) params.set('gameId', this.gameId);
    if (this.playerId) params.set('playerId', this.playerId);
    if (this.playerName) params.set('playerName', this.playerName);
    this.serverUrl = `${url}?${params.toString()}`;
    return this.establishConnection();
  }

  private establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startHeartbeat();

          if (this.gameId && this.playerName && this.playerId) {
            this.joinGame(this.gameId, this.playerName, this.playerId);
          }

          if (this.gameState) {
            this.send({ type: 'request_full_state' } as any);
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!this.isReconnecting) {
            reject(error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.stopHeartbeat();
          this.attemptReconnect();
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' } as any);

        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.warn('Heartbeat timeout, reconnecting...');
          this.ws?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(() => {
      this.establishConnection().catch((err) => {
        console.error('Reconnect failed:', err);
      });
    }, delay);
  }

  private handleMessage(msg: ServerMessage | { type: string; delta?: StateDelta; timestamp?: number }) {
    if ((msg as any).type === 'pong') {
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer);
        this.heartbeatTimeoutTimer = null;
      }
      return;
    }

    switch (msg.type) {
      case 'game_state':
        this.gameState = (msg as any).state;
        this.lastServerTick = this.gameState?.tick || 0;
        this.stateListeners.forEach(cb => cb(this.gameState!));
        break;

      case 'state_delta':
        this.applyDelta((msg as any).delta);
        break;

      case 'game_over':
        this.gameOverListeners.forEach(cb => cb((msg as any).winner));
        break;

      case 'unit_spawned':
        break;

      case 'unit_died':
        break;
    }
  }

  private applyDelta(delta: StateDelta) {
    if (!this.gameState) {
      this.send({ type: 'request_full_state' } as any);
      return;
    }

    if (delta.units) {
      for (const unitDelta of delta.units) {
        const existing = this.gameState.units.find(u => u.id === unitDelta.id);
        if (existing) {
          Object.assign(existing, unitDelta);
        } else {
          this.gameState.units.push(unitDelta as Unit);
        }
      }
    }

    if (delta.removedUnits) {
      this.gameState.units = this.gameState.units.filter(
        u => !delta.removedUnits!.includes(u.id)
      );
    }

    if (delta.towers) {
      for (const towerDelta of delta.towers) {
        const existing = this.gameState.towers.find(t => t.id === towerDelta.id);
        if (existing) {
          Object.assign(existing, towerDelta);
        } else {
          this.gameState.towers.push(towerDelta as Tower);
        }
      }
    }

    if (delta.removedTowers) {
      this.gameState.towers = this.gameState.towers.filter(
        t => !delta.removedTowers!.includes(t.id)
      );
    }

    if (delta.particles) {
      this.gameState.particles = delta.particles;
    }

    if (delta.crystal) {
      Object.assign(this.gameState.crystal, delta.crystal);
    }

    if (delta.bases) {
      if (delta.bases.red) {
        Object.assign(this.gameState.bases.red, delta.bases.red);
      }
      if (delta.bases.blue) {
        Object.assign(this.gameState.bases.blue, delta.bases.blue);
      }
    }

    if (delta.scores) {
      Object.assign(this.gameState.scores, delta.scores);
    }

    if (delta.timeRemaining !== undefined) {
      this.gameState.timeRemaining = delta.timeRemaining;
    }

    if (delta.status) {
      this.gameState.status = delta.status as any;
    }

    if (delta.winner !== undefined) {
      this.gameState.winner = delta.winner;
    }

    if (delta.tick !== undefined) {
      this.gameState.tick = delta.tick;
      this.lastServerTick = delta.tick;
    }

    this.stateListeners.forEach(cb => cb(this.gameState!));
  }

  send(message: ClientMessage | any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  joinGame(gameId: string, playerName: string, playerId: PlayerId) {
    this.gameId = gameId;
    this.playerName = playerName;
    this.playerId = playerId;

    this.send({
      type: 'join_game',
      gameId,
      playerName,
      playerId,
    });
  }

  buildUnit(playerId: PlayerId, unitType: UnitType) {
    this.send({
      type: 'build_unit',
      playerId,
      unitType,
    });
  }

  surrender(playerId: PlayerId) {
    this.send({
      type: 'surrender',
      playerId,
    });
  }

  getState(): GameState | null {
    return this.gameState;
  }

  onStateChange(callback: GameStateCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  onGameOver(callback: GameOverCallback): () => void {
    this.gameOverListeners.add(callback);
    return () => this.gameOverListeners.delete(callback);
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stateListeners.clear();
    this.gameOverListeners.clear();
    this.reconnectAttempts = 0;
  }
}

export const gameSocket = new GameSocketClient();
