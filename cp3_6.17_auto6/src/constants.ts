import type { PresetLabel } from './types';

export const FPS = 30;
export const MAX_FILE_SIZE = 200 * 1024 * 1024;
export const ACCEPTED_FORMATS = ['mp4', 'mov'];

export const PRESET_LABELS: PresetLabel[] = [
  { name: 'A-Roll', color: '#e53935' },
  { name: 'B-Roll', color: '#ef5350' },
  { name: '采访', color: '#f4511e' },
  { name: '空镜', color: '#f57c00' },
  { name: '特效', color: '#ffa000' },
  { name: '转场', color: '#c0ca33' },
  { name: '字幕', color: '#9ccc65' },
  { name: '音乐', color: '#66bb6a' },
  { name: '高光', color: '#26c6da' },
  { name: '待删', color: '#1e88e5' },
];

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeToFrame(seconds: number): number {
  return Math.round(seconds * FPS);
}
