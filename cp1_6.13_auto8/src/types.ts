export interface Habit {
  _id: string;
  name: string;
  targetFrequency: number;
  createdAt: string;
  isCheckedToday?: boolean;
}

export interface CheckIn {
  _id: string;
  habitId: string;
  date: string;
  note?: string;
  createdAt: string;
}

export interface DailyStats {
  date: string;
  totalHabits: number;
  completedHabits: number;
  completionRate: number;
}

export interface WeeklyCheckIn {
  date: string;
  checked: boolean;
}
