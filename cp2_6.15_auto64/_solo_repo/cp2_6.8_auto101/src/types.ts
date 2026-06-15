export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverColor: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  shareCode: string;
  songs: Song[];
  createdAt: number;
}
