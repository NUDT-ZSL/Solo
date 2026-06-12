export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'custom';
  customDays?: number[];
  targetValue: number;
  unit: string;
  reminders: string[];
  createdAt: string;
}

export interface CheckIn {
  id: string;
  habitId: string;
  date: string;
  value: number;
  timeOfDay: 'morning' | 'forenoon' | 'afternoon' | 'evening';
  completedAt: string;
}

export interface HabitProgress {
  habit: Habit;
  todayValue: number;
  completed: boolean;
  checkIns: CheckIn[];
}

export interface StatsDataPoint {
  date: string;
  dayOfWeek: number;
  timeOfDay: 'morning' | 'forenoon' | 'afternoon' | 'evening';
  count: number;
}

export interface StatsResponse {
  weekly: StatsDataPoint[];
  monthly: StatsDataPoint[];
  quarterly: StatsDataPoint[];
}

export type TimeRange = 'weekly' | 'monthly' | 'quarterly';
