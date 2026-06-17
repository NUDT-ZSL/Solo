export interface Video {
  id: string;
  name: string;
  path: string;
  size: number;
  duration: number;
  createdAt: string;
}

export interface Marker {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  order: number;
}

export interface TimelineClip {
  videoPath: string;
  videoName: string;
  startTime: number;
  endTime: number;
  startFrame: number;
  endFrame: number;
  label: string;
  color: string;
}

export interface TimelineExport {
  version: string;
  exportedAt: string;
  fps: number;
  clips: TimelineClip[];
}

export const PRESET_LABELS: { label: string; color: string }[] = [
  { label: 'A-Roll', color: '#e53935' },
  { label: 'B-Roll', color: '#fb8c00' },
  { label: '采访', color: '#fdd835' },
  { label: '空镜', color: '#43a047' },
  { label: '特效', color: '#00acc1' },
  { label: '转场', color: '#1e88e5' },
  { label: '片头', color: '#8e24aa' },
  { label: '片尾', color: '#ec407a' },
  { label: '重要', color: '#ff5722' },
  { label: '备用', color: '#78909c' },
];
