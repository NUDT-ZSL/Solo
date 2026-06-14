import type { Activity, Volunteer } from './mock-api';

export interface MonthlyStats {
  month: number;
  count: number;
  duration: number;
}

export interface LeaderboardItem {
  rank: number;
  volunteerId: string;
  name: string;
  avatar: string;
  totalDuration: number;
}

export const computeMonthlyStats = (activities: Activity[], year: number): MonthlyStats[] => {
  const monthlyData = new Map<number, { count: number; duration: number }>();

  for (let i = 1; i <= 12; i++) {
    monthlyData.set(i, { count: 0, duration: 0 });
  }

  for (const activity of activities) {
    const activityYear = parseInt(activity.date.substring(0, 4), 10);
    if (activityYear !== year) continue;

    const month = parseInt(activity.date.substring(5, 7), 10);
    const current = monthlyData.get(month);
    if (current) {
      current.count += 1;
      current.duration += activity.duration;
    }
  }

  const result: MonthlyStats[] = [];
  for (let i = 1; i <= 12; i++) {
    const data = monthlyData.get(i)!;
    result.push({
      month: i,
      count: data.count,
      duration: data.duration
    });
  }

  return result;
};

export const computeLeaderboard = (
  activities: Activity[],
  volunteers: Volunteer[]
): LeaderboardItem[] => {
  const volunteerDuration = new Map<string, number>();

  for (const activity of activities) {
    const current = volunteerDuration.get(activity.volunteerId) || 0;
    volunteerDuration.set(activity.volunteerId, current + activity.duration);
  }

  const items: LeaderboardItem[] = volunteers
    .map((volunteer) => ({
      volunteerId: volunteer.id,
      name: volunteer.name,
      avatar: volunteer.avatar,
      totalDuration: volunteerDuration.get(volunteer.id) || 0
    }))
    .filter((item) => item.totalDuration > 0)
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));

  return items;
};
