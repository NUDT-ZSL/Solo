export interface Trail {
  id: string;
  url: string;
  title: string;
  duration: number;
  scrollDepth: number;
  themeColor: string;
  visitedAt: string;
  category: string;
}

export interface TrailInput {
  url: string;
  title?: string;
  duration?: number;
  scrollDepth?: number;
  themeColor?: string;
  category?: string;
}

export type DisplayMode = 'timeline' | 'category' | 'duration';
