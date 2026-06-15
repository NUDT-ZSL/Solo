export type Tag = 'React' | 'CSS' | 'JavaScript' | 'Performance';

export interface Article {
  id: string;
  title: string;
  date: string;
  tags: Tag[];
  views: number;
  likes: number;
}

export interface TagDistribution {
  name: Tag;
  value: number;
}

export interface MonthlyViews {
  month: string;
  views: number;
}

export interface Stats {
  totalViews: number;
  avgLikes: number;
  tagDistribution: TagDistribution[];
  monthlyTrend: MonthlyViews[];
}

export const TAG_COLORS: Record<Tag, string> = {
  React: '#61dafb',
  CSS: '#38b2ac',
  JavaScript: '#d69e2e',
  Performance: '#e53e3e',
};
