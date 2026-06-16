import { LeaderboardEntry } from '../game/GameEngine';

export interface LeaderboardDisplayEntry extends LeaderboardEntry {
  isLocalPlayer: boolean;
  rank: number;
}

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];
  private fetchInterval: number | null = null;
  private onUpdateCallback: ((entries: LeaderboardDisplayEntry[]) => void) | null = null;
  private fallbackEntries: LeaderboardEntry[] = [];
  private localPlayerId: string = '';

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

  public setLocalPlayerId(playerId: string): void {
    this.localPlayerId = playerId;
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

  public getTopN(n: number): LeaderboardDisplayEntry[] {
    return this.getDisplayEntries().slice(0, n);
  }

  private getDisplayEntries(): LeaderboardDisplayEntry[] {
    const sortedEntries = [...this.getEntries()].sort((a, b) => b.mineralCount - a.mineralCount);
    return sortedEntries.map((entry, index) => ({
      ...entry,
      isLocalPlayer: entry.playerId === this.localPlayerId,
      rank: index + 1,
    }));
  }

  public onUpdate(callback: (entries: LeaderboardDisplayEntry[]) => void): void {
    this.onUpdateCallback = callback;
  }

  private notifyUpdate(entries: LeaderboardEntry[]): void {
    if (this.onUpdateCallback) {
      const displayEntries = this.getDisplayEntries();
      this.onUpdateCallback([...displayEntries]);
    }
  }

  public destroy(): void {
    this.stopPolling();
    this.entries = [];
    this.onUpdateCallback = null;
  }
}
