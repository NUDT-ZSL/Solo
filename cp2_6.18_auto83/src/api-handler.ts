import { GameState, GameConfig } from './types';

const API_BASE = '/api';

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

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  public async createGame(config: GameConfig): Promise<GameState> {
    const response = await fetch(`${this.baseUrl}/games`, {
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
    const response = await fetch(`${this.baseUrl}/games/${gameState.id}`, {
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
    const response = await fetch(`${this.baseUrl}/games/${gameId}`);

    if (!response.ok) {
      throw new Error(`获取游戏失败: ${response.statusText}`);
    }

    return response.json();
  }

  public async listGames(): Promise<GameListItem[]> {
    const response = await fetch(`${this.baseUrl}/games`);

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
    const response = await fetch(`${this.baseUrl}/games/${gameId}/plays`, {
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
    const response = await fetch(`${this.baseUrl}/games/validate`, {
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
