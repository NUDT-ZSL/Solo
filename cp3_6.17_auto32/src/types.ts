export interface Video {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  duration: number;
  durationFormatted: string;
  path: string;
  uploadTime: string;
}

export interface Marker {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  createdAt: string;
  order: number;
  thumbnail: string;
}

export interface PresetTag {
  name: string;
  color: string;
}

export const PRESET_TAGS: PresetTag[] = [
  { name: 'A-Roll', color: '#e53935' },
  { name: 'B-Roll', color: '#fb8c00' },
  { name: '采访', color: '#fdd835' },
  { name: '空镜', color: '#43a047' },
  { name: '特效', color: '#00acc1' },
  { name: '转场', color: '#1e88e5' },
  { name: '旁白', color: '#8e24aa' },
  { name: '字幕', color: '#5c6bc0' },
  { name: '音乐', color: '#d81b60' },
  { name: '花絮', color: '#78909c' },
];

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
};
