export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  score: number;
  lastChallengeAt: string;
}

export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.lastChallengeAt).getTime() - new Date(a.lastChallengeAt).getTime();
  });
}
