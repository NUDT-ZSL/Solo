export interface Rating {
  id: string;
  category: string;
  score: number;
  note: string;
  timestamp: number;
}

export interface CategoryStats {
  category: string;
  average: number;
  count: number;
  volatility: number;
  recentScores: number[];
}

export interface DashboardData {
  ratings: Rating[];
  stats: CategoryStats[];
}
