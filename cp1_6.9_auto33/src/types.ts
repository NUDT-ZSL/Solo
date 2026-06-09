export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  primaryTag: string;
  recommendReason?: string;
  matchScore?: number;
}

export type InteractionType = 'like' | 'favorite' | 'ignore';

export interface InteractionRequest {
  bookId: string;
  action: InteractionType;
}

export interface RecommendationResponse {
  books: Book[];
  timestamp: number;
}

export interface PreferenceMap {
  [tag: string]: number;
}

export interface PreferencesResponse {
  weights: PreferenceMap;
  allTags: string[];
}

export const ALL_TAGS = [
  '科幻',
  '历史',
  '推理',
  '浪漫',
  '武侠',
  '哲学',
  '悬疑',
  '传记',
  '奇幻',
  '文学',
];

export const TAG_HUES: Record<string, number> = {
  '科幻': 210,
  '历史': 30,
  '推理': 270,
  '浪漫': 330,
  '武侠': 0,
  '哲学': 180,
  '悬疑': 240,
  '传记': 60,
  '奇幻': 140,
  '文学': 90,
};
