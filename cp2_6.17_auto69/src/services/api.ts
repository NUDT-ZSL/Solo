const BASE_URL = '/api';

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `请求失败 (状态码: ${response.status})`;
      try {
        const errData = await response.json();
        if (errData?.error) {
          errorMessage = errData.error;
        }
      } catch {
        // ignore parse error
      }
      if (response.status === 404) {
        errorMessage = '请求的资源不存在';
      } else if (response.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试';
      } else if (response.status === 0) {
        errorMessage = '网络连接失败，请检查网络';
      }
      throw new ApiError(errorMessage, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', 408);
    }
    if (error instanceof TypeError) {
      throw new ApiError('网络连接失败，请检查服务器是否启动', 0);
    }
    if (error instanceof Error) {
      throw new ApiError(error.message, 500);
    }
    throw new ApiError('未知错误', 500);
  }
}

export interface PlayerInSession {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

export interface StrategyNote {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  round: number;
  content: string;
  likes: number;
  likedBy: string[];
  timestamp: string;
}

export interface PlayerResult {
  playerId: string;
  playerName: string;
  rank: number;
  score: number;
  weightedScore: number;
}

export interface TimelineEvent {
  round: number;
  event: string;
  timestamp: string;
}

export interface GameSession {
  id: string;
  gameName: string;
  playerCount: number;
  players: PlayerInSession[];
  status: 'pending' | 'playing' | 'finished';
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  rounds?: number;
  notes: StrategyNote[];
  results?: PlayerResult[];
  timeline: TimelineEvent[];
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  wins: number;
  winRate: number;
  averageScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
  recentScores: { gameName: string; score: number; won: boolean; date: string }[];
  gameDistribution: { gameName: string; count: number; percentage: number }[];
}

export interface GameRanking {
  name: string;
  totalSessions: number;
  averageDuration: number;
  averageRounds: number;
  totalNotes: number;
  isFavorite: boolean;
}

export const gameNames = ['卡坦岛', '璀璨宝石', '七大奇迹', '殖民火星', '冷战热斗'];

async function safeCall<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { data: null, error: error.message };
    }
    return { data: null, error: '请求失败' };
  }
}

export const sessionApi = {
  getSessions: () =>
    safeCall(() => request<GameSession[]>('/sessions')),

  getSession: (id: string) =>
    safeCall(() => request<GameSession>(`/sessions/${id}`)),

  createSession: (data: { gameName: string; playerCount: number; players: PlayerInSession[] }) =>
    safeCall(() =>
      request<GameSession>('/sessions', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    ),

  updateSession: (id: string, data: Partial<GameSession>) =>
    safeCall(() =>
      request<GameSession>(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    ),

  addNote: (
    sessionId: string,
    note: Omit<StrategyNote, 'id' | 'likes' | 'likedBy' | 'timestamp'>
  ) =>
    safeCall(() =>
      request<StrategyNote>(`/sessions/${sessionId}/notes`, {
        method: 'POST',
        body: JSON.stringify(note)
      })
    ),

  likeNote: (sessionId: string, noteId: string, playerId: string) =>
    safeCall(() =>
      request<StrategyNote>(`/sessions/${sessionId}/notes/${noteId}/like`, {
        method: 'POST',
        body: JSON.stringify({ playerId })
      })
    )
};

export const playerApi = {
  getPlayerStats: (id: string) =>
    safeCall(() => request<PlayerStats>(`/players/${id}/stats`))
};

export const gameApi = {
  getRankings: () =>
    safeCall(() => request<GameRanking[]>('/games/rankings')),

  toggleFavorite: (name: string) =>
    safeCall(() =>
      request<GameRanking>(`/games/${encodeURIComponent(name)}/favorite`, {
        method: 'POST'
      })
    )
};
