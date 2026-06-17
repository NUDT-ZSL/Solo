export interface Video {
  id: string
  fileName: string
  duration: number
  fileSize: number
  filePath: string
  thumbnailPath: string
  createdAt: string
}

export interface Marker {
  id: string
  videoId: string
  timestamp: number
  label: string
  labelColor: string
  order: number
  createdAt: string
}

export interface PresetLabel {
  name: string
  color: string
}

export interface TimelineClip {
  videoId: string
  videoPath: string
  videoFileName: string
  startTime: number
  endTime: number
  label: string
  labelColor: string
  order: number
}

export interface TimelineData {
  version: string
  exportedAt: string
  clips: TimelineClip[]
}

export const PRESET_LABELS: PresetLabel[] = [
  { name: 'A-Roll', color: '#e53935' },
  { name: 'B-Roll', color: '#ff6f00' },
  { name: '采访', color: '#ffa000' },
  { name: '空镜', color: '#fdd835' },
  { name: '特效', color: '#7cb342' },
  { name: '转场', color: '#26a69a' },
  { name: '旁白', color: '#29b6f6' },
  { name: '字幕', color: '#1e88e5' },
  { name: '音乐', color: '#8e24aa' },
  { name: '备用', color: '#d81b60' },
]
