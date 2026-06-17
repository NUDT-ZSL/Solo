import { GameState, GameConfig } from './types';

const API_BASE = import.meta.env.DEV ? '/api' : '/api';
const FALLBACK_BASE = 'http://localhost:3002/api';

export interface GameListItem {
  id: string;
  gameType: string;
  startTime: number;
  endTime?: number;
  playerNames: string[];
  winnerId?: string;
}

export interface SaveGameResponse {
  success: boolean;
  gameId: string;
}

export class ApiHandler {
  private baseUrl: string;
  private useFallback: boolean = false;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async fetchWithFallback(url: string, options: RequestInit): Promise<Response> {
    if (!this.useFallback) {
      try {
        const response = await fetch(url, options);
        if (response.ok || response.status === 404) {
          return response;
        }
        this.useFallback = true;
      } catch {
        this.useFallback = true;
      }
    }

    if (this.useFallback) {
      const fallbackUrl = url.replace(/^\/api/, FALLBACK_BASE);
      return fetch(fallbackUrl, options);
    }

    return fetch(url, options);
  }

  public async createGame(config: GameConfig): Promise<GameState> {
    const response = await this.fetchWithFallback(`${this.baseUrl}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new Error(`创建游戏失败: ${response.statusText}`);
    }

    return response.json();
  }

  public async saveGame(gameState: GameState): Promise<SaveGameResponse> {
    const response = await this.fetchWithFallback(`${this.baseUrl}/games/${gameState.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameState)
    });

    if (!response.ok) {
      throw new Error(`保存游戏失败: ${response.statusText}`);
    }

    return response.json();
  }

  public async getGame(gameId: string): Promise<GameState> {
    const response = await this.fetchWithFallback(`${this.baseUrl}/games/${gameId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`获取游戏失败: ${response.statusText}`);
    }

    return response.json();
  }

  public async listGames(): Promise<GameListItem[]> {
    const response = await this.fetchWithFallback(`${this.baseUrl}/games`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`获取游戏列表失败: ${response.statusText}`);
    }

    return response.json();
  }

  public async recordPlay(gameId: string, playData: {
    playerId: string;
    cards: any[];
    timestamp: number;
  }): Promise<GameState> {
    const response = await this.fetchWithFallback(`${this.baseUrl}/games/${gameId}/plays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(playData)
    });

    if (!response.ok) {
      throw new Error(`记录出牌失败: ${response.statusText}`);
    }

    return response.json();
  }

  public async validateGame(gameState: GameState): Promise<{ valid: boolean; errors: string[] }> {
    const response = await this.fetchWithFallback(`${this.baseUrl}/games/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameState)
    });

    if (!response.ok) {
      throw new Error(`验证游戏失败: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiHandler = new ApiHandler();
