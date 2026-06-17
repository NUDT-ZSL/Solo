import type { PresetClip, TimelineClip } from '../../types'
import { useStore } from '../../store/useStore'
import { eventBus } from '../clip/ClipManager'
import { PLAYBACK_SPEED } from '../../types'

export interface TimelineState {
  clips: TimelineClip[]
  totalDuration: number
  playbackPosition: number
  isPlaying: boolean
}

let playbackAnimationId: number | null = null
let playbackStartTime: number = 0
let playbackStartPosition: number = 0

export const getTimelineState = (): TimelineState => {
  const state = useStore.getState()
  const totalDuration = calculateTotalDuration(state.timelineClips)
  return {
    clips: state.timelineClips,
    totalDuration,
    playbackPosition: state.playbackPosition,
    isPlaying: state.isPlaying
  }
}

export const calculateTotalDuration = (clips: TimelineClip[]): number => {
  if (clips.length === 0) return 0
  return Math.max(...clips.map((clip) => clip.position + clip.duration))
}

export const snapToGrid = (position: number): number => {
  return Math.round(position)
}

export const addClip = (clip: PresetClip, rawPosition: number): void => {
  const position = snapToGrid(Math.max(0, rawPosition))
  useStore.getState().addTimelineClip(clip, position)
  eventBus.emit('timelineChanged')
}

export const removeClip = (instanceId: string): void => {
  useStore.getState().removeTimelineClip(instanceId)
  eventBus.emit('timelineChanged')
}

export const moveClip = (instanceId: string, rawPosition: number): void => {
  const position = snapToGrid(Math.max(0, rawPosition))
  useStore.getState().moveTimelineClip(instanceId, position)
  eventBus.emit('timelineChanged')
}

export const resizeClip = (instanceId: string, rawDuration: number): void => {
  const duration = Math.min(5, Math.max(1, snapToGrid(rawDuration)))
  useStore.getState().resizeTimelineClip(instanceId, duration)
  eventBus.emit('timelineChanged')
}

const updatePlayback = (timestamp: number): void => {
  const state = useStore.getState()
  if (!state.isPlaying) return

  const elapsed = (timestamp - playbackStartTime) / 1000
  const newPosition = playbackStartPosition + elapsed / PLAYBACK_SPEED
  const totalDuration = calculateTotalDuration(state.timelineClips)

  if (newPosition >= totalDuration) {
    stopPlayback()
    useStore.getState().setPlaybackPosition(totalDuration)
    eventBus.emit('playbackComplete')
    return
  }

  useStore.getState().setPlaybackPosition(newPosition)
  eventBus.emit('playbackProgress', newPosition)
  playbackAnimationId = requestAnimationFrame(updatePlayback)
}

export const startPlayback = (): void => {
  const state = useStore.getState()
  if (state.isPlaying || state.timelineClips.length === 0) return

  const totalDuration = calculateTotalDuration(state.timelineClips)
  if (totalDuration === 0) return

  useStore.getState().setIsPlaying(true)
  playbackStartTime = performance.now()
  playbackStartPosition = state.playbackPosition >= totalDuration ? 0 : state.playbackPosition
  playbackAnimationId = requestAnimationFrame(updatePlayback)
}

export const stopPlayback = (): void => {
  useStore.getState().setIsPlaying(false)
  if (playbackAnimationId !== null) {
    cancelAnimationFrame(playbackAnimationId)
    playbackAnimationId = null
  }
}

eventBus.on('emotionChanged', () => {
  eventBus.emit('timelineChanged')
})
