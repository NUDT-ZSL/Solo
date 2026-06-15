export interface BandEvent {
  _id: string;
  title: string;
  datetime: string;
  location: string;
  type: 'rehearsal' | 'gig';
  notes: string;
  createdAt: string;
}

export interface Song {
  _id: string;
  name: string;
  bpm: number;
  key: string;
  progress: number;
  order: number;
  practiced: boolean;
}

export type MemberName = '鼓手' | '吉他手' | '贝斯手' | '主唱';

export interface AppState {
  events: BandEvent[];
  songs: Song[];
  currentUser: MemberName;
}
