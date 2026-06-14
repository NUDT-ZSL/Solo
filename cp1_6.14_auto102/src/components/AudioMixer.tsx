import React, { useEffect, useRef, useMemo } from 'react'
import type { SoundTrackItem } from '../http'
import type { TrackAudioState } from '../hooks/useAudioEngine'

interface AudioMixerProps {
  tracks: SoundTrackItem[]
  masterVolume: number
  isPlaying: boolean
  trackLevels: Record<string, number>
  onVolumeChange: (trackId: string, volume: number) => void
  onMuteToggle: (trackId: string) => void
  onSoloToggle: (trackId: string) => void
  onRemoveTrack: (trackId: string) => void
  onMasterVolumeChange: (volume: number) => void
  onTogglePlay: () => void
}

const VolumeWave: React.FC<{ level: number }> = ({ level }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()

    const draw = () => {
      timeRef.current += 0