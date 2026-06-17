import { create } from 'zustand'
import type { PresetClip, TimelineClip, EmotionRatio, CurvePoint, EmotionLabel } from '../types'

interface AppState {
  presetClips: PresetClip[]
  timelineClips: TimelineClip[]
  playbackPosition: number
  isPlaying: boolean
  emotionRatios: EmotionRatio[]
  curveData: CurvePoint[]
  setPresetClips: (clips: PresetClip[]) => void
  setEmotionLabel: (clipId: string, label: EmotionLabel) => void
  addTimelineClip: (clip: PresetClip, position: number) => void
  removeTimelineClip: (instanceId: string) => void
  moveTimelineClip: (instanceId: string, newPosition: number) => void
  resizeTimelineClip: (instanceId: string, newDuration: number) => void
  setPlaybackPosition: (position: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setEmotionRatios: (ratios: EmotionRatio[]) => void
  setCurveData: (data: CurvePoint[]) => void
  resetPlayback: () => void
}

let instanceCounter = 0

export const useStore = create<AppState>((set) => ({
  presetClips: [],
  timelineClips: [],
  playbackPosition: 0,
  isPlaying: false,
  emotionRatios: [],
  curveData: [],

  setPresetClips: (clips) => set({ presetClips: clips }),

  setEmotionLabel: (clipId, label) =>
    set((state) => ({
      presetClips: state.presetClips.map((clip) =>
        clip.id === clipId ? { ...clip, emotionLabel: label } : clip
      ),
      timelineClips: state.timelineClips.map((clip) =>
        clip.id === clipId ? { ...clip, emotionLabel: label } : clip
      )
    })),

  addTimelineClip: (clip, position) =>
    set((state) => {
      const newClip: TimelineClip = {
        ...clip,
        position,
        instanceId: `clip-${++instanceCounter}-${Date.now()}`
      }
      return { timelineClips: [...state.timelineClips, newClip] }
    }),

  removeTimelineClip: (instanceId) =>
    set((state) => ({
      timelineClips: state.timelineClips.filter((c) => c.instanceId !== instanceId)
    })),

  moveTimelineClip: (instanceId, newPosition) =>
    set((state) => ({
      timelineClips: state.timelineClips.map((clip) =>
        clip.instanceId === instanceId ? { ...clip, position: newPosition } : clip
      )
    })),

  resizeTimelineClip: (instanceId, newDuration) =>
    set((state) => ({
      timelineClips: state.timelineClips.map((clip) =>
        clip.instanceId === instanceId ? { ...clip, duration: newDuration } : clip
      )
    })),

  setPlaybackPosition: (position) => set({ playbackPosition: position }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setEmotionRatios: (ratios) => set({ emotionRatios: ratios }),

  setCurveData: (data) => set({ curveData: data }),

  resetPlayback: () => set({ playbackPosition: 0, isPlaying: false })
}))
