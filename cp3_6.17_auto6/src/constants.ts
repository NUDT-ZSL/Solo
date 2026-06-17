import type { PresetLabel } from './types'

export const FPS = 30
export const MAX_FILE_SIZE = 200 * 1024 * 1024

export const PRESET_LABELS: PresetLabel[] = [
  { name: 'A-Roll', color: '#e53935' },
  { name: 'B-Roll', color: '#f4511e' },
  { name: '采访', color: '#fb8c00' },
  { name: '空镜', color: '#fdd835' },
  { name: '特效', color: '#43a047' },
  { name: '转场', color: '#00897b' },
  { name: '音乐', color: '#00acc1' },
  { name: '字幕', color: '#1e88e5' },
  { name: '高光', color: '#5e35b1' },
  { name: '待删', color: '#8e24aa' },
]
