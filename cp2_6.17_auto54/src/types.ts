export interface Video {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface Marker {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  thumbnail?: string;
  order: number;
  createdAt: string;
}

export interface PresetLabel {
  name: string;
  color: string;
}

export interface TimelineClip {
  videoId: string;
  videoPath: string;
  videoName: string;
  startTime: number;
  endTime: number;
  duration: number;
  label: string;
  color: string;
  order: number;
}

export interface TimelineExport {
  version: string;
  exportedAt: string;
  clips: TimelineClip[];
}
