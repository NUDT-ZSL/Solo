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

export interface MergedSong extends SongRecord {
  platforms: string[];
}

export interface TopSong {
  id: string;
  title: string;
  artist: string;
  playCount: number;
  firstPlayDate: string;
  platformDistribution: Record<string, number>;
  coverColor: string;
}

export interface TopArtist {
  name: string;
  playCount: number;
  avatarColor: string;
}

export interface GenreItem {
  genre: string;
  percentage: number;
  color: string;
}

export interface YearlyReport {
  totalPlays: number;
  topSongs: TopSong[];
  topArtists: TopArtist[];
  genreDistribution: GenreItem[];
}

export interface Config {
  id: number;
  platformId: string;
  token: string | null;
  createdAt: string;
  updatedAt: string;
}
