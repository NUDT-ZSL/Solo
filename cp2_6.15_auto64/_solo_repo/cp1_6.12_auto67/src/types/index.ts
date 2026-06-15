export interface MusicRecord {
  id: number;
  songName: string;
  artist: string;
  scene: string;
  rating: number;
  image: string | null;
  createdAt: string;
  tags: string[];
}

export interface Scene {
  id: string;
  name: string;
  gradient: string;
}

export interface CreateRecordData {
  songName: string;
  artist: string;
  scene: string;
  rating: number;
  tags: string[];
  image?: File | null;
}

export interface FilterParams {
  search?: string;
  tags?: string[];
  rating?: number;
  timePeriod?: 'all' | 'week' | 'month';
}
