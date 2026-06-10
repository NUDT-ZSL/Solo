export interface DesignerInfo {
  name: string;
  avatar?: string;
  bio?: string;
}

export interface Rating {
  userId: string;
  score: number;
  createdAt: Date;
}

export interface Comment {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  createdAt: Date;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  fullRules?: string;
  designer: DesignerInfo;
  tags: string[];
  ratings?: Rating[];
  averageRating: number;
  likeCount: number;
  likedBy: string[];
  createdAt: Date;
  heat: number;
  ratingsCount?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
