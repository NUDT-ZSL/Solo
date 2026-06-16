export interface Album {
  id: string;
  title: string;
  year: number;
  coverColor: string;
  sampleDuration: number;
  audioFile: string;
  trackList: string[];
}

export interface AlbumDetail extends Album {
  audioBase64: string;
}

export interface ListenRecord {
  id: string;
  albumId: string;
  trackTitle: string;
  duration: number;
  timestamp: number;
}

export interface RecommendTrack {
  id: string;
  albumId: string;
  albumTitle: string;
  trackTitle: string;
  coverColor: string;
}
