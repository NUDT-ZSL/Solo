export type Category = '技术协作' | '创新能力' | '响应速度' | '文档质量' | '沟通效率';

export const CATEGORIES: Category[] = ['技术协作', '创新能力', '响应速度', '文档质量', '沟通效率'];

export interface Rating {
  id: string;
  category: Category;
  score: number;
  comment?: string;
  timestamp: number;
}

export interface CategoryStats {
  category: Category;
  average: number;
  volatility: number;
  count: number;
  recentScores: number[];
}

export interface RatingsResponse {
  ratings: Rating[];
  stats: CategoryStats[];
  recentRatings: Rating[];
}
