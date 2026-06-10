export interface Photo {
  id: string;
  url: string;
  note: string;
  emoji: string;
  order: number;
  width?: number;
  height?: number;
}

export interface FilmRoll {
  id: string;
  title: string;
  shareLink: string;
  photos: Photo[];
  createdAt: string;
}

export const EMOJI_OPTIONS = ['❤️', '✨', '🌙', '☀️', '🍂', '🌸', '🎞️', '📷', '🌊', '🎵'];
