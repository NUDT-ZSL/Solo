export interface Rating {
  id: string;
  userId: string;
  score: 1 | 2 | 3 | 4 | 5;
  createdAt: number;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: number;
}

export interface CardData {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tags: string[];
  ratings: Rating[];
  comments: Comment[];
}

export type ThemeColor = 'warm' | 'cool' | 'nature' | 'soft' | 'dark' | 'vintage';

export interface ThemeConfig {
  main: string;
  light: string;
  lighter: string;
  lightest: string;
}

export interface MoodBoardData {
  id: string;
  cardIds: string[];
  themeColor: ThemeColor;
}

export type ViewType = 'board' | 'moodboard';

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
