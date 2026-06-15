const NICKNAME_KEY = 'rhythm_runner_nickname';

export interface ScoreData {
  nickname: string;
  score: number;
  difficulty: string;
}

export class PlayerManager {
  private static instance: PlayerManager;

  private constructor() {}

  static getInstance(): PlayerManager {
    if (!PlayerManager.instance) {
      PlayerManager.instance = new PlayerManager();
    }
    return PlayerManager.instance;
  }

  isLoggedIn(): boolean {
    const nickname = localStorage.getItem(NICKNAME_KEY);
    return nickname !== null && nickname.trim() !== '';
  }

  getNickname(): string {
    return localStorage.getItem(NICKNAME_KEY) || '';
  }

  setNickname(name: string): void {
    localStorage.setItem(NICKNAME_KEY, name.trim());
  }

  async saveScore(nickname: string, score: number, difficulty: string): Promise<boolean> {
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname, score, difficulty }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Failed to save score:', error);
      return false;
    }
  }
}

export default PlayerManager;
