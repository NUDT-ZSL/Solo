export interface Film {
  id: string;
  title: string;
  category: '剧情' | '纪录片' | '动画';
  posterUrl: string;
  description: string;
  director: string;
  releaseDate: string;
}

export interface FilmWithStats extends Film {
  averageScore: number;
  voteCount: number;
}

export interface Rating {
  id: string;
  filmId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface CategoryHeat {
  category: string;
  heat: number;
  count: number;
}

export interface DailyTrend {
  date: string;
  count: number;
}

export interface WordCloudItem {
  text: string;
  weight: number;
}

export interface DashboardData {
  categoryHeats: CategoryHeat[];
  dailyTrends: DailyTrend[];
  wordCloud: WordCloudItem[];
  topFilms: FilmWithStats[];
}
