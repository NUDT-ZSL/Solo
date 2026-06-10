export interface Rating {
  userId: string;
  score: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  createdAt: string;
}

export interface Game {
  id: string;
  name: string;
  designer: string;
  coverImage: string;
  summary: string;
  fullRules: string;
  tags: string[];
  ratings: Rating[];
  averageRating: number;
  ratingsCount: number;
  likedBy: string[];
  likeCount: number;
  commentsCount: number;
  heat: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export type SortBy = 'heat' | 'rating';

export interface AddCommentData {
  userId: string;
  userName: string;
  avatar: string;
  content: string;
}
