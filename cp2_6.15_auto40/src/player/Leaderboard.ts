export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  difficulty: string;
  date: string;
}

export class Leaderboard {
  private static instance: Leaderboard;

  private constructor() {}

  static getInstance(): Leaderboard {
    if (!Leaderboard.instance) {
      Leaderboard.instance = new Leaderboard();
    }
    return Leaderboard.instance;
  }

  async fetchLeaderboard(difficulty?: string): Promise<LeaderboardEntry[]> {
    try {
      let url = '/api/leaderboard';
      if (difficulty) {
        url += `?difficulty=${encodeURIComponent(difficulty)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as LeaderboardEntry[];
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }
}

export default Leaderboard;
