export interface Video {
  id: string
  fileName: string
  filePath: string
  duration: number
  fileSize: number
  format: 'mp4' | 'mov'
  thumbnail: string
  createdAt: string
}

export interface Marker {
  id: string
  videoId: string
  time: number
  timeFrame: number
  label: string
  labelColor: string
  sortOrder: number
  createdAt: string
}

export interface PresetLabel {
  name: string
  color: string
}

export interface TimelineClip {
  videoId: string
  videoPath: string
  fileName: string
  startTime: number
  endTime: number
  startFrame: number
  endFrame: number
  label: string
  labelColor: string
  sortOrder: number
}

export interface TimelineExport {
  version: string
  exportedAt: string
  clips: TimelineClip[]
}
