export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  token?: string;
}

export interface SongRecord {
  id: string;
  platformId: string;
  title: string;
  artist: string;
  playCount: number;
  date: string;
  genre?: string;
  coverColor?: string;
}

export interface YearlyReport {
  totalPlays: number;
  topSongs: Array<{
    id: string;
    title: string;
    artist: string;
    playCount: number;
    firstPlayDate: string;
    platformDistribution: Record<string, number>;
    coverColor: string;
  }>;
  topArtists: Array<{
    name: string;
    playCount: number;
    avatarColor: string;
  }>;
  genreDistribution: Array<{
    genre: string;
    percentage: number;
    color: string;
  }>;
}

export interface Config {
  id: number;
  platformId: string;
  token: string | null;
  createdAt: string;
  updatedAt: string;
}
