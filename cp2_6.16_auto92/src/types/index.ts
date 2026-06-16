export type MovieGenre = '动作' | '喜剧' | '科幻' | '悬疑' | '动画';

export interface Movie {
  id: string;
  title: string;
  posterEmoji: string;
  posterColor: string;
  duration: number;
  genre: MovieGenre;
  synopsis: string;
}

export interface ScheduleItem {
  movieId: string;
  order: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface Schedule {
  id: string;
  items: ScheduleItem[];
  createdAt: string;
  closedAt?: string;
  isClosed: boolean;
}

export interface Vote {
  id: string;
  scheduleId: string;
  voterId: string;
  movieIds: string[];
  createdAt: string;
}

export interface VoteResult {
  movieId: string;
  count: number;
}
