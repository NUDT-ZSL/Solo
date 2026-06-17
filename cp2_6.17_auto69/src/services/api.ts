const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
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

export const sessionApi = {
  getSessions: () => request<GameSession[]>('/sessions'),
  getSession: (id: string) => request<GameSession>(`/sessions/${id}`),
  createSession: (data: { gameName: string; playerCount: number; players: PlayerInSession[] }) =>
    request<GameSession>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id: string, data: Partial<GameSession>) =>
    request<GameSession>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addNote: (sessionId: string, note: Omit<StrategyNote, 'id' | 'likes' | 'likedBy' | 'timestamp'>) =>
    request<StrategyNote>(`/sessions/${sessionId}/notes`, { method: 'POST', body: JSON.stringify(note) }),
  likeNote: (sessionId: string, noteId: string, playerId: string) =>
    request<StrategyNote>(`/sessions/${sessionId}/notes/${noteId}/like`, {
      method: 'POST',
      body: JSON.stringify({ playerId })
    })
};

export const playerApi = {
  getPlayerStats: (id: string) => request<PlayerStats>(`/players/${id}/stats`)
};

export const gameApi = {
  getRankings: () => request<GameRanking[]>('/games/rankings'),
  toggleFavorite: (name: string) =>
    request<GameRanking>(`/games/${name}/favorite`, { method: 'POST' })
};
