import type { GameSession, PlayRecord, GameConfig, GameType } from './card-logic';

const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface CreateGameRequest {
  gameType: GameType;
  config: GameConfig;
}

export interface GameListItem {
  id: string;
  gameType: GameType;
  startTime: number;
  endTime?: number;
  winnerName?: string;
  playerCount: number;
}

export const api = {
  async createGame(data: CreateGameRequest): Promise<GameSession> {
    return request<GameSession>('/games', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getGames(): Promise<GameListItem[]> {
    return request<GameListItem[]>('/games');
  },

  async getGame(id: string): Promise<GameSession> {
    return request<GameSession>(`/games/${id}`);
  },

  async addRecord(gameId: string, record: PlayRecord): Promise<PlayRecord> {
    return request<PlayRecord>(`/games/${gameId}/records`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
  },

  async finishGame(gameId: string, winnerId: string): Promise<GameSession> {
    return request<GameSession>(`/games/${gameId}/finish`, {
      method: 'POST',
      body: JSON.stringify({ winnerId })
    });
  }
};

export default api;
