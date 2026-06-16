import type { User, LeaderboardEntry } from '@/types';

export function sortLeaderboard(users: User[]): LeaderboardEntry[] {
  const sorted = [...users].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.lastChallengeTime - a.lastChallengeTime;
  });

  return sorted.slice(0, 10).map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    score: user.score,
  }));
}
