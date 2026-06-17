export interface VideoMeta {
  id: string;
  fileName: string;
  filePath: string;
  duration: number;
  size: number;
  format: 'mp4' | 'mov';
  thumbnail?: string;
  createdAt: string;
}

export interface Marker {
  id: string;
  videoId: string;
  time: number;
  timeFrame: number;
  label: string;
  color: string;
  order: number;
  thumbnail?: string;
}

export interface PresetLabel {
  name: string;
  color: string;
}

export interface TimelineSegment {
  videoId: string;
  fileName: string;
  filePath: string;
  startTime: number;
  endTime: number;
  startFrame: number;
  endFrame: number;
  label: string;
  color: string;
  order: number;
}

export interface TimelineDraft {
  exportedAt: string;
  fps: number;
  segments: TimelineSegment[];
}
