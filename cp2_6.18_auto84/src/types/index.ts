export interface Member {
  id: string
  name: string
  voicePart: string
  joinDate: string
  avatar?: string
}

export interface ScoreRecord {
  id: string
  memberId: string
  date: string
  pitch: number
  rhythm: number
  expression: number
  note?: string
  audioUrl?: string
  songs: string[]
}

export interface ScoreFormData {
  pitch: number
  rhythm: number
  expression: number
  note: string
  audioUrl: string
  songs: string[]
}

export interface RehearsalSummary {
  date: string
  songs: string[]
  avgPitch: number
  avgRhythm: number
  avgExpression: number
  memberCount: number
}

export const PRESET_SONGS = ['茉莉花', '月亮代表我的心', '彩虹', '送别']
