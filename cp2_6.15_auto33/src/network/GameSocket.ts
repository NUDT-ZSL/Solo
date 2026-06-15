import type { GameState, ServerMessage, ClientMessage, UnitType, PlayerId } from '../shared/types';

type GameStateCallback = (state: GameState) => void;
type GameOverCallback = (winner: PlayerId | 'draw') => void;

export class GameSocketClient {
  private ws: WebSocket | null = null;
  private gameState: GameState | null = null;
  private stateListeners: Set<GameStateCallback> = new Set();
  private gameOverListeners: Set<GameOverCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: ServerMessage = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.attemptReconnect(url);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      this.connect(url).catch(() => {});
    }, 1000 * this.reconnectAttempts);
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'game_state':
        this.gameState = msg.state;
        this.stateListeners.forEach(cb => cb(msg.state));
        break;
      case 'game_over':
        this.gameOverListeners.forEach(cb => cb(msg.winner));
        break;
      case 'unit_spawned':
        break;
      case 'unit_died':
        break;
    }
  }

  send(message: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  joinGame(gameId: string, playerName: string, playerId: PlayerId) {
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stateListeners.clear();
    this.gameOverListeners.clear();
  }
}

export const gameSocket = new GameSocketClient();
