import type { PresetClip, EmotionLabel } from '../../types'
import { useStore } from '../../store/useStore'

const PRESET_CLIPS: PresetClip[] = [
  { id: 'clip-1', name: '城市夜景', color: '#FF6B6B', duration: 3, emotionLabel: 'excited' },
  { id: 'clip-2', name: '山川河流', color: '#4ECDC4', duration: 4, emotionLabel: 'calm' },
  { id: 'clip-3', name: '童年回忆', color: '#FFE66D', duration: 2, emotionLabel: 'nostalgic' },
  { id: 'clip-4', name: '追逐奔跑', color: '#95E1D3', duration: 3, emotionLabel: 'tense' },
  { id: 'clip-5', name: '星空漫步', color: '#DDA0DD', duration: 4, emotionLabel: 'calm' },
  { id: 'clip-6', name: '节日狂欢', color: '#F38181', duration: 2, emotionLabel: 'excited' }
]

class EventBus {
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map()

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args))
  }
}

export const eventBus = new EventBus()

export const getClips = (): PresetClip[] => {
  return PRESET_CLIPS.map((clip) => ({ ...clip }))
}

export const setEmotion = (clipId: string, label: EmotionLabel): void => {
  useStore.getState().setEmotionLabel(clipId, label)
  eventBus.emit('emotionChanged', { clipId, label })
}

export const initializePresetClips = (): void => {
  useStore.getState().setPresetClips(getClips())
}
