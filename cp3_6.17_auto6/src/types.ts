export interface Video {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
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
  createdAt: string;
}

export interface TimelineClip {
  videoId: string;
  videoPath: string;
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
  label: string;
  color: string;
  order: number;
}

export interface TimelineExport {
  version: string;
  exportedAt: string;
  clips: TimelineClip[];
}

export interface PresetTag {
  label: string;
  color: string;
}

export const PRESET_TAGS: PresetTag[] = [
  { label: 'A-Roll', color: '#e53935' },
  { label: 'B-Roll', color: '#fb8c00' },
  { label: '采访', color: '#fdd835' },
  { label: '空镜', color: '#43a047' },
  { label: '特效', color: '#00897b' },
  { label: '转场', color: '#1e88e5' },
  { label: '字幕', color: '#8e24aa' },
  { label: '音乐', color: '#d81b60' },
  { label: '旁白', color: '#546e7a' },
  { label: '素材', color: '#3949ab' }
];

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
