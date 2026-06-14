export interface VideoMetadata {
  id: string;
  name: string;
  duration: number;
  url: string;
  size: number;
}

export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface SummaryItem {
  id: string;
  topic: string;
  startTime: number;
  endTime: number;
  speakerId: string;
  keywords: string[];
}

export interface Bookmark {
  id: string;
  timestamp: number;
  text: string;
  createdAt: number;
}

export interface AppState {
  videoMetadata: VideoMetadata | null;
  summaries: SummaryItem[];
  bookmarks: Bookmark[];
  currentTime: number;
  speakers: Speaker[];
}

export interface AppContextType extends AppState {
  setVideoMetadata: (metadata: VideoMetadata | null) => void;
  setSummaries: (summaries: SummaryItem[]) => void;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  setCurrentTime: (time: number) => void;
  seekTo: (time: number) => void;
}
