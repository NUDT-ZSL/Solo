export type Tag =
  | 'RPG'
  | '解谜'
  | '动作'
  | '步行模拟'
  | '策略'
  | '恐怖'
  | '像素'
  | '视觉小说'
  | '平台跳跃'
  | 'Roguelike'
  | '模拟经营'
  | '卡牌';

export interface RatingAggregate {
  average: number;
  count: number;
  distribution: number[];
}

export interface GameListItem {
  id: string;
  title: string;
  description: string;
  releaseDate: string;
  tags: Tag[];
  coverUrl: string;
  rating: RatingAggregate;
}

export interface RatingItem {
  id: string;
  gameId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface GameDetail extends GameListItem {
  ratings: RatingItem[];
}

export interface SubmitRatingPayload {
  gameId: string;
  score: number;
  comment: string;
}

export interface SubmitRatingResponse {
  success: boolean;
  rating: RatingItem;
  aggregated: RatingAggregate;
}
