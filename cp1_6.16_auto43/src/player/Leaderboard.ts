import { LeaderboardEntry } from '../game/GameEngine';

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];
  private fetchInterval: number | null = null;
  private onUpdateCallback: ((entries: LeaderboardEntry[]) => void) | null = null;
  private fallbackEntries: LeaderboardEntry[] = [];

  public async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      this.entries = await response.json();
      return this.entries;
    } catch (e) {
      console.warn('Using fallback leaderboard data');
      return this.fallbackEntries;
    }
  }

  public startPolling(intervalMs: number = 1000): void {
    this.stopPolling();
    this.fetchLeaderboard().then(entries => {
      this.notifyUpdate(entries);
    });
    
    this.fetchInterval = window.setInterval(async () => {
      const entries = await this.fetchLeaderboard();
      this.notifyUpdate(entries);
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.fetchInterval !== null) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
  }

  public setFallbackData(entries: LeaderboardEntry[]): void {
    this.fallbackEntries = [...entries].sort((a, b) => b.mineralCount - a.mineralCount);
  }

  public updateFallbackFromPlayers(players: { id: string; name: string; mineralCount: number; color: string }[]): void {
    this.fallbackEntries = players
      .map(p => ({ playerId: p.id, name: p.name, mineralCount: p.mineralCount }))
      .sort((a, b) => b.mineralCount - a.mineralCount);
    this.notifyUpdate(this.fallbackEntries);
  }

  public getEntries(): LeaderboardEntry[] {
    return this.entries.length > 0 ? this.entries : this.fallbackEntries;
  }

  public getTopN(n: number): LeaderboardEntry[] {
    return this.getEntries().slice(0, n);
  }

  public onUpdate(callback: (entries: LeaderboardEntry[]) => void): void {
    this.onUpdateCallback = callback;
  }

  private notifyUpdate(entries: LeaderboardEntry[]): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback([...entries]);
    }
  }

  public destroy(): void {
    this.stopPolling();
    this.entries = [];
    this.onUpdateCallback = null;
  }
}
