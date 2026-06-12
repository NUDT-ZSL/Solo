const API_BASE = 'http://localhost:3001/api';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as ApiResponse<T>;
      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }

      return data.data as T;
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

export interface PlayerData {
  playerId: string;
  fragments: Record<string, number>;
  characters: any[];
  expCrystals: number;
  safeCellsCleared: number;
  bossLevel: number;
  teamIds: string[];
  createdAt: number;
  updatedAt: number;
}

export async function loadPlayerData(playerId: string): Promise<PlayerData> {
  return request<PlayerData>(`/player/${playerId}`, {
    method: 'GET'
  });
}

export async function savePlayerData(playerId: string, data: Partial<PlayerData>): Promise<PlayerData> {
  return request<PlayerData>(`/player/${playerId}/save`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function addFragment(playerId: string, characterId: string, count: number = 1): Promise<PlayerData> {
  return request<PlayerData>(`/player/${playerId}/fragment`, {
    method: 'POST',
    body: JSON.stringify({ characterId, count })
  });
}

export async function levelUpCharacter(playerId: string, characterId: string): Promise<PlayerData> {
  return request<PlayerData>(`/player/${playerId}/levelup`, {
    method: 'POST',
    body: JSON.stringify({ characterId })
  });
}

export async function unlockCharacter(playerId: string, character: any, fragmentsUsed: number): Promise<PlayerData> {
  return request<PlayerData>(`/player/${playerId}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ character, fragmentsUsed })
  });
}

export async function beatBoss(playerId: string, bossLevel: number, rewards: any): Promise<PlayerData> {
  return request<PlayerData>(`/player/${playerId}/boss/beat`, {
    method: 'POST',
    body: JSON.stringify({ bossLevel, rewards })
  });
}

export async function updateTeam(playerId: string, teamIds: string[]): Promise<PlayerData> {
  return request<PlayerData>(`/player/${playerId}/team`, {
    method: 'POST',
    body: JSON.stringify({ teamIds })
  });
}
