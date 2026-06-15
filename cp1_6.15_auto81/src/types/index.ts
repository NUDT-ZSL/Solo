export type MusicGenre = 'rock' | 'pop' | 'electronic' | 'folk' | 'jazz';

export type StageName = 'main' | 'electronic';

export interface Band {
  id: string;
  name: string;
  genre: MusicGenre;
  stage: StageName;
  startTime: string;
  endTime: string;
  description: string;
  origin: string;
  popularSongs: string[];
}

export const GENRE_COLORS: Record<MusicGenre, string> = {
  rock: '#E74C3C',
  pop: '#2ECC71',
  electronic: '#9B59B6',
  folk: '#F39C12',
  jazz: '#1ABC9C',
};

export const GENRE_LABELS: Record<MusicGenre, string> = {
  rock: '摇滚',
  pop: '流行',
  electronic: '电子',
  folk: '民谣',
  jazz: '爵士',
};

export const STAGE_LABELS: Record<StageName, string> = {
  main: '主舞台',
  electronic: '电子舞台',
};
