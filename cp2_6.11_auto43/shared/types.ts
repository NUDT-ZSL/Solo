export interface EmotionRecord {
  id: string;
  userId: string;
  date: string;
  color: string;
  text: string;
  intensity: number;
  position?: { x: number; y: number };
}

export interface Echo {
  id: string;
  trajectoryId: string;
  targetDate: string;
  color: string;
  text: string;
  createdAt: string;
}

export interface TrajectoryData {
  records: EmotionRecord[];
  echoes: Echo[];
}

export interface MonthlyDistItem {
  color: string;
  count: number;
  percentage: number;
}

export interface WeeklyTrendItem {
  date: string;
  intensity: number;
  color: string;
}

export interface StatsData {
  monthlyDistribution: MonthlyDistItem[];
  weeklyTrend: WeeklyTrendItem[];
  totalDays: number;
}

export const PRESET_COLORS = [
  '#FF6B6B',
  '#FF8E53',
  '#FFC857',
  '#A8E06C',
  '#56C596',
  '#4ECDC4',
  '#45B7D1',
  '#5B8DEF',
  '#7C6EF6',
  '#B06AB3',
  '#E875A8',
  '#FF9FB2',
];

export const DEFAULT_USER_ID = 'user_default';
