export type Category = 'growth' | 'efficiency' | 'experience' | 'tech';

export interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  weight: number;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  growth: {
    label: '增长',
    color: '#E74C3C',
    bgColor: 'rgba(231, 76, 60, 0.1)',
    weight: 1.0
  },
  efficiency: {
    label: '效率',
    color: '#F39C12',
    bgColor: 'rgba(243, 156, 18, 0.1)',
    weight: 0.9
  },
  experience: {
    label: '体验',
    color: '#3498DB',
    bgColor: 'rgba(52, 152, 219, 0.1)',
    weight: 0.8
  },
  tech: {
    label: '技术',
    color: '#9B59B6',
    bgColor: 'rgba(155, 89, 182, 0.1)',
    weight: 0.7
  }
};

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: Category;
  intuitionScore: number;
  createdAt: string;
}

export interface EvaluationResult {
  score: number;
  stars: number;
  breakdown: {
    intuitionComponent: number;
    weightComponent: number;
  };
}

export type SortType = 'score' | 'time';
export type FilterCategory = Category | 'all';
