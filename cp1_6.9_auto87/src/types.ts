export interface Artwork {
  id: string;
  title: string;
  imageUrl: string;
  voteCount: number;
  createdAt: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SortOption = 'latest' | 'hottest' | 'random';
